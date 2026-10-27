import { type Action, type GameState, type Policy, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { bossLife, START } from '../../test/boss.ts';
import { LINE_COOK, sliceSim } from '../../test/slice.ts';
import { bossFor } from '../boss-bot.ts';
import { steadyFor, WEEK } from '../bot.ts';
import { START_CASH } from '../dials.ts';
import { createLifeGame } from '../game.ts';

// M4.1's gate: the boss bot plays 500 seeded weeks, each life a boss on its first morning
// (test/boss.ts), with nothing refused, and reaches the crew's whole business.
const sim = sliceSim();
const game = createLifeGame({ people: 1000, events: false, unlocked: true });

const worth = (g: typeof game, s: GameState) => {
  const f = (id: string, args?: object) => g.fact(s, id, args as never, sim) as number;
  return f('economy.amount', { resource: 'cash' }) - f('law.owed') - f('home.owed') - f('deal.owed');
};

function live(g: typeof game, start: GameState, policy: Policy, seed: string): GameState {
  let s = start;
  const rng = Rng.create(seed).fork('bot');
  for (let turn = 0; turn < 200_000; turn++) {
    const a = policy.choose(turnFor(g, sim, s, rng, turn)) as Action | null;
    if (!a) break;
    s = g.reduce(s, a, sim).state;
  }
  return s;
}

describe('a crew of your own in the bot’s weeks (M4.1 step 6)', () => {
  // B6 at this tier: running a crew leaves a life worse off than the line cook's, counting what each
  // gained from where it started. The year's reading is bosses-bench.ts's (ROADMAP Readings).
  it('leaves a boss poorer after eight weeks than the line cook, once raids, seizures and beatings are counted', {
    timeout: 900_000,
  }, () => {
    const cooking = createLifeGame({ people: 1000, events: false, unlocked: true, career: LINE_COOK });
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] as number;
    const bosses: number[] = [];
    const cooks: number[] = [];
    for (const seed of seedsOf(12, 'b6-boss')) {
      bosses.push(worth(game, live(game, bossLife(game, sim, seed), bossFor(8 * WEEK), seed)) - START);
      cooks.push(worth(cooking, live(cooking, cooking.init(seed, sim), steadyFor(8 * WEEK), seed)) - START_CASH);
    }
    expect(median(bosses)).toBeLessThan(median(cooks));
  });

  it('plays 500 seeded weeks of running a crew with nothing refused', { timeout: 1_500_000 }, () => {
    const beats = new Map<string, number>();
    for (const seed of seedsOf(500, 'boss')) {
      const policy = bossFor(WEEK);
      let state = bossLife(game, sim, seed);
      const rng = Rng.create(seed).fork('bot');
      for (let turn = 0; turn < 40_000; turn++) {
        const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
        if (!action) break;
        const step = game.reduce(state, action, sim);
        expect(step.accepted, `${seed}: ${JSON.stringify(action)} ${JSON.stringify(step.beats[0])}`).toBe(true);
        for (const b of step.beats) beats.set(b.type, (beats.get(b.type) ?? 0) + 1);
        state = step.state;
      }
      expect(game.fact(state, 'time.day', undefined, sim)).toBeGreaterThanOrEqual(WEEK);
    }
    for (const b of ['deal/wholesale', 'deal/took-on', 'deal/fronted-to', 'deal/member-sold', 'deal/warned'])
      expect(beats.get(b) ?? 0, b).toBeGreaterThan(0);
    console.log('boss weeks', Object.fromEntries([...beats].filter(([k]) => k.startsWith('deal/'))));
  });
});
