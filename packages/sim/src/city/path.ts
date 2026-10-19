/**
 * Routes on the walk grid: weighted A*, ported from 2060TD's `src/sim/pathfinding.ts`. A step
 * costs its length times the ground it enters, and the heap breaks ties by f, then h, then cell,
 * so the same grid always gives the same route. Two changes from the port: eight neighbours, so a
 * route's length is a walker's and not a rook's, with no corner cut past a blocked cell
 * (walk.ts, `neighbours`); and no walls to break through.
 */
import { CELL, neighbours, type WalkGrid } from './walk.ts';

export interface Route {
  /** From the start to the goal reached, both included. */
  readonly cells: readonly number[];
  /** Metres, each step weighted by its ground. */
  readonly cost: number;
  /** Metres walked. */
  readonly metres: number;
}

/**
 * A binary min-heap of (f, h, cell), ordered by f, then h, then cell: fully deterministic
 * (2060TD's OpenHeap). Each entry keeps the keys it was pushed with. 2060TD's read them from the
 * shared f and h arrays, so a cell whose cost fell after it was pushed changed its old entry's key
 * in place, broke the heap's order, and could let A* settle for a longer route: the seeded test
 * below Dijkstra caught one 4% long. A stale entry is now skipped when it comes out.
 */
class OpenHeap {
  private readonly fs: number[] = [];
  private readonly hs: number[] = [];
  private readonly cells: number[] = [];

  get size(): number {
    return this.cells.length;
  }

  private less(i: number, j: number): boolean {
    const fi = this.fs[i] as number;
    const fj = this.fs[j] as number;
    if (fi !== fj) return fi < fj;
    const hi = this.hs[i] as number;
    const hj = this.hs[j] as number;
    return hi !== hj ? hi < hj : (this.cells[i] as number) < (this.cells[j] as number);
  }

  private swap(i: number, j: number): void {
    for (const list of [this.fs, this.hs, this.cells]) {
      const t = list[i] as number;
      list[i] = list[j] as number;
      list[j] = t;
    }
  }

  push(f: number, h: number, cell: number): void {
    this.fs.push(f);
    this.hs.push(h);
    this.cells.push(cell);
    for (let i = this.cells.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** The cell with the least keys, and the f it was pushed with. */
  pop(): { cell: number; f: number } {
    const top = { cell: this.cells[0] as number, f: this.fs[0] as number };
    const end = this.cells.length - 1;
    this.swap(0, end);
    this.fs.pop();
    this.hs.pop();
    this.cells.pop();
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      let smallest = i;
      if (l < this.cells.length && this.less(l, smallest)) smallest = l;
      if (l + 1 < this.cells.length && this.less(l + 1, smallest)) smallest = l + 1;
      if (smallest === i) return top;
      this.swap(i, smallest);
      i = smallest;
    }
  }
}

const DIAGONAL = Math.SQRT2 * CELL;

/** The length of a step between two neighbouring cells. */
const stepLength = (grid: WalkGrid, a: number, b: number): number =>
  a % grid.width !== b % grid.width && Math.floor(a / grid.width) !== Math.floor(b / grid.width) ? DIAGONAL : CELL;

/**
 * The cheapest route from `start` to the nearest of `goals`, or null when none can be reached.
 * The estimate is the octile distance at the cheapest ground on the grid: an estimate above the
 * true cost would let A* settle for a longer route without saying so (2060TD's note on it).
 */
export function route(grid: WalkGrid, start: number, goals: number | readonly number[]): Route | null {
  const size = grid.width * grid.height;
  const open = (c: number) => c >= 0 && c < size && (grid.cost[c] as number) < Number.POSITIVE_INFINITY;
  const goalList = (typeof goals === 'number' ? [goals] : goals).filter(open);
  if (!open(start) || goalList.length === 0) return null;
  const goalSet = new Set(goalList);
  const estimate = (cell: number): number => {
    let best = Number.POSITIVE_INFINITY;
    for (const goal of goalList) {
      const dx = Math.abs((cell % grid.width) - (goal % grid.width));
      const dy = Math.abs(Math.floor(cell / grid.width) - Math.floor(goal / grid.width));
      best = Math.min(best, (Math.max(dx, dy) - Math.min(dx, dy)) * CELL + Math.min(dx, dy) * DIAGONAL);
    }
    return best * grid.minCost;
  };
  const g = new Float64Array(size).fill(Number.POSITIVE_INFINITY);
  const from = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const heap = new OpenHeap();
  g[start] = 0;
  heap.push(estimate(start), estimate(start), start);
  const next: number[] = [];
  while (heap.size > 0) {
    const { cell: current } = heap.pop();
    if (closed[current]) continue;
    closed[current] = 1;
    if (goalSet.has(current)) return traced(grid, from, current, g[current] as number);
    const count = neighbours(grid, current, next);
    for (let i = 0; i < count; i++) {
      const cell = next[i] as number;
      if (closed[cell]) continue;
      const tentative = (g[current] as number) + stepLength(grid, current, cell) * (grid.cost[cell] as number);
      if (tentative >= (g[cell] as number)) continue;
      g[cell] = tentative;
      from[cell] = current;
      const h = estimate(cell);
      heap.push(tentative + h, h, cell);
    }
  }
  return null;
}

function traced(grid: WalkGrid, from: Int32Array, end: number, cost: number): Route {
  const cells: number[] = [];
  for (let c = end; c !== -1; c = from[c] as number) cells.push(c);
  cells.reverse();
  let metres = 0;
  for (let i = 1; i < cells.length; i++) metres += stepLength(grid, cells[i - 1] as number, cells[i] as number);
  return { cells, cost, metres };
}
