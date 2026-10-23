import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { PEOPLE_SHARES } from '../game.ts';
import { careerRoster } from './careers.ts';
import { built } from './gather.ts';
import { newShare, type PeopleSlice, progress } from './module.ts';

const sim = sliceSim();

describe('the tier-1 people in a life (M2.2)', () => {
  it('moves each share on once a day at its own hour, as time passes, with no timer of its own', () => {
    const game = sliceGame({ people: 48 });
    const start = game.init('people', sim);
    const timers = (start.time as { timers: { id: string }[] }).timers.map((t) => t.id);
    expect(timers.some((id) => id.startsWith('people'))).toBe(false);
    // From 07:00 on day 0, to 07:30 on day 1: every share has passed its hour once.
    let state = start;
    for (const hour of [12, 18, 23]) state = play(game, sim, state, waitUntil(hour)).state;
    state = play(game, sim, state, waitUntil(7, 30)).state;
    for (let k = 0; k < PEOPLE_SHARES; k++) {
      const share = state[`people-${k}`] as { hour: number; first: number; count: number };
      // Settled to the end of the passage that crossed its own hour: day 0's, or day 1's up to 07:00.
      const due = k <= 7 ? 24 + k : k;
      expect(share.hour, `share ${k}`).toBeGreaterThanOrEqual(due);
      expect(share.hour, `share ${k}`).toBeLessThanOrEqual(31);
      expect(share.count).toBe(2);
    }
  });

  it('lives a month in one action a day at a time: every hour planned once, the people as if lived in one go', () => {
    const game = sliceGame({ people: 240 });
    const start = game.init('month', sim);
    const before = built.plans;
    const state = play(game, sim, start, advance(30 * 24 * 60)).state;
    // 720 hours, and the two days the plans are kept for at most.
    expect(built.plans - before).toBeLessThanOrEqual(720 + 48);
    const city = {
      seed: game.fact(state, 'people.seed', undefined, sim) as number,
      n: game.fact(state, 'people.count', undefined, sim) as number,
    };
    // Share 5 holds neither linked person; from 07:00 on Monday, day 0.
    const share = state['people-5'] as PeopleSlice;
    const alone = newShare(240, 5, PEOPLE_SHARES);
    // The life's people work their careers' shifts (M2.3).
    progress(city, alone, 7, share.hour, 0, undefined, careerRoster(sim.content, city.seed, city.n));
    expect(share.hour).toBeGreaterThan(29 * 24);
    expect(share.levels).toEqual(alone.levels);
    expect(share.ties).toEqual(alone.ties);
  });
});
