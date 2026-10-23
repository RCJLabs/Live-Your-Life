/**
 * The facade grammar (docs/DESIGN.md, Presentation): a building's street face laid out from
 * rules, never by hand. The ground floor meets the street as a diner, a shop or a stoop; every
 * storey above is bays of windows, one or a pair to a bay, with stone sills if the facade has
 * them, lit at night from the seed's bits; a band, a bracketed band or a parapet caps it; wear
 * streaks it and boards up windows nobody lives behind. Dirtbag's shopfronts
 * (`app/src/view/paint/fronts.ts`) are the flat-colour model. Each part the grammar leaves out
 * draws as M0.3's spike drew it, and a golden test holds the spike to that (D33).
 */
import { type Face, faceRect, patch } from './box.ts';
import type { View } from './iso.ts';
import { LIGHTS_ON } from './light.ts';
import { BUILDING, LIT } from './palette.ts';
import { paintText } from './text.ts';
import type { Building, Frame } from './types.ts';

const WIN_W = 1.0;
const WIN_H = 1.45;
const SILL = 0.9;
/** A pair's two windows and the pier between them, inside one bay's width. */
const PAIR_W = 0.44;
const PAIR_GAP = 0.12;

type Ctx = CanvasRenderingContext2D;
type Rect = { s: number; t: number; w: number; h: number };

/** A window: its frame, its glass, a mullion. Lit at night if its bit says so. */
function drawWindow(ctx: Ctx, view: View, face: Face, rect: Rect, lit: boolean, frame: Frame): void {
  const { s, t, w, h } = rect;
  patch(ctx, view, face, [s - 0.07, t - 0.09, s + w + 0.07, t + h + 0.06], BUILDING.frame);
  const on = lit && frame.dark > LIGHTS_ON;
  const night = frame.dark > LIGHTS_ON;
  patch(ctx, view, face, [s, t, s + w, t + h], on ? LIT : night ? BUILDING.glassDark : BUILDING.glass, on ? 1.15 : 1);
  if (on) frame.lights.push({ kind: 'shape', points: faceRect(view, face, s, t, s + w, t + h), strength: 0.95 });
  patch(ctx, view, face, [s + w / 2 - 0.035, t, s + w / 2 + 0.035, t + h], BUILDING.frame);
}

/** A window boarded over: plywood in its frame, never lit. */
function drawBoarded(ctx: Ctx, view: View, face: Face, { s, t, w, h }: Rect): void {
  patch(ctx, view, face, [s - 0.07, t - 0.09, s + w + 0.07, t + h + 0.06], BUILDING.frame, 0.85);
  patch(ctx, view, face, [s, t, s + w, t + h], BUILDING.board);
  patch(ctx, view, face, [s, t + h * 0.48, s + w, t + h * 0.52], BUILDING.boardDark);
}

