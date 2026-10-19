import { playRun, type SweepReport, seedsOf, stateHash, sweep } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { randomLifePolicy, steadyPolicy } from './bot.ts';
import { DEFAULT_START } from './calendar.ts';
import { lifeSim } from './content.ts';
import { START_CASH } from './dials.ts';
import { createLifeGame } from './game.ts';

const game = createLifeGame();
const sim = lifeSim();
const MAX_TURNS = 2000;

/** The lowest and highest a metric read at the end of the runs. */
const range = (report: SweepReport, i: number): number[] => {
  const metric = report.metrics[i];
  return metric?.kind === 'number' && metric.summary !== null ? [metric.summary.min, metric.summary.max] : [];
};

/** How many runs emitted a beat at least once. */
const reached = (report: SweepReport, type: string): number =>
  report.beats.find((beat) => beat.type === type)?.runs ?? 0;

// M0.2's gate: bots play a week of life headless, choosing only what the game offers, and the
// game accepts every offer. `node packages/sim/test/week-bench.ts` times the same sweep.
describe('a week of life, headless', () => {
  it('plays 500 seeded weeks with the steady bot: every week finished, every offer accepted', {
    timeout: 60_000,
  }, () => {
    const { report } = sweep(game, sim, {
      seeds: seedsOf(500, 'week'),
      policy: steadyPolicy,
      maxTurns: MAX_TURNS,
      metrics: [
        { fact: 'life.need', args: { need: 'health' }, label: 'health' },
        { fact: 'economy.amount', args: { resource: 'cash' }, label: 'cash' },
        { fact: 'time.day', label: 'day' },
      ],
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 500, capped: 0 });
    expect(report.refused.count).toBe(0);
    // Seeds must matter: the bot's draws make the weeks differ.
    expect(report.distinct).toBeGreaterThan(450);
    // A week is seven days, not six or eight: every run stops on the morning of day 7.
    expect(range(report, 2)).toEqual([7, 7]);
    // The steady bot's play, not facts about the game: a sensible routine at these rates keeps a
    // person healthy (the needs table's promise), and its shifts pay more than its meals cost, so
    // the sweep goes through the job, payday and the economy kit on every seed.
    expect(range(report, 0)[0]).toBeGreaterThanOrEqual(90);
    expect(range(report, 1)[0]).toBeGreaterThan(START_CASH);
  });

  it('lives through rent it cannot pay: owed on the 1st, paid off after payday, nothing refused', {
    timeout: 60_000,
  }, () => {
    // The default start never meets a rent day in its first week. Monday 30 June does, that
    // midnight, with the starting cash and no pay yet: the refusal a week has to recover from.
    const monthEnd = createLifeGame({ start: { ...DEFAULT_START, day: 30 } });
    const { report } = sweep(monthEnd, sim, {
      seeds: seedsOf(200, 'rent'),
      policy: steadyPolicy,
      maxTurns: MAX_TURNS,
      metrics: [{ fact: 'home.owed', label: 'owed' }],
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 200, capped: 0 });
    expect(report.refused.count).toBe(0);
    expect(reached(report, 'home/rent')).toBe(200);
    // The steady bot's play: Friday's pay covers what is owed, and paying it comes first.
    expect(reached(report, 'home/paid-owed')).toBe(200);
    expect(range(report, 0)).toEqual([0, 0]);
  });

  it('plays 200 weeks with the random bot: every playable offer accepted', { timeout: 60_000 }, () => {
    const { report } = sweep(game, sim, {
      seeds: seedsOf(200, 'random'),
      policy: randomLifePolicy,
      maxTurns: MAX_TURNS,
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 200, capped: 0 });
    expect(report.refused.count).toBe(0);
  });

  it('plays the same week twice for a seed, and its log replays to the same state', () => {
    for (const seed of seedsOf(20, 'replay')) {
      const first = playRun(game, sim, { seed, policy: steadyPolicy, maxTurns: MAX_TURNS });
      const second = playRun(game, sim, { seed, policy: steadyPolicy, maxTurns: MAX_TURNS });
      expect(stateHash(second.state)).toBe(stateHash(first.state));
      let replayed = game.init(seed, sim);
      for (const action of first.log) replayed = game.reduce(replayed, action, sim).state;
      expect(stateHash(replayed)).toBe(stateHash(first.state));
    }
  });
});
