/**
 * A couple for tests (M2.6): a life out at its first third place with the people there who are
 * drawn to it known well, set by hand as many evenings together would leave them; someone to ask;
 * and someone dating, after a yes. No test runner in here, as in slice.ts.
 */
import { type Beat, type GameState, Rng, turnFor } from '@eb/core';
import { WEEKDAYS } from '../src/calendar.ts';
import { presentAt, rosterNow } from '../src/circle/meet.ts';
import { type CircleSlice, newTie, type Tie } from '../src/circle/state.ts';
import type { Roster } from '../src/people/roster.ts';
import { play, sliceGame, sliceSim, waitUntil } from './slice.ts';

export const sim = sliceSim();
export const game = sliceGame({ people: 1000 });

export const circle = (s: GameState) => (s as unknown as { circle: CircleSlice }).circle;
export const withCircle = (s: GameState, c: Partial<CircleSlice>) =>
  ({ ...s, circle: { ...circle(s), ...c } }) as GameState;
export const fact = (s: GameState, id: string, args: Record<string, unknown> = {}) => game.fact(s, id, args, sim);
export const offered = (s: GameState, type: string) =>
  game
    .options(s, sim)
    .filter((a) => a.type === type)
    .map((a) => a.person as number);
export const shown = (s: GameState, effect: string, person: number) =>
  turnFor(game, sim, s, Rng.create('shown'), 0).preview([{ effect, person }])[0] as unknown as {
    chance: number;
    found?: { person: number; chance: number }[];
  };
export const rolled = (beats: readonly Beat[]) => beats.filter((b) => b.type === 'logic/rolled');

/**
 * Out at your first third place at 20:00, drawn to anyone, with the people there drawn to you
 * known well: ties set by hand, as many evenings together would leave them.
 */
export function atBar(seed: string, together = 6000): { state: GameState; here: number[] } {
  let s = play(game, sim, game.init(seed, sim), { type: 'circle/drawn-to', to: 'anyone' }, waitUntil(20)).state;
  const place = game.options(s, sim).find((a) => a.type === 'circle/go-out')?.place as number;
  s = play(game, sim, s, { type: 'circle/go-out', place }).state;
  const roster = rosterNow({ fact: (id: string) => fact(s, id), content: sim.content } as never) as Roster;
  const hour = (fact(s, 'time.day') as number) * 24 + 20;
  const weekday = WEEKDAYS.indexOf(fact(s, 'time.weekday') as (typeof WEEKDAYS)[number]);
  const here = presentAt(roster, fact(s, 'people.seed') as number, hour, weekday, place).filter(
    (p) => (fact(s, 'circle.attraction', { person: p }) as number) > 0,
  );
  const ties: Tie[] = here.map((p) => ({ ...newTie(p, together, 0) }));
  return { state: withCircle(s, { ties }), here };
}

/** A bar with someone there to ask, for one of a few seeds. */
export function someone(): { state: GameState; who: number } {
  for (let i = 0; i < 20; i++) {
    const { state, here } = atBar(`court-${i}`);
    if (here.length > 0) return { state, who: here[0] as number };
  }
  throw new Error('nobody drawn to you at the bar in 20 seeds');
}

/** Asked out, and they said yes: the roll forced by an attraction and regard that leave no doubt. */
export function dating(): { state: GameState; who: number } {
  const { state, who } = someone();
  for (let k = 0; k < 40; k++) {
    const r = play(game, sim, state, { type: 'circle/ask-out', person: who });
    if (r.of('circle/asked-out')[0]?.yes === true) return { state: r.state, who };
    // Another try from a new seed of the roll: the same life, another day's answer.
    const again = withCircle(state, { ties: circle(state).ties.map((t) => ({ ...t, regard: 100 })) });
    const r2 = play(game, sim, again, { type: 'circle/ask-out', person: who });
    if (r2.of('circle/asked-out')[0]?.yes === true) return { state: r2.state, who };
  }
  throw new Error('never said yes');
}
