/**
 * Who sees where in a shop (M1.5, D45): the cells a clerk at the till and a camera can see, along
 * straight lines on the walk grid, stopped by walls and by anything tall enough to hide someone.
 * A counter is low, so a clerk sees over it. Worked out from the plan, never stored.
 *
 * A line from one cell to another passes, at each step along its longer axis, through the cell
 * its exact position rounds to, half up: integer arithmetic, so it is the same everywhere.
 */
import type { BlockPlan, BuildingPlan } from './block.ts';
import type { FixturePlan } from './furnish.ts';
import type { InteriorPlan } from './interior.ts';
import type { FixtureRecord, InteriorTemplates, WatchRecord } from './interiorRecords.ts';
import type { Rect } from './rooms.ts';
import { WALL } from './rooms.ts';
import type { Facing } from './street.ts';
import { CELL, cellAt, useCell, type WalkGrid, walkGrid } from './walk.ts';

/** How far out from a shelf's front someone stands to take from it, in metres (tune). */
export const REACH = 0.35;

export interface Watcher {
  readonly id: string;
  readonly cell: number;
  readonly who: WatchRecord['who'];
  readonly field: WatchRecord['field'];
  readonly facing: Facing;
  /** Its range in cells, squared. */
  readonly reach2: number;
}

export interface Spot {
  /** The shelf's fixture id. */
  readonly id: string;
  readonly stock: string;
  readonly cell: number;
  /** The watchers who can see it, by id. */
  readonly seenBy: readonly string[];
}

export interface ShopSight {
  readonly building: string;
  readonly watchers: readonly Watcher[];
  readonly spots: readonly Spot[];
}

const overlaps = (grid: WalkGrid, cell: number, r: Rect): boolean => {
  const x = grid.x0 + (cell % grid.width) * CELL;
  const y = grid.y0 + Math.floor(cell / grid.width) * CELL;
  return x < r.x1 && x + CELL > r.x0 && y < r.y1 && y + CELL > r.y0;
};

const footprint = (f: FixturePlan): Rect => ({
  x0: f.x - f.w / 2,
  y0: f.y - f.d / 2,
  x1: f.x + f.w / 2,
  y1: f.y + f.d / 2,
});

/**
 * The cells that stop sight in a building: closed cells under a wall or something tall. A cell
 * closed only by something low, a counter, lets sight through.
 */
function opaqueIn(grid: WalkGrid, b: BuildingPlan, inside: InteriorPlan, fixtures: ReadonlyMap<string, FixtureRecord>) {
  const outer: Rect[] = [
    { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y0 + WALL },
    { x0: b.x0, y0: b.y1 - WALL, x1: b.x1, y1: b.y1 },
    { x0: b.x0, y0: b.y0, x1: b.x0 + WALL, y1: b.y1 },
    { x0: b.x1 - WALL, y0: b.y0, x1: b.x1, y1: b.y1 },
  ];
  const record = (f: FixturePlan) => fixtures.get(f.template) as FixtureRecord;
  const tall = [...outer, ...inside.walls, ...inside.fixtures.filter((f) => record(f).screens).map(footprint)];
  const low = inside.fixtures.filter((f) => f.blocks && !record(f).screens).map(footprint);
  const opaque = new Uint8Array(grid.width * grid.height);
  for (let cell = 0; cell < opaque.length; cell++) {
    if ((grid.cost[cell] as number) !== Number.POSITIVE_INFINITY) continue;
    const seeThrough = !tall.some((r) => overlaps(grid, cell, r)) && low.some((r) => overlaps(grid, cell, r));
    if (!seeThrough) opaque[cell] = 1;
  }
  return opaque;
}

/** a ÷ b rounded half up, for b > 0. */
const halfUp = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

