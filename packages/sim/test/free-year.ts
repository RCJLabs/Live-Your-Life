/**
 * The free year, lived by the steady bot (M2.11 step 4, Phase 2's year gate): a free life from the
 * slice's start, with the season and life events on, played until the year's end stops it, the
 * life ends, or the turns run out. For year-bench.ts and the edition's tests. (test/year.ts is the lives' year, M2.7.)
 */
import { type Action, Rng, turnFor } from '@eb/core';
import { steadyFor } from '../src/bot.ts';
import { FREE_DAYS, YEAR_END } from '../src/index.ts';
import { sliceGame, sliceSim } from './slice.ts';

export interface YearLived {
  /** How it ended: at the year's end, dead with nobody to go on, or out of turns. */
  readonly end: 'year-end' | 'dead' | 'turns';
  readonly day: number;
  readonly refused: number;
  readonly events: number;
  readonly cash: number;
}

/** A turn is about a game hour or two: two years of them is plenty for one (tune). */
const MAX_TURNS = 40_000;

export function liveTheYear(seed: string, people = 0): YearLived {
  const game = sliceGame({ people, events: true, unlocked: false });
  const sim = sliceSim();
  // The bot would stop at its last day; it is given past the year so the year's end stops it.
  const policy = steadyFor(FREE_DAYS + 30);
  const rng = Rng.create(seed).fork('bot');
  let state = game.init(seed, sim);
  let refused = 0;
  let events = 0;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const mode = (state.kernel.modes.at(-1) as { id: string }).id;
    if (mode === YEAR_END || mode === 'dead') {
      const fact = (id: string, args: Record<string, unknown> = {}) => game.fact(state, id, args, sim);
      return {
        end: mode === YEAR_END ? 'year-end' : 'dead',
        day: fact('time.day') as number,
        refused,
        events,
        cash: fact('economy.amount', { resource: 'cash' }) as number,
      };
    }
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) refused++;
    else events += step.beats.filter((b) => b.type === 'event/asked').length;
    state = step.state;
  }
  const day = game.fact(state, 'time.day', {}, sim) as number;
  return { end: 'turns', day, refused, events, cash: 0 };
}
