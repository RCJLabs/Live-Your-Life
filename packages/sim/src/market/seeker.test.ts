import { type Action, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { seekerFor, WEEK } from '../bot.ts';

// M2.3's gate: bots that look for work, apply and keep jobs play 500 seeded weeks with nothing
// refused, and between them are hired into every career. They start with no job.
const game = sliceGame({ career: undefined });
const sim = sliceSim();
const MAX_TURNS = 3000;

describe('looking for work, headless (M2.3, D74)', () => {
  it('plays 500 seeded weeks from no job: nothing refused, most hired, and every career reached', {
    timeout: 120_000,
  }, () => {
    const hired = new Map<string, number>();
    let employed = 0;
    let applied = 0;
    let turned = 0;
    for (const seed of seedsOf(500, 'seeker')) {
      const policy = seekerFor(WEEK);
      let state = game.init(seed, sim);
      expect(game.fact(state, 'job.employed', undefined, sim)).toBe(false);
      const rng = Rng.create(seed).fork('bot');
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
        if (!action) break;
        const step = game.reduce(state, action, sim);
        expect(step.accepted, `${seed}: ${JSON.stringify(action)}`).toBe(true);
        for (const b of step.beats) {
          if (b.type === 'job/hired') hired.set(b.career as string, (hired.get(b.career as string) ?? 0) + 1);
          if (b.type === 'market/applied') applied++;
          if (b.type === 'market/turned-down') turned++;
        }
        state = step.state;
      }
      if (game.fact(state, 'job.employed', undefined, sim) === true) employed++;
    }
    expect([...hired.keys()].sort()).toEqual([...sim.content.ids('career')].sort());
    // Applications are answered at about the odds: half for the line cook (tune).
    expect(turned / applied).toBeGreaterThan(0.3);
    expect(turned / applied).toBeLessThan(0.7);
    // Far faster than the household survey's 9.6 weeks a spell (ROADMAP Readings, open question 66).
    expect(employed / 500).toBeGreaterThan(0.5);
  });
});
