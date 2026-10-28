import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import {
  advance,
  doing,
  play,
  refusal,
  signUp,
  sliceSim,
  TEST_COOK,
  testCook,
  tickOf,
  withCareer,
} from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { createLifeGame } from '../game.ts';
import { barred } from '../market/odds.ts';
import { type CareerRecord, careerOf, eventsFor, type ShiftKind } from './records.ts';
import type { JobSlice } from './state.ts';

// Monday 2 June 2025, 07:00, is tick 0. Each test career is offered one shift every day.
const game = createLifeGame({ events: false, unlocked: true, people: 0, career: TEST_COOK });
const job = (s: GameState) => s.job as JobSlice;
const to = (s: GameState, tick: number) => advance(tick - (s.time as { tick: number }).tick);
const NIGHTS: ShiftKind = { id: 'nights', hour: 19, minute: 0, minutes: 720, breaks: 30 };
const DAYS: ShiftKind = { id: 'days', hour: 7, minute: 0, minutes: 720, breaks: 30 };
const TWENTY_FOUR: ShiftKind = { id: 'twenty-four', hour: 7, minute: 0, minutes: 1440, breaks: 480 };
const simWith = (changes: Partial<CareerRecord>, records: RecordPack = PACK.records) =>
  sliceSim(withCareer(testCook(changes), records));

/** Signed up for day 1's shift and at its start, with the clock there. */
function atShift(sim: ReturnType<typeof sliceSim>, kind: ShiftKind, seed = 'nights') {
  const signed = play(game, sim, game.init(seed, sim), signUp(1)).state;
  return play(game, sim, signed, to(signed, tickOf(1, kind.hour, kind.minute))).state;
}

/** The shift's end settled: a few minutes past it. */
const settled = (sim: ReturnType<typeof sliceSim>, s: GameState, kind: ShiftKind) =>
  play(game, sim, s, to(s, tickOf(1, kind.hour, kind.minute) + kind.minutes + 2));

describe('shifts past midnight (M4.4 step 3, D164)', () => {
  const sim = simWith({ shifts: [NIGHTS] });

  it('works a night shift through midnight into the morning, whole and on time', () => {
    const signed = play(game, sim, game.init('nights', sim), signUp(1)).state;
    // Busy from 19:00 on Tuesday to 07:00 on Wednesday, as dates are planned around it.
    const busy = (day: number, hour: number) => game.fact(signed, 'job.busy', { day, minute: hour * 60 }, sim);
    expect([busy(1, 18), busy(1, 19), busy(2, 6), busy(2, 7)]).toEqual([false, true, true, false]);
    const s = play(game, sim, signed, to(signed, tickOf(1, 19))).state;
    expect(game.fact(s, 'job.on-shift', {}, sim)).toBe(true);
    expect(game.fact(s, 'job.shift-left', {}, sim)).toBe(NIGHTS.minutes);
    const worked = play(game, sim, s, doing('work', NIGHTS.minutes)).state;
    expect(game.fact(worked, 'time.day', {}, sim)).toBe(2);
    const over = settled(sim, worked, NIGHTS);
    expect(over.of('job/shift-over')[0]).toMatchObject({ day: 1, worked: NIGHTS.minutes, missed: 0 });
    expect(over.of('job/standing').map((b) => b.why)).toEqual(['worked']);
    expect(job(over.state).unpaid).toBe(NIGHTS.minutes);
  });

  it('lets a shift’s breaks go unpaid without leaving early, and no more', () => {
    const shift = (off: number, breaks?: number) => {
      const kind = { ...NIGHTS, breaks };
      const s = simWith({ shifts: [kind] });
      const start = atShift(s, kind);
      const half = 6 * 60;
      const t = play(
        game,
        s,
        start,
        doing('work', half),
        doing('relax', off),
        doing('work', kind.minutes - half - off),
      );
      return settled(s, t.state, kind);
    };
    // The career's own half hour late or gone (missedAfter), and the shift's half hour of breaks.
    const fine = shift(60, 30);
    expect(fine.of('job/shift-over')[0]).toMatchObject({ missed: 60 });
    expect(fine.of('job/standing').map((b) => b.why)).toEqual(['worked']);
    expect(
      shift(61, 30)
        .of('job/standing')
        .map((b) => b.why),
    ).toEqual(['left-early']);
    expect(
      shift(60)
        .of('job/standing')
        .map((b) => b.why),
    ).toEqual(['left-early']);
  });

  it('works a 24-hour shift with the night’s sleep at the station unpaid', () => {
    const s24 = simWith({ shifts: [TWENTY_FOUR] });
    const start = atShift(s24, TWENTY_FOUR);
    const awake = TWENTY_FOUR.minutes - (TWENTY_FOUR.breaks as number);
    const t = play(game, s24, start, doing('work', awake), doing('sleep', TWENTY_FOUR.breaks as number));
    const over = settled(s24, t.state, TWENTY_FOUR);
    expect(over.of('job/shift-over')[0]).toMatchObject({ worked: awake, missed: TWENTY_FOUR.breaks });
    expect(over.of('job/standing').map((b) => b.why)).toEqual(['worked']);
    expect(job(over.state).unpaid).toBe(awake);
  });
});

