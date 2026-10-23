import { describe, expect, it } from 'vitest';
import { play, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { PEOPLE_SHARES } from '../game.ts';

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
});
