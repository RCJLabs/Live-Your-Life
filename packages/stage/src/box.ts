/**
 * Boxes, the city's one solid: walls, counters, beds and roofs are all boxes, shaded by the
 * one sun. A box shows three faces from this fixed view, its top, its +y face on the left and
 * its +x face on the right, so nothing ever draws a back face. Each face has a frame of its own
 * (s along it, t up it, in metres) so a front's windows and signs are laid out on the wall.
 */
import { css, rgb, shade } from './color.ts';
import type { Box3, Pt, Vec3 } from './geom.ts';
import { project, type View } from './iso.ts';
import { faceLight, LEFT, RIGHT, TOP } from './light.ts';
import { fillShape, poly } from './shape.ts';

export interface Face {
  /** The face's corner at s = 0, t = 0: its lower end on the left of the screen. */
  readonly origin: Vec3;
  readonly along: Vec3;
  readonly up: Vec3;
  readonly width: number;
  readonly height: number;
  readonly normal: Vec3;
}

export const faceAt = (f: Face, s: number, t: number): Vec3 => ({
  x: f.origin.x + f.along.x * s + f.up.x * t,
  y: f.origin.y + f.along.y * s + f.up.y * t,
  z: f.origin.z + f.along.z * s + f.up.z * t,
});

/** A rectangle on a face, from (s0, t0) to (s1, t1), as screen points. */
export const faceRect = (view: View, f: Face, s0: number, t0: number, s1: number, t1: number): Pt[] =>
  [faceAt(f, s0, t0), faceAt(f, s1, t0), faceAt(f, s1, t1), faceAt(f, s0, t1)].map((p) => project(view, p));

/** The face toward +y, seen on the left: s runs east along x. */
export const leftFace = (b: Box3): Face => ({
  origin: { x: b.x0, y: b.y1, z: b.z0 },
  along: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 1 },
  width: b.x1 - b.x0,
  height: b.z1 - b.z0,
  normal: LEFT,
});

/** The face toward +x, seen on the right: s runs north along −y. */
export const rightFace = (b: Box3): Face => ({
  origin: { x: b.x1, y: b.y1, z: b.z0 },
  along: { x: 0, y: -1, z: 0 },
  up: { x: 0, y: 0, z: 1 },
  width: b.y1 - b.y0,
  height: b.z1 - b.z0,
  normal: RIGHT,
});

/** The top: s runs east, t runs north. */
export const topFace = (b: Box3): Face => ({
  origin: { x: b.x0, y: b.y1, z: b.z1 },
  along: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: -1, z: 0 },
  width: b.x1 - b.x0,
  height: b.y1 - b.y0,
  normal: TOP,
});

/** A colour as the sun lights a face. */
export const litFor = (hex: string, normal: Vec3, k = 1): string => css(shade(rgb(hex), faceLight(normal) * k));

export function fillFace(ctx: CanvasRenderingContext2D, view: View, f: Face, hex: string, k = 1): void {
  fillShape(ctx, poly(faceRect(view, f, 0, 0, f.width, f.height)), litFor(hex, f.normal, k));
}

/** A rectangle on a face, filled flat in the face's light. */
export function patch(
  ctx: CanvasRenderingContext2D,
  view: View,
  f: Face,
  rect: readonly [number, number, number, number],
  hex: string,
  k = 1,
): void {
  fillShape(ctx, poly(faceRect(view, f, ...rect)), litFor(hex, f.normal, k));
}

export interface BoxColors {
  readonly top: string;
  readonly left: string;
  readonly right: string;
}

/** A plain box: three faces, each its colour in its light. */
export function drawBox(ctx: CanvasRenderingContext2D, view: View, b: Box3, colors: BoxColors | string): void {
  const c = typeof colors === 'string' ? { top: colors, left: colors, right: colors } : colors;
  if (b.z1 > b.z0) {
    fillFace(ctx, view, leftFace(b), c.left);
    fillFace(ctx, view, rightFace(b), c.right);
  }
  fillFace(ctx, view, topFace(b), c.top);
}