/** Cast stone under a window and over it. */
function drawSill(ctx: Ctx, view: View, face: Face, { s, t, w, h }: Rect): void {
  patch(ctx, view, face, [s - 0.12, t - 0.2, s + w + 0.12, t - 0.09], BUILDING.stone);
  patch(ctx, view, face, [s - 0.1, t + h + 0.06, s + w + 0.1, t + h + 0.18], BUILDING.stone, 0.95);
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

/** One bay of an upper storey: a window or a pair, perhaps boarded, perhaps on a sill. */
function drawBay(ctx: Ctx, view: View, b: Building, face: Face, rect: Rect, n: number, frame: Frame): void {
  const f = b.facade;
  const boarded = (f.wear ?? 0) >= 2 && bit(f.litBits, n + 13) && bit(f.litBits, n + 7);
  const panes =
    f.window === 'pair'
      ? [
          { ...rect, w: PAIR_W },
          { ...rect, s: rect.s + PAIR_W + PAIR_GAP, w: PAIR_W },
        ]
      : [rect];
  if (f.sills) drawSill(ctx, view, face, rect);
  for (const pane of panes) {
    if (boarded) drawBoarded(ctx, view, face, pane);
    else drawWindow(ctx, view, face, pane, bit(f.litBits, n), frame);
  }
}

function upperStoreys(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  const xs = bays(face.width, b.facade.bays);
  for (let storey = 1; storey < b.storeys; storey++) {
    xs.forEach((s, i) => {
      drawBay(ctx, view, b, face, { s, t: storey * b.storeyHeight + SILL, w: WIN_W, h: WIN_H }, storey * 7 + i, frame);
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

/** A shop's sign board: over the shopfront's band, or above the awning when it has one. */
function shopSign(ctx: Ctx, view: View, b: Building, face: Face): void {
  const sign = b.facade.sign;
  if (!sign) return;
  const w = face.width;
  const [t0, t1] = b.facade.awning ? [3.42, 3.9] : [2.95, 3.45];
  patch(ctx, view, face, [w * 0.1, t0, w * 0.9, t1], sign.color);
  paintText(
    ctx,
    view,
    face,
    sign.text,
    { s: w / 2, t: (t0 + t1) / 2, height: (t1 - t0) * 0.72, maxWidth: w * 0.74 },
    sign.ink,
  );
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
  shopSign(ctx, view, b, face);
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

/**
 * An office's or an institution's ground floor (M2.1): a stone base, tall glass doors in a stone
 * surround, the sign cut over them, and windows either side.
 */
function lobbyFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame, door: number): void {
  const w = face.width;
  const night = frame.dark > LIGHTS_ON;
  patch(ctx, view, face, [0, 0, w, 0.6], BUILDING.stone);
  patch(ctx, view, face, [door - 1.5, 0, door + 1.5, 3.4], BUILDING.stone);
  patch(ctx, view, face, [door - 1.1, 0, door + 1.1, 2.9], night ? LIT : BUILDING.glassDark, night ? 1.1 : 1);
  patch(ctx, view, face, [door - 0.03, 0, door + 0.03, 2.9], BUILDING.frame);
  if (night)
    frame.lights.push({ kind: 'shape', points: faceRect(view, face, door - 1.1, 0, door + 1.1, 2.9), strength: 0.7 });
  for (const s of bays(w, b.facade.bays, { s: door, w: 3.2 })) {
    drawWindow(
      ctx,
      view,
      face,
      { s, t: SILL + 0.2, w: WIN_W, h: WIN_H + 0.3 },
      bit(b.facade.litBits, 20 + Math.round(s)),
      frame,
    );
  }
  const sign = b.facade.sign;
  if (!sign) return;
  const top = Math.min(b.storeyHeight - 0.15, 4.2);
  patch(ctx, view, face, [door - 2.6, top - 0.75, door + 2.6, top], sign.color);
  paintText(ctx, view, face, sign.text, { s: door, t: top - 0.375, height: 0.5, maxWidth: 4.9 }, sign.ink);
}

/** Faint brick courses, only when close enough to see them. */
function courses(ctx: Ctx, view: View, face: Face, color: string): void {
  if (view.u < 18) return;
  for (let t = 0.3; t < face.height; t += 0.3) patch(ctx, view, face, [0, t, face.width, t + 0.025], color, 0.92);
}

/** Wear: streaks down from the cornice, and a patch of newer wall low down, placed by the seed's bits. */
function weathering(ctx: Ctx, view: View, b: Building, face: Face): void {
  if ((b.facade.wear ?? 0) < 1) return;
  const { width, height } = face;
  for (let s = 0.4, i = 0; s < width - 0.4; s += 1.3, i++) {
    if (bit(b.facade.litBits, i + 3))
      patch(ctx, view, face, [s, height - 2.6, s + 0.22, height - 0.35], b.facade.wall, 0.86);
  }
  const at = width * (0.15 + (0.5 * ((b.facade.litBits >>> 8) % 100)) / 100);
  patch(ctx, view, face, [at, 0.2, at + Math.min(1.6, width * 0.2), 1.3], b.facade.wall, 1.08);
}

/** What caps the front: a plain band, the band on brackets, or a parapet with its coping. */
function cornice(ctx: Ctx, view: View, b: Building, face: Face): void {
  const { width, height } = face;
  const trim = b.facade.trim;
  if (b.facade.cornice === 'parapet') {
    patch(ctx, view, face, [0, height - 0.95, width, height - 0.85], trim);
    patch(ctx, view, face, [0, height - 0.16, width, height], BUILDING.stone);
    return;
  }
  patch(ctx, view, face, [0, height - 0.35, width, height], trim);
  if (b.facade.cornice !== 'bracketed') return;
  for (let s = 0.3; s < width - 0.2; s += 0.7)
    patch(ctx, view, face, [s, height - 0.62, s + 0.14, height - 0.35], trim, 0.88);
}

/** The street face: the wall, its ground floor by kind, the storeys above, the cornice. */
export function drawFront(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  patch(ctx, view, face, [0, 0, face.width, face.height], b.facade.wall);
  if (b.facade.wall === BUILDING.brick) courses(ctx, view, face, BUILDING.brickDark);
  weathering(ctx, view, b, face);
  const door = b.interior?.door ?? b.door ?? face.width / 2;
  if (b.facade.ground === 'diner') dinerFront(ctx, view, b, face, frame, door);
  else if (b.facade.ground === 'shop') shopFront(ctx, view, b, face, frame, door);
  else if (b.facade.ground === 'stoop') stoopFront(ctx, view, b, face, frame, door);
  else if (b.facade.ground === 'lobby') lobbyFront(ctx, view, b, face, frame, door);
  else
    bays(face.width, b.facade.bays).forEach((s, i) => {
      drawWindow(ctx, view, face, { s, t: SILL, w: WIN_W, h: WIN_H }, bit(b.facade.litBits, 20 + i), frame);
    });
  upperStoreys(ctx, view, b, face, frame);
  cornice(ctx, view, b, face);
}

/** The side: a party wall, or windows down it for a building that stands free. */
export function drawSide(ctx: Ctx, view: View, b: Building, face: Face, frame: Frame): void {
  patch(ctx, view, face, [0, 0, face.width, face.height], b.facade.wall);
  if (b.facade.wall === BUILDING.brick) courses(ctx, view, face, BUILDING.brickDark);
  if (b.facade.sides === 'windows') {
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
