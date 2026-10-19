/**
 * The facade grammar (docs/DESIGN.md, Presentation): a building's street face laid out from
 * rules by its kind, never by hand. The ground floor meets the street as a diner, a shop or a
 * stoop; every storey above is bays of windows, lit at night from the seed's bits; a cornice
 * caps it. Dirtbag's shopfronts (`app/src/view/paint/fronts.ts`) are the flat-colour model.
 */
import { type Face, faceRect, patch } from './box.ts';
import type { View } from './iso.ts';
import { BUILDING, LIT } from './palette.ts';
import { paintText } from './text.ts';
import type { Building, Frame } from './types.ts';

const WIN_W = 1.0;
const WIN_H = 1.45;
const SILL = 0.9;
/** How dark it must be before windows light. */
const LIGHTS_ON = 0.3;

type Ctx = CanvasRenderingContext2D;

/** A window: its frame, its glass, a mullion. Lit at night if its bit says so. */
function drawWindow(
  ctx: Ctx,
  view: View,
  face: Face,
  rect: { s: number; t: number; w: number; h: number },
  lit: boolean,
  frame: Frame,
): void {
  const { s, t, w, h } = rect;
  patch(ctx, view, face, [s - 0.07, t - 0.09, s + w + 0.07, t + h + 0.06], BUILDING.frame);
  const on = lit && frame.dark > LIGHTS_ON;
  const night = frame.dark > LIGHTS_ON;
  patch(ctx, view, face, [s, t, s + w, t + h], on ? LIT : night ? BUILDING.glassDark : BUILDING.glass, on ? 1.15 : 1);
  if (on) frame.lights.push({ kind: 'shape', points: faceRect(view, face, s, t, s + w, t + h), strength: 0.95 });
  patch(ctx, view, face, [s + w / 2 - 0.035, t, s + w / 2 + 0.035, t + h], BUILDING.frame);
}

/** Window positions across a width: `bays` evenly spaced, none in the door's way. */
export function bays(width: number, count: number, door?: { s: number; w: number }): number[] {
  const step = width / count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const s = step * (i + 0.5) - WIN_W / 2;
    if (door && s < door.s + door.w / 2 + 0.2 && s + WIN_W > door.s - door.w / 2 - 0.2) continue;
    out.push(s);
  }
  return out;
}

const bit = (bits: number, i: number) => ((bits >>> (i % 31)) & 1) === 1;

function upperStoreys(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  const xs = bays(face.width, b.facade.bays);
  for (let storey = 1; storey < b.storeys; storey++) {
    xs.forEach((s, i) => {
      drawWindow(
        ctx,
        view,
        face,
        { s, t: storey * b.storeyHeight + SILL, w: WIN_W, h: WIN_H },
        bit(b.facade.litBits, storey * 7 + i),
        frame,
      );
    });
  }
}

function dinerFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame, door: number): void {
  const w = face.width;
  patch(ctx, view, face, [0, 0, w, 0.75], BUILDING.dinerRed);
  patch(ctx, view, face, [0, 0.75, w, 0.86], BUILDING.chrome);
  patch(ctx, view, face, [0, 2.62, w, 2.74], BUILDING.chrome);
  const night = frame.dark > LIGHTS_ON;
  // A band of big windows, broken by the door.
  for (let s = 0.35; s < w - 0.5; s += 1.7) {
    const e = Math.min(w - 0.35, s + 1.55);
    if (e > door - 0.65 && s < door + 0.65) continue;
    patch(ctx, view, face, [s, 0.92, e, 2.55], night ? LIT : BUILDING.glass, night ? 1.1 : 1);
    if (night) frame.lights.push({ kind: 'shape', points: faceRect(view, face, s, 0.92, e, 2.55), strength: 0.9 });
  }
  patch(ctx, view, face, [door - 0.5, 0, door + 0.5, 2.35], BUILDING.chrome);
  patch(ctx, view, face, [door - 0.4, 0.08, door + 0.4, 2.25], night ? LIT : BUILDING.glassDark);
  const sign = b.facade.sign;
  if (sign) {
    const top = b.storeyHeight - 0.18;
    patch(ctx, view, face, [w * 0.18, top - 1.0, w * 0.82, top], sign.color, night ? 1.15 : 1);
    if (night)
      frame.lights.push({
        kind: 'shape',
        points: faceRect(view, face, w * 0.18, top - 1.0, w * 0.82, top),
        strength: 0.8,
      });
    paintText(ctx, view, face, sign.text, { s: w / 2, t: top - 0.5, height: 0.72, maxWidth: w * 0.58 }, sign.ink);
  }
}

function shopFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame, door: number): void {
  const w = face.width;
  patch(ctx, view, face, [0, 0, w, 0.5], b.facade.trim);
  patch(ctx, view, face, [0.3, 0.5, w - 0.3, 2.85], BUILDING.frame);
  patch(ctx, view, face, [0.42, 0.58, door - 0.62, 2.75], frame.dark > LIGHTS_ON ? BUILDING.glassDark : BUILDING.glass);
  patch(
    ctx,
    view,
    face,
    [door + 0.62, 0.58, w - 0.42, 2.75],
    frame.dark > LIGHTS_ON ? BUILDING.glassDark : BUILDING.glass,
  );
  patch(ctx, view, face, [door - 0.5, 0, door + 0.5, 2.4], BUILDING.door);
  patch(ctx, view, face, [0, 2.95, w, 3.45], b.facade.trim, 0.9);
  if (b.facade.card) {
    const s0 = Math.max(0.6, door - 2.4);
    patch(ctx, view, face, [s0, 1.0, s0 + 1.4, 1.75], BUILDING.sign);
    paintText(
      ctx,
      view,
      face,
      b.facade.card,
      { s: s0 + 0.7, t: 1.38, height: 0.28, maxWidth: 1.25 },
      BUILDING.dinerRed,
    );
  }
}

function stoopFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame, door: number): void {
  patch(ctx, view, face, [door - 0.65, 0, door + 0.65, 2.65], BUILDING.cornice);
  patch(ctx, view, face, [door - 0.5, 0, door + 0.5, 2.3], BUILDING.door);
  for (const s of bays(face.width, b.facade.bays, { s: door, w: 1.3 })) {
    drawWindow(ctx, view, face, { s, t: SILL, w: WIN_W, h: WIN_H }, bit(b.facade.litBits, 30 - Math.round(s)), frame);
  }
}

/** Faint brick courses, only when close enough to see them. */
function courses(ctx: Ctx, view: View, face: Face, color: string): void {
  if (view.u < 18) return;
  for (let t = 0.3; t < face.height; t += 0.3) patch(ctx, view, face, [0, t, face.width, t + 0.025], color, 0.92);
}

/** The street face: the wall, its ground floor by kind, the storeys above, the cornice. */
export function drawFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  patch(ctx, view, face, [0, 0, face.width, face.height], b.facade.wall);
  if (b.facade.wall === BUILDING.brick) courses(ctx, view, face, BUILDING.brickDark);
  const door = b.interior?.door ?? face.width / 2;
  if (b.facade.ground === 'diner') dinerFront(ctx, view, b, face, frame, door);
  else if (b.facade.ground === 'shop') shopFront(ctx, view, b, face, frame, door);
  else if (b.facade.ground === 'stoop') stoopFront(ctx, view, b, face, frame, door);
  else
    bays(face.width, b.facade.bays).forEach((s, i) => {
      drawWindow(ctx, view, face, { s, t: SILL, w: WIN_W, h: WIN_H }, bit(b.facade.litBits, 20 + i), frame);
    });
  upperStoreys(ctx, view, b, face, frame);
  patch(ctx, view, face, [0, face.height - 0.35, face.width, face.height], b.facade.trim);
}

/** The side: a party wall, or windows for the apartment house, which stands free. */
export function drawSide(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  patch(ctx, view, face, [0, 0, face.width, face.height], b.facade.wall);
  if (b.facade.wall === BUILDING.brick) courses(ctx, view, face, BUILDING.brickDark);
  if (b.kind === 'apartment') {
    const xs = bays(face.width, 3);
    for (let storey = 0; storey < b.storeys; storey++) {
      xs.forEach((s, i) => {
        drawWindow(
          ctx,
          view,
          face,
          { s, t: storey * b.storeyHeight + SILL, w: WIN_W * 0.8, h: WIN_H },
          bit(b.facade.litBits, storey * 5 + i + 11),
          frame,
        );
      });
    }
  }
  patch(ctx, view, face, [0, face.height - 0.35, face.width, face.height], b.facade.trim, 0.95);
}
