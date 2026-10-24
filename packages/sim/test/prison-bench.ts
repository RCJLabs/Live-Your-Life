/**
 * `node packages/sim/test/prison-bench.ts [days] [rounds]`: the reading behind M2.4's gate that a
 * sentence passes a day an action, never in one blocking action (D81). A life with its 1,000
 * people is taken inside, and each day (prison/day) is timed: what the page spends a frame while
 * it passes a sentence. Defaults: 120 days, 3 rounds.
 */
import { performance } from 'node:perf_hooks';
import type { GameState } from '@eb/core';
import { sliceGame, sliceSim } from './slice.ts';

const days = Number(process.argv[2] ?? 120);
const rounds = Number(process.argv[3] ?? 3);
const game = sliceGame({ people: 1000 });
const sim = sliceSim();
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

const ms: number[] = [];
for (let round = 0; round < rounds; round++) {
  const s = game.init(`prison-${round}`, sim);
  const kernel = s.kernel as unknown as { modes: { id: string; data?: unknown }[] };
  const day = game.fact(s, 'time.day', undefined, sim) as number;
  let state = {
    ...s,
    prison: {
      ...(s.prison as object),
      term: { offence: 'delivery-cocaine-50', from: day, minimum: day + 400, maximum: day + 7305, hearing: day + 400 },
    },
    kernel: { ...kernel, modes: [...kernel.modes, { id: 'prison', data: {} }] },
  } as unknown as GameState;
  for (let d = 0; d < days; d++) {
    const t0 = performance.now();
    const step = game.reduce(state, { type: 'prison/day' }, sim);
    ms.push(performance.now() - t0);
    if (!step.accepted) throw new Error(`day ${d} refused: ${JSON.stringify(step.beats[0])}`);
    state = step.state;
  }
}
const s = sorted(ms);
const at = (q: number) => (s[Math.min(s.length - 1, Math.floor(q * s.length))] as number).toFixed(1);
console.log(
  `prison/day with 1,000 people, ${ms.length} days: median ${at(0.5)} ms, 90th ${at(0.9)} ms, slowest ${at(1)} ms`,
);
