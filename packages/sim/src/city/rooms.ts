/**
 * A building's ground floor as rooms (M1.2): rectangles laid out from the interior record's
 * edges, a later room cut out of the earlier ones it overlaps; the inside walls where rooms meet;
 * and the doors, cut out of those walls. All in the block's metres, inside the outside walls.
 */
import type { Rng } from '@eb/core';
import type { DoorRecord, Edge, Facing, FloorKind, InteriorRecord, RoomRecord } from './interiorRecords.ts';

/** Every wall's thickness, inside and out: the stage's `WALL`, which a test holds this to. */
export const WALL = 0.15;
/** The front door's opening, as the stage cuts it; and an inside door's, unless its record says. */
export const FRONT_DOOR = 1;
export const DOOR = 0.9;
/** What lies past a way out. */
export const OUTSIDE = 'outside';
const EPS = 1e-6;
/** How far across a wall to look for the room on the other side. */
const PROBE = 0.3;

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The floor inside the outside walls, and the front door's x. */
export interface Frame extends Rect {
  readonly door: number;
}

export const frameOf = (b: Rect & { readonly door: number }): Frame => ({
  x0: b.x0 + WALL,
  y0: b.y0 + WALL,
  x1: b.x1 - WALL,
  y1: b.y1 - WALL,
  door: b.door,
});

export interface RoomPlan extends Rect {
  readonly id: string;
  readonly template: string;
  readonly floor: FloorKind;
  readonly wall: string;
  readonly mirror: boolean;
  /** Inside its own walls: where its fixtures are placed. */
  readonly inner: Rect;
}

/** A stretch of inside wall, its doorways already cut out. */
export interface WallPlan extends Rect {
  /** The colour of the side the camera sees: the room south of a wall that runs east-west, east of one that runs north-south. */
  readonly face: string;
}

export interface DoorPlan {
  /** The middle of its opening, on its wall's middle line. */
  readonly x: number;
  readonly y: number;
  /** Which way its wall runs. */
  readonly along: 'x' | 'y';
  readonly width: number;
  /** The room its record puts it in. */
  readonly room: string;
  /** The rooms found either side of it, that room's first; `outside` past a way out. */
  readonly rooms: readonly [string, string];
  /** For a way out, which outside wall it is in. */
  readonly wall?: Facing;
}

const edgeX = (f: Frame, e: Edge): number => (e.from === 'west' ? f.x0 : e.from === 'east' ? f.x1 : f.door) + e.by;
const edgeY = (f: Frame, e: Edge): number => (e.from === 'back' ? f.y0 : f.y1) + e.by;

export function roomsOf(t: InteriorRecord, records: ReadonlyMap<string, RoomRecord>, f: Frame, rng: Rng): RoomPlan[] {
  const half = WALL / 2;
  return t.rooms.map((p) => {
    const rect = { x0: edgeX(f, p.west), y0: edgeY(f, p.back), x1: edgeX(f, p.east), y1: edgeY(f, p.front) };
    const r = records.get(p.room) as RoomRecord;
    // An edge inside the floor is a wall between rooms, half of it on this side.
    const inner = {
      x0: rect.x0 + (rect.x0 > f.x0 + EPS ? half : 0),
      y0: rect.y0 + (rect.y0 > f.y0 + EPS ? half : 0),
      x1: rect.x1 - (rect.x1 < f.x1 - EPS ? half : 0),
      y1: rect.y1 - (rect.y1 < f.y1 - EPS ? half : 0),
    };
    const wall = rng.fork(p.id).pick(r.walls);
    return { id: p.id, template: p.room, floor: r.floor, wall, mirror: p.mirror ?? false, ...rect, inner };
  });
}

/** The room a point is in: the last that holds it, as later rooms are cut out of earlier ones. */
export function roomAt(rooms: readonly RoomPlan[], x: number, y: number): RoomPlan | undefined {
  for (let i = rooms.length - 1; i >= 0; i--) {
    const r = rooms[i] as RoomPlan;
    if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return r;
  }
  return undefined;
}

const across = (rooms: readonly RoomPlan[], along: 'x' | 'y', at: number, pos: number, by: number): string =>
  (along === 'x' ? roomAt(rooms, pos, at + by) : roomAt(rooms, at + by, pos))?.id ?? OUTSIDE;

