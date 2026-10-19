/**
 * The walker on the commute (D36): a person from the seed who gets up in one of the walk-up's
 * flats, walks to the diner's griddle, cooks a while, walks home and sleeps, round and round, on the walk
 * grid's routes. Where they are is worked out from the stage's seconds each frame, never stepped,
 * so a moment is always the same place. They walk at the spike's pace in stage seconds, not the
 * game's minutes, until M1.6 settles how walking time and the clock relate (D36).
 */
import { Rng } from '@eb/core';
import {
  type BlockPlan,
  type BuildingPlan,
  CELL,
  centreOf,
  type DoorPlan,
  type FixturePlan,
  route,
  useCell,
  type WalkGrid,
} from '@lyl/sim';
import { type Actor, type Building, box, hiding, type Look } from '@lyl/stage';

/** Metres a stage second: the spike's walkers' (spike/actors.ts). */
export const WALK_SPEED = 1.3;
/** Metres a full stride covers: two steps. */
const STRIDE = 1.4;
/** Stage seconds asleep and at the griddle, each time round (tune). */
const SLEEP = 8;
const COOK = 10;

export type Doing = 'sleep' | 'walk' | 'cook';

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface Leg {
  readonly doing: Doing;
  /** Stage seconds into the round it starts and ends. */
  readonly from: number;
  readonly to: number;
  /** A walk's way, from where they get up to where they stand to cook, or back. */
  readonly path?: readonly Pt[];
}

export interface Commute {
  readonly unit: string;
  readonly bed: FixturePlan;
  readonly griddle: FixturePlan;
  readonly legs: readonly Leg[];
  /** Stage seconds for a whole round. */
  readonly round: number;
  /** Metres from the bed to the griddle on the way there. */
  readonly metres: number;
}

export const length = (path: readonly Pt[]): number =>
  path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - (path[i] as Pt).x, p.y - (path[i] as Pt).y), 0);

/**
 * A point in or beside a doorway, moved across to its middle. A route's cells can pass a doorway
 * anywhere along its opening; walking its middle keeps a person clear of both jambs, and so out of
 * the walls' boxes, which the depth sort could otherwise draw in front of them.
 */
export function throughMiddle(p: Pt, doors: readonly DoorPlan[]): Pt {
  for (const d of doors) {
    if (d.along === 'x' && Math.abs(p.y - d.y) < CELL && Math.abs(p.x - d.x) <= d.width / 2) return { x: d.x, y: p.y };
    if (d.along === 'y' && Math.abs(p.x - d.x) < CELL && Math.abs(p.y - d.y) <= d.width / 2) return { x: p.x, y: d.y };
  }
  return p;
}

/** The walk-up's flat, chosen by the seed, and its bed; the diner's griddle; the routes between. */
export function commuteFor(plan: BlockPlan, grid: WalkGrid, seed: string): Commute | null {
  const flat = plan.buildings.find((b) => b.interior?.template === 'walk-up');
  const diner = plan.buildings.find((b) => b.interior?.template === 'diner');
  const homes = flat?.interior?.units ?? [];
  if (!flat?.interior || !diner?.interior || homes.length === 0) return null;
  const unit = Rng.create(`walker:${seed}`).pick(homes);
  const bed = flat.interior.fixtures.find((f) => unit.rooms.includes(f.room) && f.use?.serves.includes('sleep'));
  const griddle = diner.interior.fixtures.find((f) => f.id.endsWith('/griddle'));
  if (!bed?.use || !griddle?.use) return null;
  const start = useCell(grid, flat.interior, bed);
  const end = useCell(grid, diner.interior, griddle);
  const there = start >= 0 && end >= 0 ? route(grid, start, end) : null;
  const back = there ? route(grid, end, start) : null;
  if (!there || !back) return null;
  const doors = plan.buildings.flatMap((b) => b.interior?.doors ?? []);
  const cells = (r: typeof there) => r.cells.map((c) => throughMiddle(centreOf(grid, c), doors));
  const out = [bed.use, ...cells(there), griddle.use];
  const home = [griddle.use, ...cells(back), bed.use];
  const walkOut = length(out) / WALK_SPEED;
  const walkHome = length(home) / WALK_SPEED;
  // The round starts as they get up, so the block opens with someone walking.
  const cooked = walkOut + COOK;
  const atHome = cooked + walkHome;
  const legs: Leg[] = [
    { doing: 'walk', from: 0, to: walkOut, path: out },
    { doing: 'cook', from: walkOut, to: cooked },
    { doing: 'walk', from: cooked, to: atHome, path: home },
    { doing: 'sleep', from: atHome, to: atHome + SLEEP },
  ];
  return { unit: unit.id, bed, griddle, legs, round: (legs[3] as Leg).to, metres: length(out) };
}

