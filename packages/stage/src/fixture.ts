/**
 * Helpers for fixtures: parts laid out in the fixture's own frame, which turns with the way it
 * faces. Facings are the grid's four, so every part stays an axis-aligned box.
 */
import { drawBox } from './box.ts';
import { lit } from './color.ts';
import { type Box3, box, type Pt } from './geom.ts';
import { project, type View } from './iso.ts';
import { faceLight, TOP } from './light.ts';
import { fillShape, oval } from './shape.ts';
import type { Facing, Fixture } from './types.ts';

const FORWARD: Readonly<Record<Facing, { x: number; y: number }>> = {
  e: { x: 1, y: 0 },
  w: { x: -1, y: 0 },
  s: { x: 0, y: 1 },
  n: { x: 0, y: -1 },
};

/** The fixture's size along the way it faces (depth) and across it (width). */
export function extent(f: Fixture): { depth: number; width: number } {
  const ew = f.facing === 'e' || f.facing === 'w';
  return { depth: ew ? f.w : f.d, width: ew ? f.d : f.w };
}

/** A point in the fixture's frame: `fwd` metres toward its front, `side` to its right, `z` up. */
export function at(f: Fixture, fwd: number, side: number, z = 0): { x: number; y: number; z: number } {
  const F = FORWARD[f.facing];
  // Its right, turning the forward a quarter clockwise as seen from above.
  const S = { x: -F.y, y: F.x };
  return { x: f.x + F.x * fwd + S.x * side, y: f.y + F.y * fwd + S.y * side, z };
}

/** A box in the fixture's frame, as an axis-aligned world box. */
export function part(f: Fixture, fwd: [number, number], side: [number, number], z: [number, number]): Box3 {
  const a = at(f, fwd[0], side[0]);
  const b = at(f, fwd[1], side[1]);
  return box(a.x, a.y, z[0], b.x, b.y, z[1]);
}

/** A flat disc at height z: a stool's seat, a pan, a plate. */
export function drawDisc(
  ctx: CanvasRenderingContext2D,
  view: View,
  c: { x: number; y: number },
  r: number,
  z: number,
  hex: string,
  k = 1,
): void {
  const p = project(view, { ...c, z });
  fillShape(ctx, oval(p, Math.SQRT2 * r * view.u, (Math.SQRT2 * r * view.u) / 2), lit(hex, faceLight(TOP) * k));
}

/** A round thing's side: a band under its disc. */
export function drawDrum(
  ctx: CanvasRenderingContext2D,
  view: View,
  c: { x: number; y: number },
  r: number,
  z0: number,
  z1: number,
  hex: string,
): void {
  drawDisc(ctx, view, c, r, z0, hex, 0.75);
  const lo = project(view, { ...c, z: z0 });
  const hi = project(view, { ...c, z: z1 });
  const rx = Math.SQRT2 * r * view.u;
  ctx.fillStyle = lit(hex, 0.78);
  ctx.fillRect(lo.x - rx, hi.y, 2 * rx, lo.y - hi.y);
  drawDisc(ctx, view, c, r, z1, hex);
}

export const slab = (ctx: CanvasRenderingContext2D, view: View, b: Box3, hex: string): void =>
  drawBox(ctx, view, b, hex);

export const screenOf = (view: View, p: { x: number; y: number; z: number }): Pt => project(view, p);