function doorOf(d: DoorRecord, rooms: readonly RoomPlan[], f: Frame): DoorPlan {
  const r = rooms.find((room) => room.id === d.room) as RoomPlan;
  const along = d.side === 'n' || d.side === 's' ? 'x' : 'y';
  const pos = along === 'x' ? r.x0 + d.at * (r.x1 - r.x0) : r.y0 + d.at * (r.y1 - r.y0);
  const line = { n: r.y0, s: r.y1, w: r.x0, e: r.x1 }[d.side];
  const out = d.side === 'n' || d.side === 'w' ? -1 : 1;
  const bound = { n: f.y0, s: f.y1, w: f.x0, e: f.x1 }[d.side];
  const way = Math.abs(line - bound) < EPS;
  // A way out sits on its outside wall's middle line; an inside door on the line between rooms.
  const at = way ? line + (out * WALL) / 2 : line;
  return {
    x: along === 'x' ? pos : at,
    y: along === 'x' ? at : pos,
    along,
    width: d.width ?? DOOR,
    room: d.room,
    rooms: [
      across(rooms, along, line, pos, -out * PROBE),
      way ? OUTSIDE : across(rooms, along, line, pos, out * PROBE),
    ],
    ...(way ? { wall: d.side } : {}),
  };
}

/** The building's front door, then its record's doors. */
export function doorsOf(t: InteriorRecord, rooms: readonly RoomPlan[], f: Frame): DoorPlan[] {
  const entry = roomAt(rooms, f.door, f.y1 - PROBE)?.id ?? OUTSIDE;
  const front: DoorPlan = {
    x: f.door,
    y: f.y1 + WALL / 2,
    along: 'x',
    width: FRONT_DOOR,
    room: entry,
    rooms: [entry, OUTSIDE],
    wall: 's',
  };
  return [front, ...t.doors.map((d) => doorOf(d, rooms, f))];
}

type Spans = [number, number][];

/** Cuts [a, b] out of a list of stretches. */
function cut(spans: Spans, a: number, b: number): Spans {
  return spans.flatMap(([s, e]): Spans => {
    if (b <= s || a >= e) return [[s, e]];
    const kept: Spans = [];
    if (a > s) kept.push([s, a]);
    if (b < e) kept.push([b, e]);
    return kept;
  });
}

function merge(spans: Spans): Spans {
  const sorted = [...spans].sort((p, q) => p[0] - q[0]);
  const out: Spans = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1] + EPS) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

interface Line {
  readonly along: 'x' | 'y';
  readonly at: number;
  spans: Spans;
}

/** Every room's edges inside the floor, less any stretch that runs through a later room, merged by line. */
function wallLines(rooms: readonly RoomPlan[], f: Frame): Map<string, Line> {
  const lines = new Map<string, Line>();
  rooms.forEach((r, i) => {
    const edges: { along: 'x' | 'y'; at: number; from: number; to: number }[] = [];
    if (r.y0 > f.y0 + EPS) edges.push({ along: 'x', at: r.y0, from: r.x0, to: r.x1 });
    if (r.y1 < f.y1 - EPS) edges.push({ along: 'x', at: r.y1, from: r.x0, to: r.x1 });
    if (r.x0 > f.x0 + EPS) edges.push({ along: 'y', at: r.x0, from: r.y0, to: r.y1 });
    if (r.x1 < f.x1 - EPS) edges.push({ along: 'y', at: r.x1, from: r.y0, to: r.y1 });
    for (const e of edges) {
      let spans: Spans = [[e.from, e.to]];
      for (const later of rooms.slice(i + 1)) {
        const through =
          e.along === 'x'
            ? e.at > later.y0 + EPS && e.at < later.y1 - EPS
            : e.at > later.x0 + EPS && e.at < later.x1 - EPS;
        if (through) spans = e.along === 'x' ? cut(spans, later.x0, later.x1) : cut(spans, later.y0, later.y1);
      }
      const key = `${e.along}:${e.at.toFixed(6)}`;
      const line = lines.get(key) ?? { along: e.along, at: e.at, spans: [] };
      line.spans.push(...spans);
      lines.set(key, line);
    }
  });
  for (const line of lines.values()) line.spans = merge(line.spans);
  return lines;
}

/** The inside walls as stretches, each doorway cut out of its line. */
export function wallsOf(rooms: readonly RoomPlan[], doors: readonly DoorPlan[], f: Frame): WallPlan[] {
  const lines = wallLines(rooms, f);
  for (const d of doors) {
    if (d.wall) continue;
    const line = lines.get(`${d.along}:${(d.along === 'x' ? d.y : d.x).toFixed(6)}`);
    const mid = d.along === 'x' ? d.x : d.y;
    if (line) line.spans = cut(line.spans, mid - d.width / 2, mid + d.width / 2);
  }
  const half = WALL / 2;
  const walls: WallPlan[] = [];
  for (const { along, at, spans } of lines.values()) {
    for (const [s, e] of spans) {
      if (e - s < EPS) continue;
      const mid = (s + e) / 2;
      const facing = along === 'x' ? roomAt(rooms, mid, at + PROBE) : roomAt(rooms, at + PROBE, mid);
      const face = facing?.wall ?? (rooms[0] as RoomPlan).wall;
      walls.push(
        along === 'x'
          ? { x0: s, y0: at - half, x1: e, y1: at + half, face }
          : { x0: at - half, y0: s, x1: at + half, y1: e, face },
      );
    }
  }
  return walls;
}
