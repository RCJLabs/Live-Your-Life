import { describe, expect, it } from 'vitest';
import { daylight, faceLight, LEFT, RIGHT, TOP, TWILIGHT } from './light.ts';

describe('the light', () => {
  it('lights the top most, the street face next and the side least', () => {
    expect(faceLight(TOP)).toBeGreaterThan(faceLight(LEFT));
    expect(faceLight(LEFT)).toBeGreaterThan(faceLight(RIGHT));
    // Shade, never black: a face in shadow keeps its colour.
    expect(faceLight(RIGHT)).toBeGreaterThan(0.6);
    expect(faceLight(TOP)).toBeLessThanOrEqual(1);
  });

  it('is day at noon and night at 23:00 and at 03:00', () => {
    expect(daylight(12 * 60)).toEqual({ dark: 0, warm: 0 });
    expect(daylight(23 * 60)).toEqual({ dark: 1, warm: 0 });
    expect(daylight(3 * 60)).toEqual({ dark: 1, warm: 0 });
  });

  it('darkens steadily through dusk and lightens through dawn, warmest halfway', () => {
    let last = -1;
    for (let m = TWILIGHT.duskFrom; m <= TWILIGHT.duskTo; m += 5) {
      const { dark } = daylight(m);
      expect(dark).toBeGreaterThanOrEqual(last);
      last = dark;
    }
    last = 2;
    for (let m = TWILIGHT.dawnFrom; m <= TWILIGHT.dawnTo; m += 5) {
      const { dark } = daylight(m);
      expect(dark).toBeLessThanOrEqual(last);
      last = dark;
    }
    // Halfway through each twilight it is half dark: a twilight that never darkens fails here.
    const mid = (TWILIGHT.duskFrom + TWILIGHT.duskTo) / 2;
    expect(daylight(mid).dark).toBeCloseTo(0.5, 6);
    expect(daylight((TWILIGHT.dawnFrom + TWILIGHT.dawnTo) / 2).dark).toBeCloseTo(0.5, 6);
    expect(daylight(mid).warm).toBeCloseTo(1, 6);
    expect(daylight(mid + 30).warm).toBeLessThan(1);
  });

  it('reads any minute, a day later or earlier', () => {
    expect(daylight(12 * 60 + 1440)).toEqual(daylight(12 * 60));
    expect(daylight(-60)).toEqual(daylight(23 * 60));
  });
});
