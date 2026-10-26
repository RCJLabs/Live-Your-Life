import { type Action, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { studentFor } from './student.ts';

const sim = sliceSim();
const game = sliceGame({ people: 1000 });
/** From the slice's start on 2 June to past the fall term's end, 112 days from 1 September. */
const DAYS = 210;

describe('the student bot (M2.8 step 7)', () => {
  it('works and studies a term: enrolls, goes to class, is graded and earns credits, nothing refused', () => {
    for (const seed of ['student-a', 'student-b']) {
      const policy = studentFor(DAYS);
      let state = game.init(seed, sim);
      state = { ...state, education: { ...(state.education as object), finished: 'diploma' } } as typeof state;
      const rng = Rng.create(seed).fork('bot');
      const seen = new Map<string, number>();
      for (let turn = 0; turn < DAYS * 300; turn++) {
        const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
        if (!action) break;
        const step = game.reduce(state, action, sim);
        expect(step.accepted, `${seed}: ${JSON.stringify(action)}`).toBe(true);
        for (const b of step.beats) seen.set(b.type, (seen.get(b.type) ?? 0) + 1);
        state = step.state;
      }
      // Fall, and spring once its window opens before the run ends; each billed once.
      expect(seen.get('education/enrolled') ?? 0, seed).toBeGreaterThanOrEqual(1);
      expect(seen.get('education/billed'), seed).toBe(seen.get('education/enrolled'));
      // Most classes are gone to, though a dinner shift keeps it from some (tune of the bot).
      expect(seen.get('education/attended') ?? 0, seed).toBeGreaterThan(20);
      expect(seen.get('education/graded'), seed).toBe(2);
      expect(game.fact(state, 'education.credits', {}, sim), seed).toBeGreaterThan(0);
      expect(game.fact(state, 'job.employed', {}, sim), seed).toBe(true);
    }
    // Two lives of seven months each: about six seconds a life.
  }, 60_000);
});
