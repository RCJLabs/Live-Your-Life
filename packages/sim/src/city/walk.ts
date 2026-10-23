/**
 * The walk grid (M1.1): the block's ground in half-metre cells, each with what a step into it
 * costs, or no step at all under a building or a post. Tap-to-go (M1.6) walks it, and route
 * times are its routes' lengths (path.ts). It is worked out from the plan whenever it is needed,
 * never stored: Landnám's rule, if a fact can be computed it does not go in the save.
 */
import type { BlockPlan, BuildingPlan, StreetPlan } from './block.ts';
import type { FixturePlan } from './furnish.ts';
import type { InteriorPlan } from './interior.ts';
import { type DoorPlan, type Rect, roomAt, WALL } from './rooms.ts';
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
  /** Inside a building with an interior (M1.2). */
  floor: 1,
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
  /**
   * Where cells are counted from, if not the corner: a grid widened round a block (M2.1) counts
   * from the block's own corner, `col` and `row` cells in, so a point lands in the same cell as on
   * the block's own grid. Counting from a corner further off rounds otherwise at a cell's edge.
   */
  readonly anchor?: { readonly x: number; readonly y: number; readonly col: number; readonly row: number };
}

/** A point's column and row, unclamped, rounded down or up: from the grid's anchor if it has one. */
function colOf(grid: WalkGrid, x: number, up: boolean): number {
  const a = grid.anchor;
  const v = (x - (a ? a.x : grid.x0)) / CELL;
  return (up ? Math.ceil(v) : Math.floor(v)) + (a ? a.col : 0);
}
function rowOf(grid: WalkGrid, y: number, up: boolean): number {
  const a = grid.anchor;
  const v = (y - (a ? a.y : grid.y0)) / CELL;
  return (up ? Math.ceil(v) : Math.floor(v)) + (a ? a.row : 0);
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

/** Every cell a rectangle overlaps. Touching an edge is not overlapping, so a door's sidewalk stays open. */
function eachCell(grid: WalkGrid, x0: number, y0: number, x1: number, y1: number, fn: (cell: number) => void): void {
  const c0 = Math.max(0, colOf(grid, x0, false));
  const c1 = Math.min(grid.width - 1, colOf(grid, x1, true) - 1);
  const r0 = Math.max(0, rowOf(grid, y0, false));
  const r1 = Math.min(grid.height - 1, rowOf(grid, y1, true) - 1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) fn(r * grid.width + c);
}

function block(grid: WalkGrid, x0: number, y0: number, x1: number, y1: number): void {
  eachCell(grid, x0, y0, x1, y1, (cell) => {
    grid.cost[cell] = Number.POSITIVE_INFINITY;
  });
}

/**
 * Blocks a wall's cells, all but those whose middle lies in a doorway on its line. A doorway
 * narrower than two cells might hold no whole cell between its jambs; it always holds a middle.
 */
function blockWall(grid: WalkGrid, w: Rect, doors: readonly DoorPlan[]): void {
  const along = w.x1 - w.x0 >= w.y1 - w.y0 ? 'x' : 'y';
  const line = along === 'x' ? (w.y0 + w.y1) / 2 : (w.x0 + w.x1) / 2;
  const through = doors.filter((d) => d.along === along && Math.abs((along === 'x' ? d.y : d.x) - line) < WALL / 2);
  eachCell(grid, w.x0, w.y0, w.x1, w.y1, (cell) => {
    const c = centreOf(grid, cell);
    const at = along === 'x' ? c.x : c.y;
    if (through.some((d) => Math.abs(at - (along === 'x' ? d.x : d.y)) <= d.width / 2)) return;
    grid.cost[cell] = Number.POSITIVE_INFINITY;
  });
}

/** A building with an interior: its floor open, its walls and fixtures in the way, its doorways through. */
function openFloor(grid: WalkGrid, b: BuildingPlan, inside: InteriorPlan): void {
  eachCell(grid, b.x0, b.y0, b.x1, b.y1, (cell) => {
    grid.cost[cell] = GROUND_COST.floor;
  });
  const outer: Rect[] = [
    { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y0 + WALL },
    { x0: b.x0, y0: b.y1 - WALL, x1: b.x1, y1: b.y1 },
    { x0: b.x0, y0: b.y0, x1: b.x0 + WALL, y1: b.y1 },
    { x0: b.x1 - WALL, y0: b.y0, x1: b.x1, y1: b.y1 },
  ];
  for (const w of [...outer, ...inside.walls]) blockWall(grid, w, inside.doors);
  for (const f of inside.fixtures)
    if (f.blocks) block(grid, f.x - f.w / 2, f.y - f.d / 2, f.x + f.w / 2, f.y + f.d / 2);
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
  furnish(grid, plan);
  return grid;
}

/** The blocks round the home block (M2.1, D67), in its frame, for a walk grid that reaches them. */
export interface Around {
  /** The ground the grid covers. */
  readonly area: Rect;
  /** Each block's lots, edge to edge. */
  readonly blocks: readonly Rect[];
  /** How wide the sidewalk round a block is. */
  readonly sidewalk: number;
  /** Their buildings, which nobody walks through. */
  readonly solids: readonly Rect[];
}

/**
 * The home block's walk grid widened to the blocks round it (M2.1): the home block's own street
 * as walkGrid lays it, so its routes and the walk to work don't change; everywhere else a lot,
 * the sidewalk round it, or the roadway between. The grid's cells line up with the home block's.
 */
export function walkGridAround(plan: BlockPlan, around: Around): WalkGrid {
  const s = plan.street;
  const a = around.area;
  const x0 = s.xa - Math.ceil((s.xa - a.x0) / CELL) * CELL;
  const y0 = s.alley - Math.ceil((s.alley - a.y0) / CELL) * CELL;
  const width = Math.ceil((a.x1 - x0) / CELL);
  const height = Math.ceil((a.y1 - y0) / CELL);
  const cost = new Float64Array(width * height).fill(GROUND_COST.roadway);
  const anchor = { x: s.xa, y: s.alley, col: Math.round((s.xa - x0) / CELL), row: Math.round((s.alley - y0) / CELL) };
  const grid: WalkGrid = { x0, y0, width, height, cost, minCost: Math.min(...Object.values(GROUND_COST)), anchor };
  const paint = (r: Rect, ground: Ground) =>
    eachCell(grid, r.x0, r.y0, r.x1, r.y1, (cell) => {
      grid.cost[cell] = GROUND_COST[ground];
    });
  const w = around.sidewalk;
  for (const b of around.blocks) paint({ x0: b.x0 - w, y0: b.y0 - w, x1: b.x1 + w, y1: b.y1 + w }, 'sidewalk');
  for (const b of around.blocks) paint(b, 'lot');
  // The home block's street, row by row, as walkGrid lays it.
  for (let y = s.alley + CELL / 2; y < s.farCurb; y += CELL) {
    const ground = groundAt(s, y);
    eachCell(grid, s.xa, y - CELL / 4, s.xb, y + CELL / 4, (cell) => {
      grid.cost[cell] = GROUND_COST[ground];
    });
  }
  furnish(grid, plan);
  for (const r of around.solids) block(grid, r.x0, r.y0, r.x1, r.y1);
  return grid;
}

/** The block's buildings and props on its grid: interiors opened, the rest in the way. */
function furnish(grid: WalkGrid, plan: BlockPlan): void {
  for (const b of plan.buildings) {
    if (b.interior) openFloor(grid, b, b.interior);
    else block(grid, b.x0, b.y0, b.x1, b.y1);
  }
  for (const p of plan.props) {
    const f = FOOTPRINT[p.kind];
    block(grid, p.x - f.w / 2, p.y - f.d / 2, p.x + f.w / 2, p.y + f.d / 2);
  }
}

/** The cell holding a point, or −1 off the grid. */
export function cellAt(grid: WalkGrid, x: number, y: number): number {
  const c = colOf(grid, x, false);
  const r = rowOf(grid, y, false);
  return c < 0 || r < 0 || c >= grid.width || r >= grid.height ? -1 : r * grid.width + c;
}

export function centreOf(grid: WalkGrid, cell: number): { x: number; y: number } {
  const a = grid.anchor ?? { x: grid.x0, y: grid.y0, col: 0, row: 0 };
  return {
    x: a.x + ((cell % grid.width) - a.col + 0.5) * CELL,
    y: a.y + (Math.floor(cell / grid.width) - a.row + 0.5) * CELL,
  };
}

/** Where a building's door meets the sidewalk: the first cell out from its front. */
export const doorStep = (b: BuildingPlan): { x: number; y: number } => ({ x: b.door, y: b.y1 + CELL / 2 });

/** How far from where a person stands to use a fixture the cell a route ends in may be, in metres (tune). */
const USE_REACH = 1;

/**
 * The cell a route to a fixture ends in: the open cell nearest where its user stands, on that side
 * of it, in its room and within `USE_REACH`; −1 if there is none.
 */
export function useCell(grid: WalkGrid, inside: InteriorPlan, f: FixturePlan): number {
  const u = f.use;
  if (!u) return -1;
  const edge = { n: f.y - f.d / 2, s: f.y + f.d / 2, w: f.x - f.w / 2, e: f.x + f.w / 2 }[u.from];
  let best = -1;
  let nearest = USE_REACH * USE_REACH;
  eachCell(grid, u.x - USE_REACH, u.y - USE_REACH, u.x + USE_REACH, u.y + USE_REACH, (cell) => {
    if ((grid.cost[cell] as number) === Number.POSITIVE_INFINITY) return;
    const c = centreOf(grid, cell);
    const past = { n: c.y < edge, s: c.y > edge, w: c.x < edge, e: c.x > edge }[u.from];
    if (!past || roomAt(inside.rooms, c.x, c.y)?.id !== f.room) return;
    const far = (c.x - u.x) * (c.x - u.x) + (c.y - u.y) * (c.y - u.y);
    if (far < nearest) {
      nearest = far;
      best = cell;
    }
  });
  return best;
}

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
