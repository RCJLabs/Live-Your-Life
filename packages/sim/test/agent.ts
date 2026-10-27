/**
 * A start for the agent bot (M4.3 step 5): 26, a bachelor's from the university at a 3.33, two
 * years' work as an accountant, and $2,000. For federal/agent.test.ts and agents-bench.ts.
 */
import type { Game, GameState, SimContext } from '@eb/core';
import type { EducationSlice } from '../src/education/module.ts';
import { agencyOf } from '../src/federal/records.ts';
import type { JobSlice } from '../src/job/state.ts';
import { sliceGame } from './slice.ts';

export const agentGame = (people: number): Game => sliceGame({ people, career: 'accountant' });

export function agentStart(game: Game, sim: SimContext, seed: string): GameState {
  const s = game.init(seed, sim);
  const worked = agencyOf(sim.content)?.requires.minutes ?? 0;
  const e = s.education as EducationSlice;
  const job = s.job as JobSlice;
  return {
    ...s,
    lives: { ...(s.lives as object), born: -26 * 365 },
    education: {
      ...e,
      finished: 'bachelor',
      university: { ...e.university, admitted: true, credits: 120, graded: 120, points: 400 },
    },
    job: { ...job, practice: worked, experience: { ...job.experience, accountant: worked } },
    economy: { ...(s.economy as object), amounts: { cash: 2_000_00 } },
  } as GameState;
}
