/**
 * A start for the medic bots (M4.4 step 5): 18 with a high school diploma, a line cook at the
 * diner, with the slice's cash. For education/medic.test.ts and medics-bench.ts.
 */
import type { Game, GameState, SimContext } from '@eb/core';
import type { EducationSlice } from '../src/education/module.ts';

export function medicStart(game: Game, sim: SimContext, seed: string): GameState {
  const s = game.init(seed, sim);
  return { ...s, education: { ...(s.education as EducationSlice), finished: 'diploma' } } as GameState;
}
