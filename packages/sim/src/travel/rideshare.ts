/**
 * A ride hailed from a phone (M2.9 step 3, D118): the car comes after the record's wait, drives the
 * streets' metres at its speed, and the ride costs a base, a fee, and its kilometres and minutes,
 * at least the minimum. Like the bus (bus.ts), a pure function of the two points, so the price
 * shown is the price charged.
 */
import type { Point, Transit } from './bus.ts';

export type Rideshare = NonNullable<Transit['rideshare']>;

export interface Ride {
  /** Game minutes waiting for the car, and in it. */
  readonly wait: number;
  readonly ride: number;
  readonly minutes: number;
  /** In cents. */
  readonly price: number;
}

/** A ride from `a` to `b` along the street grid, or null where the record has none. */
export function rideTrip(t: Transit, a: Point, b: Point): Ride | null {
  const r = t.rideshare;
  if (!r) return null;
  const metres = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const ride = metres / r.speed;
  const price = Math.max(r.minimum, Math.round(r.base + r.booking + (metres * r.perKm) / 1000 + ride * r.perMinute));
  return { wait: r.wait, ride, minutes: Math.ceil(r.wait + ride), price };
}