describe('rest between shifts (D164)', () => {
  const rest = 600;
  const sim = simWith({ shifts: [DAYS, NIGHTS], rest, perWeek: 7 });
  const span = (day: number, kind: ShiftKind) => {
    const start = tickOf(day, kind.hour, kind.minute);
    return { start, end: start + kind.minutes };
  };
  const kindOf = (id: string) => (id === 'days' ? DAYS : NIGHTS);

  it('posts no two shifts closer than the career’s rest, and still posts most of the week', () => {
    let posted = 0;
    let both = 0;
    for (let i = 0; i < 100; i++) {
      const p = job(game.init(`rest-${i}`, sim)).posted;
      posted += p.length;
      for (const [a, b] of p.slice(1).map((x, j) => [p[j], x] as const)) {
        const x = span(a?.day as number, kindOf(a?.shift as string));
        const y = span(b.day, kindOf(b.shift));
        expect(y.start - x.end, `${a?.day} ${a?.shift} then ${b.day} ${b.shift}`).toBeGreaterThanOrEqual(rest);
      }
      if (new Set(p.map((x) => x.shift)).size === 2) both++;
    }
    // Six days left in the week at hire: a night before a day is the only pair kept apart.
    expect(posted / 100).toBeGreaterThan(4);
    expect(both).toBeGreaterThan(0);
  });

  it('refuses a shift too soon after one you have, and takes it with the rest kept', () => {
    const s0 = game.init('rest', sim);
    const posted = (shifts: [number, string][]) =>
      ({ ...s0, job: { ...job(s0), posted: shifts.map(([day, shift]) => ({ day, shift })) } }) as GameState;
    const night = play(
      game,
      sim,
      posted([
        [1, 'nights'],
        [2, 'days'],
      ]),
      signUp(1),
    ).state;
    expect(refusal(game, sim, night, signUp(2))).toBe('too-little-rest');
    const day = play(
      game,
      sim,
      posted([
        [1, 'days'],
        [2, 'days'],
      ]),
      signUp(1),
    ).state;
    expect(play(game, sim, day, signUp(2)).of('job/signed-up')).toHaveLength(1);
  });
});

describe('rest after a shift worked (D164)', () => {
  it('counts a 24-hour shift just over against the next: two days off after it', () => {
    const sim = simWith({ shifts: [TWENTY_FOUR], rest: 2880 });
    const s0 = game.init('rest-done', sim);
    const posted = {
      ...s0,
      job: { ...job(s0), posted: [1, 3, 4].map((day) => ({ day, shift: 'twenty-four' })) },
    } as GameState;
    const signed = play(game, sim, posted, signUp(1)).state;
    const start = play(game, sim, signed, to(signed, tickOf(1, 7))).state;
    const over = settled(sim, play(game, sim, start, doing('work', TWENTY_FOUR.minutes)).state, TWENTY_FOUR).state;
    expect(job(over).done).toEqual([1]);
    expect(refusal(game, sim, over, signUp(3))).toBe('too-little-rest');
    expect(play(game, sim, over, signUp(4)).of('job/signed-up')).toHaveLength(1);
  });
});

