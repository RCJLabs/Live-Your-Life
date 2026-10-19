/**
 * `node packages/sim/test/block-bench.ts [seeds] [rounds]`: M1.1's readings for ROADMAP's Readings.
 * The time to plan a block from the seed and the templates, to lay its walk grid, and to route
 * a walker from one end of the street to the far end of the open side, the longest walk on it.
 * Defaults: 1,000 seeds, 5 rounds.
 */
import { performance } from 'node:perf_hooks';
import { contentStore } from '@lyl/content';
import { blockTemplates, cellAt, planBlock, route, walkGrid } from '../src/index.ts';

const seedCount = Number(process.argv[2] ?? 1000);
const rounds = Number(process.argv[3] ?? 5);
const templates = blockTemplates(contentStore(), 'slice');
const seeds = Array.from({ length: seedCount }, (_, i) => `bench-${i}`);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;

const plans = seeds.map((seed) => planBlock(templates, seed));
const grids = plans.map(walkGrid);
const plan: number[] = [];
const grid: number[] = [];
const walk: number[] = [];
let metres = 0;
for (let round = 0; round < rounds; round++) {
  let t0 = performance.now();
  for (const seed of seeds) planBlock(templates, seed);
  plan.push((performance.now() - t0) / seedCount);
  t0 = performance.now();
  for (const p of plans) walkGrid(p);
  grid.push((performance.now() - t0) / seedCount);
  t0 = performance.now();
  metres = 0;
  plans.forEach((p, i) => {
    const g = grids[i] as (typeof grids)[number];
    const from = cellAt(g, p.street.xa + 0.75, p.street.lotFront + 1.25);
    const to = cellAt(g, p.street.xb - 0.75, p.street.openBack - 0.75);
    metres += route(g, from, to)?.metres ?? 0;
  });
  walk.push((performance.now() - t0) / seedCount);
}
const cells = grids.reduce((n, g) => n + g.width * g.height, 0) / seedCount;
const ms = (xs: number[]) =>
  `${median(xs).toFixed(3)} ms (${Math.min(...xs).toFixed(3)}–${Math.max(...xs).toFixed(3)})`;
console.log(`${seedCount} blocks, ${rounds} rounds, Node ${process.version}; medians over rounds`);
console.log(`plan a block: ${ms(plan)}`);
console.log(`lay its walk grid: ${ms(grid)}; ${Math.round(cells)} cells on average`);
console.log(`route end to end and across: ${ms(walk)}; ${(metres / seedCount).toFixed(1)} m on average`);
