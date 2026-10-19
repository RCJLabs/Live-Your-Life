/**
 * `node packages/sim/test/week-bench.ts [seeds] [rounds]`: the readings behind M0.2's gate (ROADMAP
 * Readings). Each round plays the week sweep with the steady bot and times it per turn (options,
 * the bot's facts and reduce together), then replays every run's log and times reduce alone.
 * Defaults: 500 seeds, 5 rounds.
 */
import { performance } from 'node:perf_hooks';
import { type Action, playRun, seedsOf, sweep } from '@eb/core';
import { createLifeGame, lifeSim, steadyPolicy } from '../src/index.ts';

const seedCount = Number(process.argv[2] ?? 500);
const rounds = Number(process.argv[3] ?? 5);
const game = createLifeGame();
const sim = lifeSim();
const seeds = seedsOf(seedCount, 'week');
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

const logs: { seed: string; log: readonly Action[] }[] = seeds.map((seed) => ({
  seed,
  log: playRun(game, sim, { seed, policy: steadyPolicy, maxTurns: 2000 }).log,
}));
const actions = logs.reduce((n, run) => n + run.log.length, 0);

const sweepMs: number[] = [];
const replayMs: number[] = [];
let turns = 0;
for (let round = 0; round < rounds; round++) {
  const t0 = performance.now();
  const { report } = sweep(game, sim, { seeds, policy: steadyPolicy, maxTurns: 2000 });
  sweepMs.push(performance.now() - t0);
  turns = report.turns === null ? 0 : report.turns.mean * report.runs;
  if (report.refused.count > 0 || report.ends.stopped !== seedCount) {
    throw new Error(`the sweep went wrong: ${JSON.stringify({ ends: report.ends, refused: report.refused.count })}`);
  }
  const t1 = performance.now();
  for (const { seed, log } of logs) {
    let state = game.init(seed, sim);
    for (const action of log) state = game.reduce(state, action, sim).state;
  }
  replayMs.push(performance.now() - t1);
}

const range = (xs: number[], per: number) =>
  `${((Math.min(...xs) * 1000) / per).toFixed(1)}–${((Math.max(...xs) * 1000) / per).toFixed(1)} µs (median ${((median(xs) * 1000) / per).toFixed(1)})`;
console.log(`${seedCount} weeks, ${turns} turns, ${actions} accepted actions, ${rounds} rounds`);
console.log(`sweep: ${Math.round(median(sweepMs))} ms a round; ${range(sweepMs, turns)} a turn`);
console.log(`reduce alone, replaying the logs: ${range(replayMs, actions)} an action`);
