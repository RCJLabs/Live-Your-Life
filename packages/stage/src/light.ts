/**
 * One light direction for the whole city (docs/DESIGN.md, Presentation): faces are shaded by
 * how squarely they meet it, after climbing-world-traveler's isometric style test
 * (`scripts/dev/visual-styles/src/s04-iso.js`). And how dark it is, from the time of day.
 */
import { clamp, dot, normalize, type Vec3 } from './geom.ts';

/** Toward the sun: from the upper left of the screen, so a building's street face is lit and its side is in shade. */
export const SUN: Vec3 = normalize({ x: 0.3, y: 0.62, z: 0.75 });

const AMBIENT = 0.58;
const DIFFUSE = 0.48;

/** How lit a face is, by its outward normal: 1 is the colour as written. */
export const faceLight = (normal: Vec3): number => AMBIENT + DIFFUSE * Math.max(0, dot(normal, SUN));

export const TOP: Vec3 = { x: 0, y: 0, z: 1 };
/** The face toward +y, on the left of a box on screen. */
export const LEFT: Vec3 = { x: 0, y: 1, z: 0 };
/** The face toward +x, on the right of a box on screen. */
export const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };

/** How dark it must be before windows, lamps and rooms light up: one threshold, so a cached picture knows when to change. */
export const LIGHTS_ON = 0.3;

export interface Daylight {
  /** 0 by day, 1 at full night: how much of the night colour lies over the scene. */
  readonly dark: number;
  /** 0 to 1: the low sun's warmth at dawn and dusk. */
  readonly warm: number;
}

/**
 * Minutes of the day that bound twilight (tune). One summer's day for the spike: a June
 * evening in a Midwest city, dark by 22:00. Seasons and the city's latitude come with
 * calibration (docs/CALIBRATION.md).
 */
export const TWILIGHT = {
  dawnFrom: 4 * 60 + 30,
  dawnTo: 6 * 60 + 30,
  duskFrom: 19 * 60 + 45,
  duskTo: 22 * 60,
} as const;

const smooth = (t: number): number => {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
};

/** How dark and how warm the light is at a minute of the day. */
export function daylight(minuteOfDay: number): Daylight {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  const { dawnFrom, dawnTo, duskFrom, duskTo } = TWILIGHT;
  if (m >= dawnTo && m <= duskFrom) return { dark: 0, warm: 0 };
  if (m > duskFrom && m < duskTo) {
    const t = (m - duskFrom) / (duskTo - duskFrom);
    return { dark: smooth(t), warm: Math.sin(Math.PI * t) };
  }
  if (m > dawnFrom && m < dawnTo) {
    const t = (m - dawnFrom) / (dawnTo - dawnFrom);
    return { dark: 1 - smooth(t), warm: Math.sin(Math.PI * t) };
  }
  return { dark: 1, warm: 0 };
}
