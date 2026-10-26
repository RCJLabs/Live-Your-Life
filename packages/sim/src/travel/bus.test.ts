import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { busTrip, type Grid, type Transit, transitOf, WALK_PACE, walkMinutesBetween } from './bus.ts';

const t = transitOf(sliceSim().content) as Transit;
/** Ridgefield: 35 cells of 400 m, an arterial every fourth cell edge. */
const g: Grid = { size: 35 * 400, every: 4 * 400 };

describe('the buses (M2.9 step 2, D118)', () => {
  it('rides one line between two of its stops: the wait for the next bus, then its speed', () => {
    // On the arterial at y = 1600, from x = 800 to x = 4000, a weekday at 07:00.
    const trip = busTrip(t, g, { x: 800, y: 1600 }, { x: 4000, y: 1600 }, 'monday', 7 * 60);
    expect(trip?.buses).toBe(1);
    expect(trip?.walkTo).toBe(0);
    expect(trip?.walkFrom).toBe(0);
    expect(trip?.ride).toBeCloseTo(3200 / t.speed, 6);
    // The bus left the line's west end on the quarter hour and reaches x = 800 800 m later.
    const at = 800 / t.speed;
    const next = Math.ceil((7 * 60 - 6 * 60 - at) / 15) * 15 + 6 * 60 + at;
    expect(trip?.wait).toBeCloseTo(next - 7 * 60, 6);
    expect(trip?.fares).toBe(1);
  });

  it('walks to the nearest stop and from the last along the street grid', () => {
    const trip = busTrip(t, g, { x: 900, y: 1700 }, { x: 4100, y: 1500 }, 'monday', 7 * 60);
    expect(trip?.walkTo).toBeCloseTo((100 + 100) / WALK_PACE, 6);
    expect(trip?.walkFrom).toBeCloseTo((100 + 100) / WALK_PACE, 6);
  });

  it('changes once where two arterials cross, within the transfer window for one fare', () => {
    // From the row at y = 1600 to the column at x = 6400, far up it.
    const trip = busTrip(t, g, { x: 800, y: 1600 }, { x: 6400, y: 8000 }, 'tuesday', 8 * 60);
    expect(trip?.buses).toBe(2);
    expect(trip?.change).toBeGreaterThanOrEqual(0);
    expect(trip?.change).toBeLessThan(15);
    expect(trip?.fares).toBe(1);
  });

  it('runs to the timetable: none after the last bus, and an hour apart on Sunday', () => {
    expect(busTrip(t, g, { x: 800, y: 1600 }, { x: 4000, y: 1600 }, 'monday', 23 * 60 + 30)).toBeNull();
    const sunday = busTrip(t, g, { x: 800, y: 1600 }, { x: 4000, y: 1600 }, 'sunday', 9 * 60 + 5);
    expect(sunday?.wait).toBeGreaterThan(30);
    expect(sunday?.wait).toBeLessThanOrEqual(60);
  });

  it('beats walking across the city, and loses to it across a block', () => {
    const far = busTrip(t, g, { x: 500, y: 1600 }, { x: 12000, y: 9000 }, 'wednesday', 12 * 60);
    expect(far?.minutes as number).toBeLessThan(walkMinutesBetween({ x: 500, y: 1600 }, { x: 12000, y: 9000 }));
    const near = busTrip(t, g, { x: 500, y: 1700 }, { x: 900, y: 1700 }, 'wednesday', 12 * 60);
    expect(near?.minutes ?? Number.POSITIVE_INFINITY).toBeGreaterThan(
      walkMinutesBetween({ x: 500, y: 1700 }, { x: 900, y: 1700 }),
    );
  });
});
