import { type Action, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { agentGame, agentStart } from '../../test/agent.ts';
import { sliceSim } from '../../test/slice.ts';
import { agentFor } from './agent.ts';

const sim = sliceSim();
const game = agentGame(0);

describe('the agent bot (M4.3 step 5)', () => {
  it('goes from a bachelor’s and two years’ work through the stages and the Academy to a year of cases, nothing refused', () => {
    // One of the bench's lives (test/agents-bench.ts) that is cleared on its first application.
    const seed = 'agents-7';
    const days = 720;
    let state = agentStart(game, sim, seed);
    const policy = agentFor(days);
    const rng = Rng.create(seed).fork('bot');
    const seen: { type: string; day: number; [k: string]: unknown }[] = [];
    for (let turn = 0; turn < days * 300; turn++) {
      const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
      if (!action) break;
      const step = game.reduce(state, action, sim);
      expect(step.accepted, `${seed}: ${JSON.stringify(action)}`).toBe(true);
      state = step.state;
      const day = game.fact(state, 'time.day', {}, sim) as number;
      for (const b of step.beats) if (/^(federal|job)\/(?!worked|paid|standing)/.test(b.type)) seen.push({ ...b, day });
    }
    const first = (type: string, x: Record<string, unknown> = {}) =>
      seen.find((b) => b.type === type && Object.entries(x).every(([k, v]) => b[k] === v));
    // Every stage passed, in order, each on or after its day.
    expect(seen.filter((b) => b.type === 'federal/passed').map((b) => b.stage)).toEqual([
      'written',
      'fitness',
      'interview',
      'background',
    ]);
    const reported = first('federal/reported');
    const sworn = first('job/promoted', { career: 'special-agent' });
    expect(reported && sworn).toBeTruthy();
    // The Academy's weeks: about 18 of weekdays, a few days fewer for the practice its events give.
    expect((sworn?.day as number) - (reported?.day as number)).toBeGreaterThanOrEqual(17 * 7);
    expect((sworn?.day as number) - (reported?.day as number)).toBeLessThanOrEqual(19 * 7);
    // A year of cases after it: opened, worked and decided, and the next grade reached.
    const cases = seen.filter((b) => b.type === 'federal/convicted' || b.type === 'federal/declined');
    expect(seen.some((b) => b.type === 'federal/opened')).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(1);
    expect(seen.filter((b) => b.type === 'job/evidence').length).toBeGreaterThan(10);
    expect(first('job/promoted', { career: 'special-agent-11' })).toBeTruthy();
    expect(game.fact(state, 'time.day', {}, sim) as number).toBeGreaterThanOrEqual((sworn?.day as number) + 365);
  }, 240_000);
});
