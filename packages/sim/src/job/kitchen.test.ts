import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, refusal, signUp, sliceGame, sliceSim, tickOf } from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
import type { Listing } from '../market/module.ts';
import { barred, REPUTATION } from '../market/odds.ts';
import { type CareerRecord, careerOf } from './records.ts';
import type { JobSlice } from './state.ts';

// The kitchen's careers with no shift events, so a shift runs straight through.
const careers = PACK.records.career as Record<string, CareerRecord>;
const quiet: RecordPack = {
  ...PACK.records,
  career: Object.fromEntries(
    Object.entries(careers).map(([id, c]) => [id, { ...c, events: { ...c.events, chance: 0 } }]),
  ),
};
const sim = sliceSim(quiet);
const game = createLifeGame({ people: 0, career: 'line-cook' });
const job = (s: GameState) => s.job as JobSlice;
const fact = (s: GameState, id: string) => game.fact(s, id, {}, sim);
const cook = careerOf(sim.content, 'line-cook');
const lead = careerOf(sim.content, 'kitchen-lead');

/** A whole shift worked on the first day posted, as `career` with `practice` minutes and `standing`. */
function shift(career: string, practice: number, standing: number) {
  const s = game.init('kitchen', sim);
  const start = { ...s, job: { ...job(s), career, practice, standing } } as GameState;
  const first = job(start).posted[0] as { day: number; shift: string };
  const kind = careerOf(sim.content, career).shifts.find((k) => k.id === first.shift) as {
    hour: number;
    minutes: number;
  };
  const signed = play(game, sim, start, signUp(first.day)).state;
  const at = tickOf(first.day, kind.hour) - (signed.time as { tick: number }).tick;
  const working = play(game, sim, signed, advance(at), doing('work', kind.minutes)).state;
  return play(game, sim, working, advance(5));
}

describe('the food ladder (M2.5, D121, D122)', () => {
  it('runs line cook, kitchen lead, chef, each paid more than the last', () => {
    expect(cook.ladder?.next).toBe('kitchen-lead');
    expect(lead.ladder?.next).toBe('chef');
    const chef = careerOf(sim.content, 'chef');
    expect(cook.wage).toBeLessThan(lead.wage);
    expect(lead.wage).toBeLessThan(chef.wage);
    expect(chef.ladder).toBeUndefined();
  });

  it('makes a line cook the kitchen lead at the diner with the hours and the standing', () => {
    const practice = (cook.ladder?.practice as number) - 480;
    const standing = cook.ladder?.standing as number;
    expect(shift('line-cook', practice - 480, standing).of('job/promoted')).toEqual([]);
    expect(shift('line-cook', practice, standing - 10).of('job/promoted')).toEqual([]);
    const done = shift('line-cook', practice, standing);
    expect(done.of('job/promoted')).toEqual([{ type: 'job/promoted', from: 'line-cook', career: 'kitchen-lead' }]);
    expect(job(done.state).career).toBe('kitchen-lead');
    // Still at your block's diner, beside the same cook.
    expect(fact(done.state, 'market.at-diner')).toBe(true);
    expect((done.state.ties as { career: string }).career).toBe('line-cook');
    expect(job(done.state).posted.length).toBeGreaterThan(0);
  });

  it('makes the kitchen lead the chef after the lead’s own hours', () => {
    const practice = (lead.ladder?.practice as number) - 480;
    const done = shift('kitchen-lead', practice, lead.ladder?.standing as number);
    expect(done.of('job/promoted').map((b) => b.career)).toEqual(['chef']);
  });
});

// The lead with a kitchen hiring every day, so an opening stands to be tried.
const BUSY = 'test-busy-lead';
const busy = sliceSim({
  ...quiet,
  career: {
    ...quiet.career,
    [BUSY]: { ...lead, employers: { districts: ['downtown'], staff: 200, turnover: 60, share: 50 } },
  },
});
const slice = sliceGame();
const listed = (s: GameState): Listing[] => slice.fact(s, 'market.openings', undefined, busy) as Listing[];
const worked = (s: GameState, experience: Record<string, number>) =>
  ({ ...s, job: { ...job(s), experience } }) as GameState;
const applicant = (w: Record<string, number>) => ({
  convictions: 0,
  felonies: 0,
  reputation: REPUTATION.start,
  schooling: 'diploma',
  worked: w,
});

describe('hired for experience (M2.5, D122)', () => {
  it('asks the minutes worked in the kitchen, at any employer, and counts a higher rank', () => {
    const need = lead.requires?.experience?.minutes as number;
    expect(barred(lead, applicant({ 'line-cook': need - 1 }))).toBe('experience');
    expect(barred(lead, applicant({ 'line-cook': need }))).toBeNull();
    expect(barred(lead, applicant({ 'line-cook': need / 2, chef: need / 2 }))).toBeNull();
    expect(barred(lead, applicant({ janitor: need * 10 }))).toBe('experience');
    expect(barred(careerOf(sim.content, 'chef'), applicant({ 'line-cook': need * 10 }))).toBe('experience');
  });

  it('lists the opening with why you can’t apply, refuses it, and takes the application once you have the hours', () => {
    const s = slice.init('experience', busy);
    const without = listed(s).find((l) => l.career === BUSY) as Listing;
    expect(without.problem).toBe('experience');
    expect(refusal(slice, busy, s, { type: 'market/apply', opening: without.opening })).toBe('experience');
    const cook = worked(s, { 'line-cook': lead.requires?.experience?.minutes as number });
    const withIt = listed(cook).find((l) => l.career === BUSY) as Listing;
    expect(withIt.problem).toBeNull();
    expect(play(slice, busy, cook, { type: 'market/apply', opening: withIt.opening }).of('market/applied').length).toBe(
      1,
    );
  });

  it('keeps the minutes worked across jobs, and adds each shift’s to the career worked', () => {
    const done = shift('line-cook', 0, 50);
    const e = job(done.state).experience;
    expect(e['line-cook']).toBe(job(done.state).practice);
    expect(e['line-cook']).toBeGreaterThan(0);
  });
});
