/**
 * `node packages/sim/test/block-bench.ts [seeds] [rounds]`: M1.1's and M1.2's readings for ROADMAP's
 * Readings. The time to plan a block from the seed and the templates, its two interiors with it
 * (M1.2), to lay its walk grid, to route a walker from one end of the street to the far end of the
 * open side, the longest walk on it, and to route the commute, a flat's bed to the diner's griddle.
 * Defaults: 1,000 seeds, 5 rounds.
 */
import { performance } from 'node:perf_hooks';
import { contentStore } from '@lyl/content';
import {
  type BlockPlan,
  blockTemplates,
  cellAt,
  planBlock,
  route,
  useCell,
  type WalkGrid,
  walkGrid,
} from '../src/index.ts';

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
const commute: number[] = [];
let metres = 0;
let commuted = 0;

/** The first flat's bed and the griddle, as the cells a walk between them ends in. */
function ends(p: BlockPlan, g: WalkGrid): [number, number] {
  const flat = p.buildings.find((b) => b.interior?.template === 'walk-up')?.interior;
  const diner = p.buildings.find((b) => b.interior?.template === 'diner')?.interior;
  const bed = flat?.fixtures.find((f) => f.use?.serves.includes('sleep'));
  const griddle = diner?.fixtures.find((f) => f.id.endsWith('/griddle'));
  if (!flat || !diner || !bed || !griddle) throw new Error(`${p.seed}: no flat or no diner`);
  return [useCell(g, flat, bed), useCell(g, diner, griddle)];
}
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
  t0 = performance.now();
  commuted = 0;
  plans.forEach((p, i) => {
    const g = grids[i] as (typeof grids)[number];
    const [bed, griddle] = ends(p, g);
    commuted += route(g, bed, griddle)?.metres ?? 0;
  });
  commute.push((performance.now() - t0) / seedCount);
}
const cells = grids.reduce((n, g) => n + g.width * g.height, 0) / seedCount;
const ms = (xs: number[]) =>
  `${median(xs).toFixed(3)} ms (${Math.min(...xs).toFixed(3)}–${Math.max(...xs).toFixed(3)})`;
console.log(`${seedCount} blocks, ${rounds} rounds, Node ${process.version}; medians over rounds`);
console.log(`plan a block and its two interiors: ${ms(plan)}`);
console.log(`lay its walk grid: ${ms(grid)}; ${Math.round(cells)} cells on average`);
console.log(`route end to end and across: ${ms(walk)}; ${(metres / seedCount).toFixed(1)} m on average`);
console.log(`route the commute, bed to griddle: ${ms(commute)}; ${(commuted / seedCount).toFixed(1)} m on average`);
