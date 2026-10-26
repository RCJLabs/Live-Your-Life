/**
 * The city's buses (M2.9 step 2, D118). A route runs along every arterial, both ways, with stops
 * at the record's spacing; buses leave each end of the line on the timetable and run at its speed,
 * stops included. A trip walks to a stop on an arterial beside you, waits for the next bus, rides,
 * changes once where two arterials cross if it must, and walks on: the fastest such way. Walking
 * is along the street grid, so a walk's metres are the blocks' (east–west plus north–south). The
 * sim and the page both read the trip from here, so the minutes and fare shown are the ones taken.
 */
import type { RecordStore } from '@eb/core';
import type { WEEKDAYS } from '../calendar.ts';

export const TRANSIT = 'ridgefield';

/** Metres a game minute on foot: about 1.3 m a second (D119; CALIBRATION.md). */
export const WALK_PACE = 80;

export interface Transit {
  readonly name: string;
  readonly fare: number;
  readonly dayCap: number;
  readonly transfer: number;
  readonly stops: number;
  readonly speed: number;
  readonly service: readonly {
    readonly days: readonly string[];
    readonly from: number;
    readonly to: number;
    readonly every: number;
  }[];
  /** A ride hailed from a phone (rideshare.ts); absent in a pack from before it. */
  readonly rideshare?: {
    readonly base: number;
    readonly booking: number;
    readonly perKm: number;
    readonly perMinute: number;
    readonly minimum: number;
    readonly wait: number;
    readonly speed: number;
  };
}

export const transitOf = (store: RecordStore): Transit | null => store.get<Transit>('transit', TRANSIT) ?? null;

/** The city's extent and its arterials' spacing, in metres. */
export interface Grid {
  readonly size: number;
  readonly every: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A line: an arterial, east–west (`row`, y fixed) or north–south (`col`, x fixed). */
interface Line {
  readonly row: boolean;
  readonly at: number;
}

export interface BusTrip {
  /** Game minutes: to the stop, waiting, riding, waiting to change, and from the last stop. */
  readonly walkTo: number;
  readonly wait: number;
  readonly ride: number;
  readonly change: number;
  readonly walkFrom: number;
  /** All of it, rounded up to the minute. */
  readonly minutes: number;
  /** Buses taken, and fares paid: a change outside the transfer window is a second fare. */
  readonly buses: number;
  readonly fares: number;
}

type Day = (typeof WEEKDAYS)[number];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const along = (l: Line, p: Point) => (l.row ? p.x : p.y);
const across = (l: Line, p: Point) => (l.row ? p.y : p.x);

/** The arterials either side of a point, along each axis. */
function linesBy(g: Grid, p: Point): Line[] {
  const out: Line[] = [];
  for (const row of [true, false]) {
    const v = row ? p.y : p.x;
    const below = clamp(Math.floor(v / g.every) * g.every, 0, g.size);
    for (const at of new Set([below, clamp(below + g.every, 0, g.size)])) out.push({ row, at });
  }
  return out;
}

/** The stop on a line nearest a point, as a distance along the line. */
const stopNear = (t: Transit, g: Grid, l: Line, p: Point) =>
  clamp(Math.round(along(l, p) / t.stops) * t.stops, 0, g.size);
/** Minutes on foot from a point to a stop on a line. */
const walkTo = (l: Line, s: number, p: Point) =>
  (Math.abs(along(l, p) - s) + Math.abs(across(l, p) - l.at)) / WALK_PACE;

/**
 * The next bus at a stop `offset` minutes from the end it leaves, at or after minute `t` of the
 * day: its minute at the stop, or null if none runs again today.
 */
function nextBus(t: Transit, day: Day, offset: number, at: number): number | null {
  let best: number | null = null;
  for (const s of t.service) {
    if (!s.days.includes(day)) continue;
    const start = s.from * 60 + offset;
    const k = Math.max(0, Math.ceil((at - start) / s.every));
    const when = start + k * s.every;
    if (when - offset < s.to * 60 && (best === null || when < best)) best = when;
  }
  return best;
}

/** A ride along a line from one stop to another: the bus's minute there, and when it gets in. */
function ride(
  t: Transit,
  g: Grid,
  day: Day,
  from: number,
  to: number,
  at: number,
): { board: number; off: number } | null {
  if (from === to) return null;
  // Toward the line's far end the bus left its near end; the other way, its far end.
  const offset = (to > from ? from : g.size - from) / t.speed;
  const board = nextBus(t, day, offset, at);
  return board === null ? null : { board, off: board + Math.abs(to - from) / t.speed };
}

/**
 * The fastest trip by bus from `a` to `b`, leaving at minute `at` of `day`, or null if no bus
 * serves it today (the last has gone, or none runs nearer than walking all the way).
 */
export function busTrip(t: Transit, g: Grid, a: Point, b: Point, day: Day, at: number): BusTrip | null {
  let best: BusTrip | null = null;
  const consider = (trip: BusTrip) => {
    if (!best || trip.minutes < best.minutes) best = trip;
  };
  for (const first of linesBy(g, a)) {
    const s0 = stopNear(t, g, first, a);
    const w0 = walkTo(first, s0, a);
    // One bus: the same line runs near both ends.
    for (const last of linesBy(g, b)) {
      if (last.row === first.row && last.at === first.at) {
        const s1 = stopNear(t, g, first, b);
        const r = ride(t, g, day, s0, s1, at + w0);
        if (!r) continue;
        const w1 = walkTo(first, s1, b);
        consider(trip(at, w0, r.board, r.off, r.off, r.off, w1, 1, 1));
      } else if (last.row !== first.row) {
        // Two buses, changing where the lines cross.
        const cross = last.at;
        const r1 = ride(t, g, day, s0, cross, at + w0);
        if (!r1) continue;
        const s1 = stopNear(t, g, last, b);
        const r2 = ride(t, g, day, first.at, s1, r1.off);
        if (!r2) continue;
        const w1 = walkTo(last, s1, b);
        const fares = r2.board - r1.board <= t.transfer ? 1 : 2;
        consider(trip(at, w0, r1.board, r1.off, r2.board, r2.off, w1, 2, fares));
      }
    }
  }
  return best;
}

function trip(
  at: number,
  w0: number,
  board: number,
  off: number,
  board2: number,
  off2: number,
  w1: number,
  buses: number,
  fares: number,
): BusTrip {
  const end = off2 + w1;
  return {
    walkTo: w0,
    wait: board - at - w0,
    ride: off - board + (off2 - board2),
    change: board2 - off,
    walkFrom: w1,
    minutes: Math.ceil(end - at),
    buses,
    fares,
  };
}

/** Minutes on foot along the street grid, from `a` to `b`. */
export const walkMinutesBetween = (a: Point, b: Point): number =>
  Math.max(1, Math.ceil((Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / WALK_PACE));
