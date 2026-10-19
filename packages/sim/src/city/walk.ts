/**
 * The walk grid (M1.1): the block's ground in half-metre cells, each with what a step into it
 * costs, or no step at all under a building or a post. Tap-to-go (M1.6) walks it, and route
 * times are its routes' lengths (path.ts). It is worked out from the plan whenever it is needed,
 * never stored: Landnám's rule, if a fact can be computed it does not go in the save.
 */
import type { BlockPlan, BuildingPlan, StreetPlan } from './block.ts';
import { FOOTPRINT } from './street.ts';

/** A cell's side, in metres (tune). */
export const CELL = 0.5;

/** What a step onto each kind of ground costs against the sidewalk's 1 (tune): the roadway takes care, grass and gravel slow you. */
export const GROUND_COST = {
  sidewalk: 1,
  alley: 1,
  lot: 1.1,
  roadway: 1.4,
  verge: 1.2,
  'car-park': 1,
} as const;
export type Ground = keyof typeof GROUND_COST;

export interface WalkGrid {
  /** The grid's north-west corner, in metres. */
  readonly x0: number;
  readonly y0: number;
  readonly width: number;
  readonly height: number;
  /** Row by row from the north: what stepping into each cell costs; Infinity where nobody walks. */
  readonly cost: Float64Array;
  /** The cheapest ground anywhere, which keeps A*'s estimate from overshooting (path.ts). */
  readonly minCost: number;
}

/** What lies at y across the whole street: the alley, the lots, a sidewalk, the roadway, the open side. */
export function groundAt(s: StreetPlan, y: number): Ground {
  if (y < 0) return 'alley';
  if (y < s.lotFront) return 'lot';
  if (y < s.curb) return 'sidewalk';
  if (y < s.farCurb) return 'roadway';
  if (y < s.openFront) return 'sidewalk';
  return s.open;
}

/** Marks every cell a rectangle overlaps as no step. Touching an edge is not overlapping, so a door's sidewalk stays open. */
function block(grid: WalkGrid, x0: number, y0: number, x1: number, y1: number): void {
  const c0 = Math.max(0, Math.floor((x0 - grid.x0) / CELL));
  const c1 = Math.min(grid.width - 1, Math.ceil((x1 - grid.x0) / CELL) - 1);
  const r0 = Math.max(0, Math.floor((y0 - grid.y0) / CELL));
  const r1 = Math.min(grid.height - 1, Math.ceil((y1 - grid.y0) / CELL) - 1);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) grid.cost[r * grid.width + c] = Number.POSITIVE_INFINITY;
}

export function walkGrid(plan: BlockPlan): WalkGrid {
  const s = plan.street;
  const width = Math.ceil((s.xb - s.xa) / CELL);
  const height = Math.ceil((s.openBack - s.alley) / CELL);
  const cost = new Float64Array(width * height);
  const grid: WalkGrid = {
    x0: s.xa,
    y0: s.alley,
    width,
    height,
    cost,
    minCost: Math.min(...Object.values(GROUND_COST)),
  };
  for (let r = 0; r < height; r++) {
    const step = GROUND_COST[groundAt(s, s.alley + (r + 0.5) * CELL)];
    cost.fill(step, r * width, (r + 1) * width);
  }
  for (const b of plan.buildings) block(grid, b.x0, b.y0, b.x1, b.y1);
  for (const p of plan.props) {
    const f = FOOTPRINT[p.kind];
    block(grid, p.x - f.w / 2, p.y - f.d / 2, p.x + f.w / 2, p.y + f.d / 2);
  }
  return grid;
}

/** The cell holding a point, or −1 off the grid. */
export function cellAt(grid: WalkGrid, x: number, y: number): number {
  const c = Math.floor((x - grid.x0) / CELL);
  const r = Math.floor((y - grid.y0) / CELL);
  return c < 0 || r < 0 || c >= grid.width || r >= grid.height ? -1 : r * grid.width + c;
}

export function centreOf(grid: WalkGrid, cell: number): { x: number; y: number } {
  return { x: grid.x0 + ((cell % grid.width) + 0.5) * CELL, y: grid.y0 + (Math.floor(cell / grid.width) + 0.5) * CELL };
}

/** Where a building's door meets the sidewalk: the first cell out from its front. */
export const doorStep = (b: BuildingPlan): { x: number; y: number } => ({ x: b.door, y: b.y1 + CELL / 2 });

/**
 * The cells a walker can step to from a cell, eight ways: a diagonal only when both cells beside
 * it are open, so nobody cuts a building's corner. `out` is filled and the count returned.
 */
export function neighbours(grid: WalkGrid, cell: number, out: number[]): number {
  const { width, height, cost } = grid;
  const c = cell % width;
  const r = Math.floor(cell / width);
  const open = (cc: number, rr: number) =>
    cc >= 0 && rr >= 0 && cc < width && rr < height && (cost[rr * width + cc] as number) < Number.POSITIVE_INFINITY;
  let n = 0;
  for (const [dc, dr] of STEPS) {
    if (!open(c + dc, r + dr)) continue;
    if (dc !== 0 && dr !== 0 && !(open(c + dc, r) && open(c, r + dr))) continue;
    out[n++] = (r + dr) * width + c + dc;
  }
  return n;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/** Every cell a walker starting at `start` can reach: 1 for reached. */
export function reach(grid: WalkGrid, start: number): Uint8Array {
  const seen = new Uint8Array(grid.width * grid.height);
  if (start < 0 || (grid.cost[start] as number) === Number.POSITIVE_INFINITY) return seen;
  const queue = [start];
  seen[start] = 1;
  const next: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const count = neighbours(grid, queue[head] as number, next);
    for (let i = 0; i < count; i++) {
      const cell = next[i] as number;
      if (seen[cell]) continue;
      seen[cell] = 1;
      queue.push(cell);
    }
  }
  return seen;
}
