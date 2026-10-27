/**
 * A boss's life for tests and benches (M4.1 step 6): the first morning of a life already in the
 * supplier's crew with the connect met, $20,000 to start on, and four of the tier-1 people known
 * well enough to bring in. The ties are set by hand, as many evenings together would leave them
 * (test/couple.ts does the same for courting). No test runner in here, as in slice.ts.
 */
import type { Game, GameState, SimContext } from '@eb/core';
import { type CircleSlice, newTie } from '../src/circle/state.ts';
import { tradeOf } from '../src/deal/records.ts';
import type { DealSlice } from '../src/deal/state.ts';

/** People known well on the first morning: roster numbers, spread through the city (tune). */
export const KNOWN = [101, 202, 303, 404];
export const START = 2_000_000;

export function bossLife(game: Game, sim: SimContext, seed: string): GameState {
  const s = game.init(seed, sim);
  const t = tradeOf(sim.content);
  return {
    ...s,
    deal: { ...(s.deal as DealSlice), crew: true, trust: t.boss.connect.trust, connect: true },
    circle: { ...(s.circle as CircleSlice), ties: KNOWN.map((p) => ({ ...newTie(p, 6000, 0), regard: 75 })) },
    economy: { ...(s.economy as object), amounts: { cash: START } },
  } as GameState;
}
