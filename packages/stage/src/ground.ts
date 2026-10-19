/**
 * The ground: flat patches, painted lines and low curbs, drawn before everything that stands
 * on it. Floors of cut-away rooms are ground too, drawn last in this pass.
 */
import { drawBox } from './box.ts';
import { lit } from './color.ts';
import { box } from './geom.ts';
import { project, type View } from './iso.ts';
import { faceLight, TOP } from './light.ts';
import { INSIDE } from './palette.ts';
import { fillShape, poly } from './shape.ts';
import type { FloorKind } from './types.ts';

export interface Patch {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly color: string;
}

/** A painted line on the ground: a lane mark, a sidewalk joint, a crossing's bar. */
export interface Mark {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Width in metres. */
  readonly width: number;
  readonly color: string;
  /** Dashed: metres of paint, then metres of gap. */
  readonly dash?: readonly [number, number];
}

export interface Curb {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly height: number;
  readonly color: string;
}

export interface Ground {
  readonly patches: readonly Patch[];
  readonly marks: readonly Mark[];
  readonly curbs: readonly Curb[];
}

const sunOnGround = faceLight(TOP);

export function drawPatch(ctx: CanvasRenderingContext2D, view: View, p: Patch, z = 0): void {
  const corners = [
    { x: p.x0, y: p.y0, z },
    { x: p.x1, y: p.y0, z },
    { x: p.x1, y: p.y1, z },
    { x: p.x0, y: p.y1, z },
  ].map((c) => project(view, c));
  fillShape(ctx, poly(corners), lit(p.color, sunOnGround));
}

function drawMark(ctx: CanvasRenderingContext2D, view: View, m: Mark): void {
  const dx = m.x1 - m.x0;
  const dy = m.y1 - m.y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const ux = dx / len;
  const uy = dy / len;
  const [on, off] = m.dash ?? [len, 0];
  const half = m.width / 2;
  for (let s = 0; s < len; s += on + off) {
    const e = Math.min(len, s + on);
    const a = { x: m.x0 + ux * s, y: m.y0 + uy * s };
    const b = { x: m.x0 + ux * e, y: m.y0 + uy * e };
    // The mark's corners, offset across its direction.
    const corners = [
      { x: a.x - uy * half, y: a.y + ux * half, z: 0 },
      { x: b.x - uy * half, y: b.y + ux * half, z: 0 },
      { x: b.x + uy * half, y: b.y - ux * half, z: 0 },
      { x: a.x + uy * half, y: a.y - ux * half, z: 0 },
    ].map((c) => project(view, c));
    fillShape(ctx, poly(corners), lit(m.color, sunOnGround));
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, view: View, g: Ground): void {
  for (const p of g.patches) drawPatch(ctx, view, p);
  for (const m of g.marks) drawMark(ctx, view, m);
  for (const c of g.curbs) drawBox(ctx, view, box(c.x0, c.y0, 0, c.x1, c.y1, c.height), c.color);
}

/** A cut-away room's floor: boards or a diner's checkerboard. */
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  view: View,
  area: { x0: number; y0: number; x1: number; y1: number },
  kind: FloorKind,
): void {
  const z = 0.02;
  if (kind === 'tile') {
    drawPatch(ctx, view, { ...area, color: INSIDE.tile }, z);
    for (let x = area.x0 + 0.3; x < area.x1 - 1e-9; x += 0.3)
      drawMark(ctx, view, { x0: x, y0: area.y0, x1: x, y1: area.y1, width: 0.015, color: INSIDE.grout });
    for (let y = area.y0 + 0.3; y < area.y1 - 1e-9; y += 0.3)
      drawMark(ctx, view, { x0: area.x0, y0: y, x1: area.x1, y1: y, width: 0.015, color: INSIDE.grout });
    return;
  }
  if (kind === 'wood') {
    drawPatch(ctx, view, { ...area, color: INSIDE.wood }, z);
    for (let x = area.x0 + 0.6; x < area.x1; x += 0.6) {
      drawMark(ctx, view, { x0: x, y0: area.y0, x1: x, y1: area.y1, width: 0.03, color: INSIDE.woodDark });
    }
    return;
  }
  const step = 0.6;
  for (let x = area.x0, i = 0; x < area.x1 - 1e-9; x += step, i++) {
    for (let y = area.y0, j = 0; y < area.y1 - 1e-9; y += step, j++) {
      const color = (i + j) % 2 === 0 ? INSIDE.checkerLight : INSIDE.checkerDark;
      drawPatch(
        ctx,
        view,
        { x0: x, y0: y, x1: Math.min(area.x1, x + step), y1: Math.min(area.y1, y + step), color },
        z,
      );
    }
  }
}
