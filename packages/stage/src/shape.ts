/**
 * Paths as plain lists of commands, replayed into a canvas. Dirtbag builds its figures as
 * `Path2D`s; a list works the same way (one outline pass, then one fill pass) and also runs in
 * Node, so the drawing tests can check every number a frame would draw.
 */
import { type Pt, TAU } from './geom.ts';

export type Cmd =
  | { readonly k: 'M' | 'L'; readonly x: number; readonly y: number }
  | {
      readonly k: 'A';
      readonly x: number;
      readonly y: number;
      readonly r: number;
      readonly a0: number;
      readonly a1: number;
      readonly ccw: boolean;
    }
  | {
      readonly k: 'E';
      readonly x: number;
      readonly y: number;
      readonly rx: number;
      readonly ry: number;
      readonly rot: number;
    }
  | { readonly k: 'Q'; readonly cx: number; readonly cy: number; readonly x: number; readonly y: number }
  | { readonly k: 'Z' };

export type Shape = Cmd[];

export const moveTo = (s: Shape, p: Pt): void => {
  s.push({ k: 'M', x: p.x, y: p.y });
};
export const lineTo = (s: Shape, p: Pt): void => {
  s.push({ k: 'L', x: p.x, y: p.y });
};

/** A closed polygon through screen points. */
export function poly(points: readonly Pt[]): Shape {
  const s: Shape = [];
  points.forEach((p, i) => {
    if (i === 0) moveTo(s, p);
    else lineTo(s, p);
  });
  s.push({ k: 'Z' });
  return s;
}

export const disc = (c: Pt, r: number): Shape => [
  { k: 'M', x: c.x + r, y: c.y },
  { k: 'A', x: c.x, y: c.y, r, a0: 0, a1: TAU, ccw: false },
  { k: 'Z' },
];

/** A whole ellipse, turned by `rot`: a head seen at an angle, a shadow on the ground. */
export const oval = (c: Pt, rx: number, ry: number, rot = 0): Shape => [{ k: 'E', x: c.x, y: c.y, rx, ry, rot }];

/**
 * Circles at a and b joined by their outer tangents: a limb that tapers. From Dirtbag's
 * `people.ts` `capsule`.
 */
export function capsule(a: Pt, ra: number, b: Pt, rb: number): Shape {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(ra - rb) + 0.01) return ra > rb ? disc(a, ra) : disc(b, rb);
  const th = Math.atan2(dy, dx);
  const ph = Math.acos((ra - rb) / d);
  return [
    { k: 'M', x: a.x + ra * Math.cos(th + ph), y: a.y + ra * Math.sin(th + ph) },
    { k: 'L', x: b.x + rb * Math.cos(th + ph), y: b.y + rb * Math.sin(th + ph) },
    { k: 'A', x: b.x, y: b.y, r: rb, a0: th + ph, a1: th - ph, ccw: true },
    { k: 'L', x: a.x + ra * Math.cos(th - ph), y: a.y + ra * Math.sin(th - ph) },
    { k: 'A', x: a.x, y: a.y, r: ra, a0: th - ph, a1: th + ph, ccw: true },
    { k: 'Z' },
  ];
}

export function trace(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.beginPath();
  for (const c of shape) {
    switch (c.k) {
      case 'M':
        ctx.moveTo(c.x, c.y);
        break;
      case 'L':
        ctx.lineTo(c.x, c.y);
        break;
      case 'A':
        ctx.arc(c.x, c.y, c.r, c.a0, c.a1, c.ccw);
        break;
      case 'E':
        ctx.moveTo(c.x + c.rx * Math.cos(c.rot), c.y + c.rx * Math.sin(c.rot));
        ctx.ellipse(c.x, c.y, c.rx, c.ry, c.rot, 0, TAU);
        break;
      case 'Q':
        ctx.quadraticCurveTo(c.cx, c.cy, c.x, c.y);
        break;
      case 'Z':
        ctx.closePath();
        break;
    }
  }
}

export function fillShape(ctx: CanvasRenderingContext2D, shape: Shape, color: string): void {
  trace(ctx, shape);
  ctx.fillStyle = color;
  ctx.fill();
}

export type Inked = { readonly shape: Shape; readonly fill: string };

/**
 * Inks a group as one silhouette: every outline first, then every fill over them, so parts
 * that touch show no seam. From Dirtbag's `people.ts` `inked`.
 */
export function inked(ctx: CanvasRenderingContext2D, pieces: readonly Inked[], ink: string, width: number): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2 * width;
  for (const p of pieces) {
    trace(ctx, p.shape);
    ctx.stroke();
  }
  for (const p of pieces) fillShape(ctx, p.shape, p.fill);
}
