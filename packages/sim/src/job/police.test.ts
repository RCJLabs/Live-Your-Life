import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { inCourt } from '../../test/case.ts';
import { advance, doing, play, signUp, sliceSim, tickOf } from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
import { employersOf } from '../market/employers.ts';
import { barred, hireOdds, REPUTATION } from '../market/odds.ts';
import { rosterOf } from '../people/roster.ts';
import { type CareerRecord, careerOf } from './records.ts';
import type { JobSlice } from './state.ts';

// The police careers with no shift events, so a shift runs straight through (D80).
const careers = PACK.records.career as Record<string, CareerRecord>;
const quiet: RecordPack = {
  ...PACK.records,
  career: Object.fromEntries(
    Object.entries(careers).map(([id, c]) => [id, { ...c, events: { ...c.events, chance: 0 } }]),
  ),
};
const sim = sliceSim(quiet);
const recruitGame = createLifeGame({ people: 0, career: 'police-recruit' });
const officerGame = createLifeGame({ people: 0, career: 'police-officer' });
const job = (s: GameState) => s.job as JobSlice;
const recruit = careerOf(sim.content, 'police-recruit');
const officer = careerOf(sim.content, 'police-officer');

/** A whole shift worked on the first day posted, from a job with `practice` minutes of it. */
function shift(game: typeof recruitGame, practice: number, standing?: number) {
  const s = game.init('shift', sim);
  const start = { ...s, job: { ...job(s), practice, ...(standing === undefined ? {} : { standing }) } } as GameState;
  const day = (job(start).posted[0] as { day: number; shift: string }).day;
  const kind = careerOf(sim.content, job(start).career as string).shifts.find(
    (k) => k.id === (job(start).posted[0] as { shift: string }).shift,
  ) as { hour: number; minutes: number };
  const signed = play(game, sim, start, signUp(day)).state;
  const at = tickOf(day, kind.hour) - (signed.time as { tick: number }).tick;
  const working = play(game, sim, signed, advance(at), doing('work', kind.minutes)).state;
  return play(game, sim, working, advance(5));
}

