/**
 * `node packages/sim/test/year-bench.ts [lives]`: Phase 2's year gate (M2.11 step 4). The steady
 * bot lives a free year in each seed, the season and life events on; each must reach the year's
 * end on day 365 or die, with nothing refused. Reports how they ended, the life events asked, and
 * cash at the end. Defaults: 500 lives. About 6 seconds a life.
 */
import { seedsOf } from '@eb/core';
import { liveTheYear } from './free-year.ts';

const lives = Number(process.argv[2] ?? 500);
const t0 = performance.now();
const ends: Record<string, number> = {};
let refused = 0;
const events: number[] = [];
const cash: number[] = [];
for (const seed of seedsOf(lives, 'year')) {
  const y = liveTheYear(seed);
  ends[y.end] = (ends[y.end] ?? 0) + 1;
  refused += y.refused;
  events.push(y.events);
  if (y.end === 'year-end') cash.push(y.cash);
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
console.log(`${lives} free years: ${JSON.stringify(ends)}; refused ${refused}`);
console.log(`life events a year: median ${median(events)}, ${Math.min(...events)} to ${Math.max(...events)}`);
console.log(`cash at the year's end: median $${(median(cash) / 100).toFixed(2)}`);
console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
if (refused > 0 || (ends.turns ?? 0) > 0) process.exit(1);
