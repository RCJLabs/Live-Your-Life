import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { busTrip, type Grid, type Transit, transitOf, walkMinutesBetween } from './bus.ts';
import { type Rideshare, rideTrip } from './rideshare.ts';

const t = transitOf(sliceSim().content) as Transit;
const r = t.rideshare as Rideshare;
const g: Grid = { size: 35 * 400, every: 4 * 400 };

describe('a ride from a phone (M2.9 step 3, D118)', () => {
  it('costs the base, the fee, its kilometres and its minutes, after the wait for the car', () => {
    const a = { x: 1000, y: 1000 };
    const b = { x: 7000, y: 5000 };
    const ride = rideTrip(t, a, b);
    const metres = 6000 + 4000;
    expect(ride?.wait).toBe(r.wait);
    expect(ride?.ride).toBeCloseTo(metres / r.speed, 6);
    expect(ride?.minutes).toBe(Math.ceil(r.wait + metres / r.speed));
    expect(ride?.price).toBe(
      Math.round(r.base + r.booking + (metres * r.perKm) / 1000 + (metres / r.speed) * r.perMinute),
    );
  });

  it('costs at least the minimum, however short', () => {
    expect(rideTrip(t, { x: 0, y: 0 }, { x: 100, y: 0 })?.price).toBe(r.minimum);
  });

  it('beats the bus and walking across the city, for many times the fare', () => {
    const a = { x: 500, y: 1600 };
    const b = { x: 12000, y: 9000 };
    const ride = rideTrip(t, a, b);
    const bus = busTrip(t, g, a, b, 'wednesday', 12 * 60);
    expect(ride?.minutes as number).toBeLessThan(bus?.minutes as number);
    expect(ride?.minutes as number).toBeLessThan(walkMinutesBetween(a, b));
    expect(ride?.price as number).toBeGreaterThan(5 * t.fare);
  });

  it('is none in a pack without it', () => {
    const { rideshare: _, ...without } = t;
    expect(rideTrip(without as Transit, { x: 0, y: 0 }, { x: 1000, y: 0 })).toBeNull();
  });
});
