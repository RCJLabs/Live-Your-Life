import { type Action, type Policy, playRun, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { LINE_COOK, sliceSim } from '../../test/slice.ts';
import { steadyFor, WEEK } from '../bot.ts';
import { dealerFor } from '../dealer.ts';
import { createLifeGame } from '../game.ts';

// M2.4's gate: a dealer bot, a police bot and the steady bot play 500 seeded weeks each with
// nothing refused; and crime pays less than work once arrests and time are counted (B6).
const sim = sliceSim();
const MAX_TURNS = 40_000;

function sweep(game: ReturnType<typeof createLifeGame>, policyFor: () => Policy, name: string, days = WEEK) {
  const beats = new Map<string, number>();
  for (const seed of seedsOf(500, name)) {
    const policy = policyFor();
    let state = game.init(seed, sim);
    const rng = Rng.create(seed).fork('bot');
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
      if (!action) break;
      const step = game.reduce(state, action, sim);
      expect(step.accepted, `${seed}: ${JSON.stringify(action)} ${JSON.stringify(step.beats[0])}`).toBe(true);
      for (const b of step.beats) beats.set(b.type, (beats.get(b.type) ?? 0) + 1);
      state = step.state;
    }
    expect(game.fact(state, 'time.day', undefined, sim)).toBeGreaterThanOrEqual(days);
  }
  return beats;
}

describe('the trade and the police in the bots’ lives (M2.4)', () => {
  it('plays 500 seeded weeks of dealing with nothing refused', { timeout: 600_000 }, () => {
    const beats = sweep(createLifeGame({ people: 0 }), () => dealerFor(WEEK), 'dealer');
    for (const b of ['deal/bought', 'deal/sold', 'deal/seen', 'law/raided', 'law/arraigned', 'deal/joined'])
      expect(beats.get(b) ?? 0, b).toBeGreaterThan(0);
  });

  it('plays 500 seeded weeks of the academy with nothing refused', { timeout: 600_000 }, () => {
    const beats = sweep(createLifeGame({ people: 0, career: 'police-recruit' }), () => steadyFor(WEEK), 'police');
    expect(beats.get('job/worked') ?? 0).toBeGreaterThan(500);
  });

  it('plays 500 seeded weeks of the line cook with nothing refused', { timeout: 600_000 }, () => {
    sweep(createLifeGame({ people: 0, career: LINE_COOK }), () => steadyFor(WEEK), 'steady');
  });

  it('takes a recruit through the academy to patrol in 20 weeks, making arrests there', { timeout: 300_000 }, () => {
    const game = createLifeGame({ people: 0, career: 'police-recruit' });
    for (const seed of seedsOf(10, 'ladder')) {
      const run = playRun(game, sim, { seed, policy: steadyFor(20 * WEEK), maxTurns: 400_000 });
      expect(run.beats['job/promoted'], seed).toBe(1);
      expect((run.state.job as { career: string }).career).toBe('police-officer');
      expect(run.beats['job/made-arrest'] ?? 0, seed).toBeGreaterThan(0);
    }
  });

  // B6: over 8 weeks, every dealer is worth less than every line cook, after what is owed to the
  // court, the landlord and the supplier (ROADMAP Readings: pays-bench.ts).
  it('leaves a dealer poorer after eight weeks than the line cook, once arrests are counted', {
    timeout: 600_000,
  }, () => {
    const worth = (game: ReturnType<typeof createLifeGame>, policy: Policy, seed: string) => {
      const { state } = playRun(game, sim, { seed, policy, maxTurns: 200_000 });
      const f = (id: string, args?: object) => game.fact(state, id, args as never, sim) as number;
      return f('economy.amount', { resource: 'cash' }) - f('law.owed') - f('home.owed') - f('deal.owed');
    };
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] as number;
    const seeds = seedsOf(60, 'pays');
    const dealers = seeds.map((s) => worth(createLifeGame({ people: 0 }), dealerFor(8 * WEEK), s));
    const cooks = seeds.map((s) => worth(createLifeGame({ people: 0, career: LINE_COOK }), steadyFor(8 * WEEK), s));
    expect(median(dealers)).toBeLessThan(median(cooks));
    expect(Math.max(...dealers)).toBeLessThan(Math.min(...cooks));
  });
});