/** Where along a way someone is, `s` metres in, and which way they face. */
export function along(path: readonly Pt[], s: number): { x: number; y: number; yaw: number } {
  let left = s;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Pt;
    const b = path[i] as Pt;
    const step = Math.hypot(b.x - a.x, b.y - a.y);
    if (step === 0) continue;
    const yaw = Math.atan2(b.y - a.y, b.x - a.x);
    if (left <= step) return { x: a.x + ((b.x - a.x) * left) / step, y: a.y + ((b.y - a.y) * left) / step, yaw };
    left -= step;
  }
  const last = path[path.length - 1] as Pt;
  const before = path[path.length - 2] ?? last;
  return { x: last.x, y: last.y, yaw: Math.atan2(last.y - before.y, last.x - before.x) };
}

export const legAt = (c: Commute, t: number): Leg => {
  const u = ((t % c.round) + c.round) % c.round;
  return c.legs.find((l) => u >= l.from && u < l.to) ?? (c.legs[0] as Leg);
};

/** The walker as the stage draws them at stage time t. */
export function walkerAt(c: Commute, look: Look, t: number): Actor {
  const leg = legAt(c, t);
  const base = { id: 'walker', look, z: 0 };
  if (leg.doing === 'sleep') {
    return { ...base, x: c.bed.x, y: c.bed.y, yaw: 0, pose: { kind: 'lie', t }, bubble: 'sleep', bed: c.bed.id };
  }
  if (leg.doing === 'cook') {
    const at = c.griddle.use as Pt;
    const yaw = Math.atan2(c.griddle.y - at.y, c.griddle.x - at.x);
    return { ...base, x: at.x, y: at.y, yaw, pose: { kind: 'cook', t }, bubble: null };
  }
  const u = ((t % c.round) + c.round) % c.round;
  const walked = (u - leg.from) * WALK_SPEED;
  const p = along(leg.path ?? [], walked);
  return {
    ...base,
    x: p.x,
    y: p.y,
    yaw: p.yaw,
    pose: { kind: 'walk', t, stride: (walked / STRIDE) % 1 },
    bubble: null,
  };
}

/** The building whose walls someone stands within, if any. */
export const insideOf = (plan: BlockPlan, x: number, y: number): BuildingPlan | undefined =>
  plan.buildings.find((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);

/** Half a person's footprint, as the stage sorts them. */
const HALF = 0.18;

/**
 * What is cut away with someone in the block: every interior with the walls down; otherwise the
 * building they stand in and any they are behind, if it has an interior to show (DESIGN.md, Interiors).
 */
export function cutFor(
  plan: BlockPlan,
  buildings: readonly Building[],
  who: Actor | undefined,
  down: boolean,
): Set<string> {
  const open = buildings.filter((b) => b.interior);
  if (down) return new Set(open.map((b) => b.id));
  if (!who) return new Set();
  const cut = new Set(hiding(open, box(who.x - HALF, who.y - HALF, 0, who.x + HALF, who.y + HALF, who.look.height)));
  const inside = insideOf(plan, who.x, who.y);
  if (inside?.interior) cut.add(inside.id);
  return cut;
}
