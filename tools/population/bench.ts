/**
 * `node tools/population/bench.ts [days] [sizes]`: the population harness in Node (M0.4,
 * ROADMAP.md's Readings). Sizes are comma-separated; the defaults are 30 days and 100, 300, 500,
 * 1,000 and 3,000 people.
 */
import { performance } from 'node:perf_hooks';
import { DAYS, formatSweep, SIZES, sweep } from './src/sweep.ts';

const days = Number(process.argv[2] ?? DAYS);
const sizes = process.argv[3] ? process.argv[3].split(',').map(Number) : SIZES;
const started = performance.now();
const result = await sweep({
  sizes,
  days,
  now: () => performance.now(),
  between: async (done) => {
    console.error(`  ${done} (${((performance.now() - started) / 1000).toFixed(0)} s)`);
  },
});
console.log(`${days} game days, Node ${process.version}`);
console.log(formatSweep(result));