describe('a patient’s harm and a written warning (M4.4 step 3)', () => {
  /** A career drawing only `event` of the hospital's, on every shift. */
  const only = (event: string) => {
    const record = PACK.records['shift-event']?.[event] as object;
    return sliceSim({
      ...withCareer(testCook({ shifts: [DAYS], events: { tags: ['only'], chance: 100 } })),
      'shift-event': { [event]: { ...record, tags: ['only'] } },
    });
  };
  const atEvent = (sim: ReturnType<typeof sliceSim>, seed: string, warnings: number[] = []) => {
    const s = play(game, sim, game.init(seed, sim), signUp(1)).state;
    const warned = { ...s, job: { ...job(s), warnings } } as GameState;
    const at = play(game, sim, warned, to(warned, tickOf(1, 7))).state;
    return play(game, sim, at, doing('work', job(at).signed[0]?.event as number)).state;
  };
  const chance = (b: Record<string, unknown> | undefined) =>
    b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);

  it('hurts you as the illness record has an injury at work, at the odds shown, and sends you home', () => {
    const sim = only('the-turn');
    const seen = new Set<boolean>();
    for (let i = 0; i < 30 && seen.size < 2; i++) {
      const s = atEvent(sim, `turn-${i}`);
      const shown = game.preview(s, [{ effect: 'shift-choice', event: 'the-turn', day: 1, choice: 'turn' }], sim)[0];
      const step = play(game, sim, s, { type: 'job/choose', choice: 'turn' });
      expect(chance(step.of('logic/rolled')[0])).toBe(shown?.chance);
      const failed = step.of('job/outcome')[0]?.failed === true;
      seen.add(failed);
      expect(step.of('health/fell-ill').map((b) => b.kind)).toEqual(failed ? ['injury'] : []);
      expect(step.fact('health.off-work')).toBe(failed);
      expect(step.fact('job.on-shift')).toBe(!failed);
      if (failed) expect(shown?.failure).toMatchObject({ hurt: 'injury', home: true });
    }
    expect([...seen].sort()).toEqual([false, true]);
  });

  it('puts a warning on your file at work, and lets you go at the career’s count', () => {
    const sim = only('seventh-patient');
    const letGoAt = testCook().warnings.letGoAt;
    for (let i = 0; i < 40; i++) {
      const fresh = atEvent(sim, `seventh-${i}`);
      const step = play(game, sim, fresh, { type: 'job/choose', choice: 'take' });
      if (step.of('job/outcome')[0]?.failed !== true) continue;
      const [warned] = step.of('job/warned');
      expect(warned).toMatchObject({ day: 1, warnings: 1 });
      expect(lineFor(sim.content, warned as never, { you: 'Dana' }, DEFAULT_START)).toBe(
        'Dana was given a written warning at work.',
      );
      expect(job(step.state).employed).toBe(true);
      // One already on file, within its lapse: this one is the last.
      const before = Array.from({ length: letGoAt - 1 }, () => tickOf(0, 8));
      const last = play(game, sim, atEvent(sim, `seventh-${i}`, before), { type: 'job/choose', choice: 'take' });
      expect(last.of('job/let-go')).toEqual([{ type: 'job/let-go', reason: 'warnings' }]);
      return;
    }
    throw new Error('no failure in 40 seeds');
  });
});

describe('the registered nurse (M4.4 step 3, D163)', () => {
  it('hires only the licensed with an associate’s, on 12-hour days or nights kept apart, and draws the hospital’s events', () => {
    const rn = careerOf(sliceSim().content, 'registered-nurse');
    const you = { convictions: 0, felonies: 0, reputation: 50, schooling: 'associate' };
    expect(barred(rn, { ...you, schooling: 'diploma', rn: true })).toBe('associate');
    expect(barred(rn, you)).toBe('licence');
    expect(barred(rn, { ...you, emt: true })).toBe('licence');
    expect(barred(rn, { ...you, rn: true })).toBeNull();
    expect(barred(rn, { ...you, schooling: 'bachelor', rn: true })).toBeNull();
    expect(rn.shifts.map((k) => [k.id, k.hour, k.minutes])).toEqual([
      ['days', 7, 720],
      ['nights', 19, 720],
    ]);
    expect(rn.rest).toBeGreaterThan(0);
    const drawn = eventsFor(sliceSim().content, rn).map(([id]) => id);
    expect(drawn).toEqual(['code-blue', 'insulin-label', 'needlestick', 'seventh-patient', 'the-turn', 'withdrawal']);
  });
});
