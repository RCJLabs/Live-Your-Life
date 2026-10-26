/**
 * Going by bus or by a hailed ride (M2.9 step 4, D118). The page says where a trip starts and
 * ends, as it says how long the walk to work is (D61): two points in the city's metres. The sim
 * reads the trip from them with the same functions the page previews with (bus.ts,
 * rideshare.ts), charges it and lets its minutes pass, so the time and price you were shown are
 * the ones taken. Bus fares stop at the day's cap. Walking stays the page's `time/advance`.
 */
import { defineModule, type ModuleContext } from '@eb/core';
import type { WEEKDAYS } from '../calendar.ts';
import type { CityRecord } from '../city/city.ts';
import { CITY } from '../city/city.ts';
import { type BusTrip, busTrip, CLEAR, type Grid, type Point, type Slow, transitOf } from './bus.ts';
import { type Ride, rideTrip } from './rideshare.ts';

export interface TravelSlice {
  /** The day bus fares were last paid, and how much that day, for the day's cap. */
  day: number;
  paid: number;
}

type Ctx = ModuleContext<TravelSlice>;
type View = { readonly content: Ctx['content']; fact(id: string, args?: Readonly<Record<string, unknown>>): unknown };

const gridOf = (v: View): Grid | null => {
  const c = v.content.get<CityRecord>('city', CITY);
  return c ? { size: c.size * c.cell, every: c.arterialEvery * c.cell } : null;
};

const pointOf = (p: unknown): Point | null => {
  const q = p as { x?: unknown; y?: unknown } | null;
  return q && typeof q.x === 'number' && typeof q.y === 'number' && Number.isFinite(q.x) && Number.isFinite(q.y)
    ? { x: q.x, y: q.y }
    : null;
};

/** What the season does to a trip now: clear in a game without it. */
export const slowOf = (v: View): Slow => ({
  pace: (v.fact('season.pace') as number | undefined) ?? CLEAR.pace,
  late: (v.fact('season.late') as number | undefined) ?? CLEAR.late,
});

/** The bus trip from `a` to `b` now, and its fare after what the day's cap has left. */
export function busNow(v: View, s: Readonly<TravelSlice>, a: Point, b: Point): (BusTrip & { cents: number }) | null {
  const t = transitOf(v.content);
  const g = gridOf(v);
  if (!t || !g) return null;
  const trip = busTrip(
    t,
    g,
    a,
    b,
    // A holiday's buses keep Sunday's timetable (D132); snow slows the walk and the bus (D131).
    (v.fact('season.timetable') ?? v.fact('time.weekday')) as (typeof WEEKDAYS)[number],
    v.fact('time.of-day') as number,
    slowOf(v),
  );
  if (!trip) return null;
  const today = v.fact('time.day') as number;
  const spent = s.day === today ? s.paid : 0;
  return { ...trip, cents: Math.max(0, Math.min(trip.fares * t.fare, t.dayCap - spent)) };
}

export const rideNow = (v: View, a: Point, b: Point): Ride | null => {
  const t = transitOf(v.content);
  return t ? rideTrip(t, a, b) : null;
};

function ends(ctx: Ctx, from: unknown, to: unknown): [Point, Point] {
  const a = pointOf(from);
  const b = pointOf(to);
  if (!a || !b) ctx.refuse('no-points');
  return [a as Point, b as Point];
}

function bus(ctx: Ctx, from: unknown, to: unknown): void {
  const [a, b] = ends(ctx, from, to);
  const trip = busNow(ctx, ctx.read(), a, b);
  if (!trip) ctx.refuse('no-bus');
  const { minutes, cents } = trip as BusTrip & { cents: number };
  if (cents > 0) ctx.apply({ effect: 'pay-cost', cost: { cash: cents } });
  const today = ctx.fact('time.day') as number;
  const s = ctx.read();
  Object.assign(ctx.write(), { day: today, paid: (s.day === today ? s.paid : 0) + cents });
  ctx.apply({ effect: 'wait', minutes });
  ctx.emit('rode-bus', { minutes, cents });
}

function ride(ctx: Ctx, from: unknown, to: unknown): void {
  const [a, b] = ends(ctx, from, to);
  const r = rideNow(ctx, a, b);
  if (!r) ctx.refuse('no-ride');
  const { minutes, price } = r as Ride;
  ctx.apply({ effect: 'pay-cost', cost: { cash: price } });
  ctx.apply({ effect: 'wait', minutes });
  ctx.emit('rode', { minutes, cents: price });
}

/** A preview's slice: a fact view's state, or a context's read. */
const sliceOf = (v: object): TravelSlice =>
  'state' in v ? (v as { state: TravelSlice }).state : (v as { read(): TravelSlice }).read();

const TRIP = { minutes: { type: 'int', min: 0 }, cents: { type: 'int', min: 0 } } as const;

export const travelModule = defineModule<TravelSlice>({
  id: 'travel',
  init: () => ({ day: -1, paid: 0 }),
  events: {
    'rode-bus': { args: TRIP, label: 'Took the bus' },
    rode: { args: TRIP, label: 'Took a ride' },
  },
  actions: {
    // The page's: it knows where you are and where you're going (D61). Offered to no bot.
    bus: { run: (ctx, a) => bus(ctx, a.from, a.to), options: () => [] },
    ride: { run: (ctx, a) => ride(ctx, a.from, a.to), options: () => [] },
  },
  effects: {
    // A trip's minutes and price, for the page to show before you choose: the same the action takes.
    'bus-trip': {
      run: () => {},
      preview: (ctx, e) => {
        const a = pointOf(e.from);
        const b = pointOf(e.to);
        const trip = a && b ? busNow(ctx as never, sliceOf(ctx), a, b) : null;
        return trip ? { ...trip } : {};
      },
    },
    'ride-trip': {
      run: () => {},
      preview: (ctx, e) => {
        const a = pointOf(e.from);
        const b = pointOf(e.to);
        const r = a && b ? rideNow(ctx as never, a, b) : null;
        return r ? { ...r } : {};
      },
    },
  },
  on: {
    // The heir's day starts with no fares paid (M2.7 step 3).
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), { day: -1, paid: 0 });
    },
  },
});
