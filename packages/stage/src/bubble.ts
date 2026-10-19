/**
 * Speech bubbles: how a figure too small for a face shows what it feels (docs/DESIGN.md,
 * Presentation; bubbles are part of Dirtbag's Mix). Drawn last, in screen space, at a size
 * that stays readable however far the camera is out.
 */
import type { Pt } from './geom.ts';
import { ACCENT, CREAM, INK } from './palette.ts';
import { type Shape, trace } from './shape.ts';
import type { BubbleKind } from './types.ts';

/** A bubble's size in CSS pixels for a figure drawn at `scale` pixels a metre, kept readable. */
export const bubbleSize = (scale: number): number => Math.min(26, Math.max(15, 0.5 * scale));

function burst(c: Pt, r: number, points: number, wobble: number): Shape {
  const s: Shape = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const k = i % 2 === 0 ? 1 : 1 - wobble;
    s.push({ k: i === 0 ? 'M' : 'L', x: c.x + Math.cos(a) * r * k * 1.25, y: c.y + Math.sin(a) * r * k });
  }
  s.push({ k: 'Z' });
  return s;
}

function stroke(ctx: CanvasRenderingContext2D, shape: Shape, color: string, width: number): void {
  trace(ctx, shape);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function zigzag(c: Pt, w: number, h: number): Shape {
  const s: Shape = [{ k: 'M', x: c.x - w, y: c.y }];
  for (let i = 1; i <= 4; i++) s.push({ k: 'L', x: c.x - w + (2 * w * i) / 4, y: c.y + (i % 2 === 0 ? h : -h) });
  return s;
}

/** A shout: a jagged bubble with an angry squiggle, its tail to the speaker's head. */
function drawArgue(ctx: CanvasRenderingContext2D, head: Pt, size: number, t: number, ink: number): void {
  const pop = Math.min(1, t * 6);
  const r = (size / 2) * (0.6 + 0.4 * pop);
  const c = { x: head.x + size * 0.55, y: head.y - size * 0.95 };
  const tail: Shape = [
    { k: 'M', x: c.x - r * 0.45, y: c.y + r * 0.55 },
    { k: 'L', x: head.x + 1, y: head.y - 2 },
    { k: 'L', x: c.x - r * 0.05, y: c.y + r * 0.75 },
    { k: 'Z' },
  ];
  const body = burst(c, r, 9, 0.22);
  for (const shape of [tail, body]) stroke(ctx, shape, INK, 2 * ink + 1);
  for (const shape of [tail, body]) {
    trace(ctx, shape);
    ctx.fillStyle = CREAM;
    ctx.fill();
  }
  stroke(ctx, zigzag(c, r * 0.55, r * 0.22), ACCENT, Math.max(1.4, r * 0.18));
}

/** Sleep: letters rising from the head, one after another. */
function drawSleep(ctx: CanvasRenderingContext2D, head: Pt, size: number, t: number, ink: number): void {
  for (let i = 0; i < 3; i++) {
    const life = (t / 2.4 + i / 3) % 1;
    const h = size * (0.32 + 0.22 * life);
    const x = head.x + size * (0.25 + 0.35 * life) + i * 1.5;
    const y = head.y - size * (0.25 + 1.1 * life);
    const z: Shape = [
      { k: 'M', x: x - h / 2, y: y - h / 2 },
      { k: 'L', x: x + h / 2, y: y - h / 2 },
      { k: 'L', x: x - h / 2, y: y + h / 2 },
      { k: 'L', x: x + h / 2, y: y + h / 2 },
    ];
    ctx.globalAlpha = Math.min(1, (1 - life) * 2);
    stroke(ctx, z, INK, Math.max(2.2, h * 0.28) + 2 * ink);
    stroke(ctx, z, CREAM, Math.max(1.2, h * 0.16));
  }
  ctx.globalAlpha = 1;
}

/** `t` is seconds since the bubble appeared, for its pop and its letters. */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  kind: BubbleKind,
  head: Pt,
  size: number,
  t: number,
  ink: number,
): void {
  if (kind === 'argue') drawArgue(ctx, head, size, t, ink);
  else drawSleep(ctx, head, size, t, ink);
}