describe('the police (M2.4, D80)', () => {
  it('bars a recruit with a felony, and only lowers the odds for a misdemeanour', () => {
    expect(barred(recruit, { convictions: 1, felonies: 1, reputation: 50, schooling: 'diploma' })).toBe('record');
    expect(barred(recruit, { convictions: 1, felonies: 0, reputation: 50, schooling: 'diploma' })).toBeNull();
    const clean = hireOdds(recruit, {
      convictions: 0,
      felonies: 0,
      reputation: REPUTATION.start,
      schooling: 'diploma',
    });
    const marked = hireOdds(recruit, {
      convictions: 1,
      felonies: 0,
      reputation: REPUTATION.start,
      schooling: 'diploma',
    });
    expect(clean - marked).toBe(recruit.hiring.record);
    // The line cook, which bars no record of any kind, still takes a felon.
    expect(
      barred(careerOf(sim.content, 'line-cook'), { convictions: 1, felonies: 1, reputation: 50, schooling: 'diploma' }),
    ).toBeNull();
  });

  it('works the academy as ten-hour weekdays, and makes you a patrol officer once its hours are done', () => {
    expect(recruit.shifts).toEqual([{ id: 'academy', hour: 7, minute: 0, minutes: 600 }]);
    const short = shift(recruitGame, (recruit.ladder?.practice as number) - 1200);
    expect(short.of('job/promoted')).toEqual([]);
    const done = shift(recruitGame, (recruit.ladder?.practice as number) - 600);
    expect(done.of('job/promoted')).toEqual([
      { type: 'job/promoted', from: 'police-recruit', career: 'police-officer' },
    ]);
    expect(job(done.state).career).toBe('police-officer');
    expect(job(done.state).practice).toBe(0);
    expect(job(done.state).posted.length).toBeGreaterThan(0);
  });

  it('makes a detective of a patrol officer with the years on patrol and the standing', () => {
    const practice = (officer.ladder?.practice as number) - 480;
    const low = shift(officerGame, practice, (officer.ladder?.standing as number) - 10);
    expect(low.of('job/promoted')).toEqual([]);
    const high = shift(officerGame, practice, officer.ladder?.standing as number);
    expect(high.of('job/promoted').map((b) => b.career)).toEqual(['detective']);
  });

  it('arrests on patrol for the offences the law charges, at the odds shown', () => {
    const stop = careerOf(sim.content, 'police-officer');
    expect(stop.events.tags).toEqual(['patrol']);
    const events = sim.content.entries<{
      tags: string[];
      choices: { outcome: { arrest?: string }; failure?: { arrest?: string } }[];
    }>('shift-event');
    const arrests = events
      .filter(([, e]) => e.tags.includes('patrol') || e.tags.includes('investigation'))
      .flatMap(([, e]) => e.choices.flatMap((c) => [c.outcome.arrest, c.failure?.arrest]))
      .filter((a): a is string => a !== undefined);
    expect(new Set(arrests)).toEqual(new Set(['delivery-cocaine-50', 'retail-fraud-3']));
    for (const offence of arrests) expect(sim.content.has('offence', offence)).toBe(true);
  });

  it('makes an arrest when a stop on the corner comes off, for the offence the event names', () => {
    // Every patrol shift has an event (D40), to reach a sale on the corner sooner.
    const busy = sliceSim({
      ...quiet,
      career: { ...quiet.career, 'police-officer': { ...officer, events: { tags: ['patrol'], chance: 100 } } },
    });
    for (let i = 0; i < 60; i++) {
      const s = officerGame.init(`patrol-${i}`, busy);
      const first = job(s).posted[0] as { day: number; shift: string };
      const kind = officer.shifts.find((k) => k.id === first.shift) as { hour: number; minutes: number };
      const signed = play(officerGame, busy, s, signUp(first.day)).state;
      const at = tickOf(first.day, kind.hour) - (signed.time as { tick: number }).tick;
      let now = play(officerGame, busy, signed, advance(at)).state;
      const frameOf = (x: GameState) =>
        (x.kernel as unknown as { modes: { id: string; data?: { event: string } }[] }).modes.at(-1);
      // Work up to the shift's event, which stops it (job.shift-left runs to the event, D40).
      const left = officerGame.fact(now, 'job.shift-left', undefined, busy) as number;
      now = play(officerGame, busy, now, doing('work', left)).state;
      const frame = frameOf(now);
      if (frame?.id !== 'shift-event' || frame.data?.event !== 'corner-sale') continue;
      const r = play(officerGame, busy, now, { type: 'job/choose', choice: 'stop' });
      now = r.state;
      if (r.of('job/made-arrest').length === 0) continue;
      expect(r.of('job/made-arrest')).toEqual([{ type: 'job/made-arrest', offence: 'delivery-cocaine-50' }]);
      return;
    }
    throw new Error('no arrest on the corner in 60 shifts');
  });

  it('loses the job on a felony sentence, and not on a misdemeanour', () => {
    const court = inCourt('felony', 200, officerGame);
    expect(job(court).employed).toBe(true);
    const sentenced = play(officerGame, sim, court, { type: 'law/plead', plea: 'guilty' });
    expect(sentenced.of('job/let-go')).toEqual([{ type: 'job/let-go', reason: 'record' }]);
    expect(officerGame.fact(sentenced.state, 'law.felonies', undefined, sim)).toBe(1);
    // Charged with possession under 25 g and given a deferral, it is no felony on the record.
    const possession = {
      ...court,
      law: {
        ...(court.law as { cases: { offence: string }[] }),
        cases: (court.law as { cases: object[] }).cases.map((k) => ({ ...k, offence: 'possession-cocaine-25' })),
      },
    } as GameState;
    const deferred = play(officerGame, sim, possession, { type: 'law/plead', plea: 'hyta' });
    expect(deferred.of('job/let-go')).toEqual([]);
  });

  it('gives a rank reached by promotion no workplaces and no openings of its own', () => {
    const roster = rosterOf(7, 1000);
    const employers = employersOf(sim.content, 7, roster, 'inner-ring');
    const tier1 = employers.filter((e) => e.place >= 0);
    expect(tier1.some((e) => e.career === 'detective' || e.career === 'police-officer')).toBe(false);
    // The recruit's share of the jobs all the careers share, about 4 in 100 with M2.8's careers:
    // a few workplaces in a city of 55, so counted over 20 cities, within three standard deviations.
    const shares = sim.content.ids('career').map((id) => careerOf(sim.content, id).employers.share);
    const p = careerOf(sim.content, 'police-recruit').employers.share / shares.reduce((n, x) => n + x, 0);
    let police = 0;
    let all = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const places = employersOf(sim.content, seed, rosterOf(seed, 1000), 'inner-ring').filter((e) => e.place >= 0);
      police += places.filter((e) => e.career === 'police-recruit').length;
      all += places.length;
    }
    expect(Math.abs(police - all * p)).toBeLessThan(3 * Math.sqrt(all * p * (1 - p)));
    for (const e of employers.filter((x) => x.career === 'detective')) expect(e.staff).toBe(0);
  });
});
