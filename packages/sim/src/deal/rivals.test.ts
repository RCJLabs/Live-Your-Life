import type { Beat, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { tradeOf } from './records.ts';
import { holder, noStanding, STRETCH, YOURS } from './rivals.ts';
import type { DealSlice } from './state.ts';

const sim = sliceSim();
const game = sliceGame();
const trade = tradeOf(sim.content);
const rivals = trade.rivals;
const deal = (s: GameState) => s.deal as DealSlice;
const view = (s: GameState) =>
  ({ content: sim.content, fact: (id: string, args?: object) => game.fact(s, id, args as never, sim) }) as never;

/** A life at 21:00 holding enough to sell all night. */
const evening = (seed: string) => {
  const s = play(game, sim, game.init(seed, sim), waitUntil(21)).state;
  return { ...s, deal: { ...deal(s), held: 400 } } as GameState;
};

/** A seed whose corner is held, or open, on day 0. */
function seedWith(held: boolean): string {
  for (let i = 0; i < 200; i++) {
    const s = evening(`corner-${i}`);
    if ((holder(view(s), YOURS) !== -1) === held) return `corner-${i}`;
  }
  throw new Error(`no seed with the corner ${held ? 'held' : 'open'} in 200`);
}

function hours(s: GameState, n: number) {
  const beats: Beat[] = [];
  let now = s;
  for (let h = 0; h < n; h++) {
    const r = game.reduce(now, { type: 'deal/corner' }, sim);
    if (!r.accepted) break;
    beats.push(...r.beats);
    now = r.state;
  }
  return { state: now, of: (t: string) => beats.filter((b) => b.type === t) };
}

describe('corners and rival crews (M4.1 step 2, D148)', () => {
  it('holds about the record’s share of corners, and changes hands by the stretch', { timeout: 120_000 }, () => {
    let held = 0;
    let changed = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const s = evening(`share-${i}`);
      const now = holder(view(s), YOURS) !== -1;
      if (now) held++;
      const later = play(game, sim, s, advance(STRETCH * MINUTES_PER_DAY)).state;
      if ((holder(view(later), YOURS) !== -1) !== now) changed++;
    }
    expect(held / N).toBeGreaterThan(rivals.held / 100 - 0.08);
    expect(held / N).toBeLessThan(rivals.held / 100 + 0.08);
    expect(changed).toBeGreaterThan(N / 4);
  });

  it('sells on an open corner with no word from anyone', () => {
    const r = hours(evening(seedWith(false)), 3);
    expect(r.of('deal/warned')).toEqual([]);
    expect(r.of('deal/on-corner').length).toBe(3);
  });

  it('warns you on a held corner, then runs you off it for days, as the preview says', () => {
    const s = evening(seedWith(true));
    expect(game.fact(s, 'deal.corner-held', {}, sim)).toBe(true);
    expect(game.fact(s, 'deal.warnings-left', {}, sim)).toBe(rivals.warnings);
    const r = hours(s, rivals.warnings + 1);
    expect(r.of('deal/warned').map((b) => b.left)).toEqual(
      Array.from({ length: rivals.warnings }, (_, k) => rivals.warnings - 1 - k),
    );
    expect(r.of('deal/run-off')).toMatchObject([{ person: -1, yours: true, days: rivals.off }]);
    expect(r.of('deal/on-corner').length).toBe(rivals.warnings);
    expect(refusal(game, sim, r.state, { type: 'deal/corner' })).toBe('run-off');
    expect(game.options(r.state, sim).some((a) => a.type === 'deal/corner')).toBe(false);
    const back = play(game, sim, r.state, advance((rivals.off + 1) * MINUTES_PER_DAY), waitUntil(21)).state;
    const again = game.reduce(
      { ...back, deal: { ...deal(back), held: 400 } } as GameState,
      { type: 'deal/corner' },
      sim,
    );
    expect(again.accepted).toBe(true);
  });

  it('starts the warnings over when the stretch turns', () => {
    const s = evening(seedWith(true));
    const warned = { ...s, deal: { ...deal(s), rival: { warned: rivals.warnings, stretch: 0, off: -1 } } } as GameState;
    expect(game.fact(warned, 'deal.warnings-left', {}, sim)).toBe(0);
    const later = play(game, sim, warned, advance(STRETCH * MINUTES_PER_DAY)).state;
    expect(game.fact(later, 'deal.warnings-left', {}, sim)).toBe(rivals.warnings);
  });

  it('warns and runs off your crew on held corners, and they sell nothing while off', { timeout: 120_000 }, () => {
    const crew = sliceGame({ people: 1000 });
    let warned = 0;
    let off = 0;
    for (let i = 0; i < 12; i++) {
      const s0 = play(crew, sim, crew.init(`members-${i}`, sim), waitUntil(12)).state;
      const members = [21, 22, 23, 24].map((person) => ({
        person,
        since: 0,
        held: 283,
        owed: 0,
        due: -1,
        taken: 0,
        cutOff: false,
        rival: noStanding(),
      }));
      let s = { ...s0, deal: { ...deal(s0), connect: true, members } } as GameState;
      const beats: Beat[] = [];
      for (let d = 0; d < 7; d++) {
        const r = play(crew, sim, s, advance(MINUTES_PER_DAY));
        beats.push(...r.beats);
        s = r.state;
      }
      warned += beats.filter((b) => b.type === 'deal/warned' && b.yours === false).length;
      // Run off once, then kept off: not run off again each night while the days run.
      const offs = beats.filter((x) => x.type === 'deal/run-off').map((x) => x.person);
      expect(new Set(offs).size).toBe(offs.length);
      for (const b of beats.filter((x) => x.type === 'deal/run-off')) {
        off++;
        const after = beats.slice(beats.indexOf(b) + 1);
        expect(after.some((x) => x.type === 'deal/member-sold' && x.person === b.person)).toBe(false);
      }
    }
    expect(warned).toBeGreaterThan(0);
    expect(off).toBeGreaterThan(0);
  });
});
