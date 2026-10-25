import { type Action, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { WEEK } from '../bot.ts';
import { suitorFor } from './suitor.ts';

// M2.6's gate: a bot that looks for a partner plays 500 seeded weeks with nothing refused. The
// year's rates are read by packages/sim/test/couples-bench.ts, which is too slow for a test.
const game = sliceGame({ people: 1000 });
const sim = sliceSim();
const MAX_TURNS = 4000;

describe('looking for a partner, headless (M2.6)', () => {
  it('plays 500 seeded weeks: nothing refused, every week finished, people met and talked to', {
    timeout: 300_000,
  }, () => {
    const seen = new Map<string, number>();
    let capped = 0;
    for (const seed of seedsOf(500, 'suitor')) {
      const policy = suitorFor(WEEK);
      let state = game.init(seed, sim);
      const rng = Rng.create(seed).fork('bot');
      const runBeats = new Set<string>();
      let turn = 0;
      for (; turn < MAX_TURNS; turn++) {
        const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
        if (!action) break;
        const step = game.reduce(state, action, sim);
        expect(step.accepted, `${seed}: ${JSON.stringify(action)} ${JSON.stringify(step.beats)}`).toBe(true);
        for (const b of step.beats) runBeats.add(b.type);
        state = step.state;
      }
      if (turn === MAX_TURNS) capped++;
      for (const b of runBeats) seen.set(b, (seen.get(b) ?? 0) + 1);
    }
    expect(capped).toBe(0);
    // Most lives meet someone in a week out every evening, and talk to them. Nobody is asked out
    // yet: that waits on knowing someone well enough, weeks of evenings (the couples bench).
    expect(seen.get('circle/met') ?? 0).toBeGreaterThan(400);
    expect(seen.get('circle/talked') ?? 0).toBeGreaterThan(400);
  });
});