/** Whether nothing opaque stands between two cells, the cells themselves not counted. */
export function clear(grid: WalkGrid, opaque: Uint8Array, from: number, to: number): boolean {
  const c0 = from % grid.width;
  const r0 = Math.floor(from / grid.width);
  const dc = (to % grid.width) - c0;
  const dr = Math.floor(to / grid.width) - r0;
  const n = Math.max(Math.abs(dc), Math.abs(dr));
  for (let i = 1; i < n; i++) {
    const cell = (r0 + halfUp(i * dr, n)) * grid.width + c0 + halfUp(i * dc, n);
    if (opaque[cell]) return false;
  }
  return true;
}

/** Whether a cell lies in a watcher's field and range, before what stands between. */
export function inField(grid: WalkGrid, w: Watcher, cell: number): boolean {
  const dc = (cell % grid.width) - (w.cell % grid.width);
  const dr = Math.floor(cell / grid.width) - Math.floor(w.cell / grid.width);
  if (dc * dc + dr * dr > w.reach2) return false;
  if (w.field === 'around') return true;
  const [ahead, side]: readonly [number, number] = { n: [-dr, dc], s: [dr, dc], e: [dc, dr], w: [-dc, dr] }[
    w.facing
  ] as [number, number];
  return ahead >= Math.abs(side);
}

function watchersOf(grid: WalkGrid, inside: InteriorPlan, fixtures: ReadonlyMap<string, FixtureRecord>): Watcher[] {
  return inside.fixtures.flatMap((f) => {
    const watch = (fixtures.get(f.template) as FixtureRecord).watch;
    if (!watch) return [];
    const cell = watch.from === 'use' ? useCell(grid, inside, f) : cellAt(grid, f.x, f.y);
    if (cell < 0) throw new Error(`${f.id}: nowhere to watch from`);
    const reach = Math.floor(watch.range / CELL);
    return [{ id: f.id, cell, who: watch.who, field: watch.field, facing: f.facing, reach2: reach * reach }];
  });
}

const FORWARD: Readonly<Record<Facing, readonly [number, number]>> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/** Where someone stands to take from a shelf: the open cell nearest a step out from its front. */
function spotCell(grid: WalkGrid, inside: InteriorPlan, f: FixturePlan): number {
  const [dx, dy] = FORWARD[f.facing];
  const out = (dx !== 0 ? f.w : f.d) / 2 + REACH;
  const use = { x: f.x + dx * out, y: f.y + dy * out, from: f.facing, serves: [], pose: 'stand' } as const;
  return useCell(grid, inside, { ...f, use });
}

/** The shop on a block: its watchers, and each shelf's spot with who sees it. Null if it has no watchers. */
export function shopSight(t: InteriorTemplates, plan: BlockPlan, grid: WalkGrid = walkGrid(plan)): ShopSight | null {
  const b = plan.buildings.find((x) => x.interior?.fixtures.some((f) => t.fixtures.get(f.template)?.watch));
  if (!b?.interior) return null;
  const inside = b.interior;
  const opaque = opaqueIn(grid, b, inside, t.fixtures);
  const watchers = watchersOf(grid, inside, t.fixtures);
  const spots = inside.fixtures.flatMap((f) => {
    const stock = (t.fixtures.get(f.template) as FixtureRecord).stock;
    if (!stock) return [];
    const cell = spotCell(grid, inside, f);
    if (cell < 0) throw new Error(`${f.id}: nowhere to stand at it`);
    const seenBy = watchers.filter((w) => inField(grid, w, cell) && clear(grid, opaque, w.cell, cell)).map((w) => w.id);
    return [{ id: f.id, stock, cell, seenBy }];
  });
  return { building: b.id, watchers, spots };
}

/** For the reference check in tests: the opaque cells of the shop. */
export function opaqueOf(t: InteriorTemplates, plan: BlockPlan, grid: WalkGrid): Uint8Array | null {
  const b = plan.buildings.find((x) => x.interior?.fixtures.some((f) => t.fixtures.get(f.template)?.watch));
  return b?.interior ? opaqueIn(grid, b, b.interior, t.fixtures) : null;
}
