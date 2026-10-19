/**
 * The projection: a fixed 2:1 isometric view (decisions.md, D2 and D7). The camera looks from
 * the south-east, 45° round and 30° down, as a true orthographic camera would, so a ground
 * tile's diamond is twice as wide as it is tall and a vertical metre is √1.5 times a ground
 * step. People are built in 3D and drawn through the same view, so their facings come free.
 *
 * `u` is the zoom: screen pixels for a metre east along the ground's x.
 */
import type { Box3, Pt, Rect, Vec3 } from './geom.ts';

/** How much taller a vertical metre draws than a step along x or y, in a true 2:1 view. */
export const RISE = Math.sqrt(1.5);

/** Where the world sits on the screen. */
export interface View {
  /** CSS pixels per metre along x. */
  readonly u: number;
  /** Where the world's origin lands on the screen, in CSS pixels. */
  readonly ox: number;
  readonly oy: number;
  readonly width: number;
  readonly height: number;
}

export const project = (view: View, p: Vec3): Pt => ({
  x: view.ox + (p.x - p.y) * view.u,
  y: view.oy + ((p.x + p.y) / 2 - p.z * RISE) * view.u,
});

/** The point on the plane at height `z` that draws at a screen point: what a tap lands on. */
export function unproject(view: View, s: Pt, z = 0): Vec3 {
  const a = (s.x - view.ox) / view.u;
  const b = 2 * ((s.y - view.oy) / view.u + z * RISE);
  return { x: (a + b) / 2, y: (b - a) / 2, z };
}

/**
 * Toward the camera, as a unit vector: moving along it changes nothing on the screen. A larger
 * `nearness` draws in front, which orders a figure's limbs and breaks ties in the depth sort.
 */
export const TOWARD_CAMERA: Vec3 = (() => {
  const x = RISE;
  const n = Math.hypot(x, x, 1);
  return { x: x / n, y: x / n, z: 1 / n };
})();

export const nearness = (p: Vec3): number => p.x * TOWARD_CAMERA.x + p.y * TOWARD_CAMERA.y + p.z * TOWARD_CAMERA.z;

/** The screen rectangle a world box covers, from its eight corners. */
export function screenRect(view: View, b: Box3): Rect {
  // On screen, x depends on x − y and y on x + y and z, so the extremes are at known corners.
  const left = project(view, { x: b.x0, y: b.y1, z: 0 }).x;
  const right = project(view, { x: b.x1, y: b.y0, z: 0 }).x;
  const top = project(view, { x: b.x0, y: b.y0, z: b.z1 }).y;
  const bottom = project(view, { x: b.x1, y: b.y1, z: b.z0 }).y;
  return { x0: left, y0: top, x1: right, y1: bottom };
}
