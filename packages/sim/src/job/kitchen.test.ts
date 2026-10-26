import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, signUp, sliceSim, tickOf } from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
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
