/**
 * The depth sort: the painter's order for pieces of the world, each a box. Two pieces that
 * overlap on the screen are ordered by an axis that separates them: the one with the larger x,
 * y or z is nearer the camera and draws later. For pieces that overlap on screen, two axes can't
 * disagree (no view ray reaches both, otherwise), so only boxes that pass through each other
 * need the fallback, their middles' nearness. It works because pieces stay small or thin (a
 * wall, a table, a person), the condition Space-Wrecked's painter names (`src/render/painter.js`).
 *
 * The order doesn't depend on the zoom or the pan, only on the view's direction, so the still
 * pieces are sorted once and the people are slotted in each frame.
 */
import { type Box3, overlaps, type Rect } from './geom.ts';
import { nearness, screenRect, type View } from './iso.ts';
import type { Frame } from './types.ts';

export interface Piece {
  readonly box: Box3;
  readonly draw: (ctx: CanvasRenderingContext2D, view: View, frame: Frame) => void;
  /** For boxes that pass through each other: the larger draws later. */
  readonly bias?: number;
}

const UNIT: View = { u: 1, ox: 0, oy: 0, width: 0, height: 0 };
const EPS = 1e-6;

/** True if `a` draws before `b`, false if after, null if the boxes pass through each other. */
export function behind(a: Box3, b: Box3): boolean | null {
  if (a.x1 <= b.x0 + EPS) return true;
  if (b.x1 <= a.x0 + EPS) return false;
  if (a.y1 <= b.y0 + EPS) return true;
  if (b.y1 <= a.y0 + EPS) return false;
  if (a.z1 <= b.z0 + EPS) return true;
  if (b.z1 <= a.z0 + EPS) return false;
  return null;
}

const middle = (b: Box3) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: (b.z0 + b.z1) / 2 });

const keyOf = (p: Piece): number => nearness(middle(p.box)) + (p.bias ?? 0);

const before = (a: Piece, b: Piece): boolean => behind(a.box, b.box) ?? keyOf(a) <= keyOf(b);

/** Pieces in the order they draw, with what the sort needs to slot more in. */
export interface Ordered {
  readonly pieces: Piece[];
  readonly rects: Rect[];
}

/** The painter's order for a set of pieces: a topological sort of "draws before". */
export function orderPieces(input: readonly Piece[]): Ordered {
  const n = input.length;
  const rects = input.map((p) => screenRect(UNIT, p.box));
  const keys = input.map(keyOf);
  const next: number[][] = input.map(() => []);
  const waiting = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!overlaps(rects[i] as Rect, rects[j] as Rect)) continue;
      const [first, then] = before(input[i] as Piece, input[j] as Piece) ? [i, j] : [j, i];
      (next[first] as number[]).push(then);
      waiting[then] = (waiting[then] as number) + 1;
    }
  }
  // Kahn's algorithm. Of the pieces ready to draw, the farthest goes first; a cycle, which only
  // boxes passing through each other can make, is broken at its farthest piece.
  const done = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  while (order.length < n) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (done[i] || waiting[i] !== 0) continue;
      if (pick < 0 || (keys[i] as number) < (keys[pick] as number)) pick = i;
    }
    if (pick < 0) {
      for (let i = 0; i < n; i++) {
        if (!done[i] && (pick < 0 || (keys[i] as number) < (keys[pick] as number))) pick = i;
      }
    }
    done[pick] = true;
    order.push(pick);
    for (const j of next[pick] as number[]) waiting[j] = (waiting[j] as number) - 1;
  }
  return { pieces: order.map((i) => input[i] as Piece), rects: order.map((i) => rects[i] as Rect) };
}

/**
 * Slots a moving piece into an order: after the last piece it must draw in front of, so a
 * person passes behind a wall and in front of the stove. If no place satisfies every piece
 * (only interpenetrating boxes make that), it draws in front of all that must be behind it.
 */
export function insertPiece(ordered: Ordered, piece: Piece): void {
  const rect = screenRect(UNIT, piece.box);
  let lastBehind = -1;
  let firstFront = ordered.pieces.length;
  ordered.pieces.forEach((other, i) => {
    if (!overlaps(rect, ordered.rects[i] as Rect)) return;
    if (before(other, piece)) lastBehind = Math.max(lastBehind, i);
    else firstFront = Math.min(firstFront, i);
  });
  const at = lastBehind >= 0 ? lastBehind + 1 : firstFront;
  ordered.pieces.splice(at, 0, piece);
  ordered.rects.splice(at, 0, rect);
}
