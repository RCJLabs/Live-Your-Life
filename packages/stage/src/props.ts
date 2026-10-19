/**
 * The street's furniture: lamps, trees, a bench, a pole sign, a diner's patio. Each is a few
 * boxes and discs, placed by the block's rules. Lamps and the sign light up after dark.
 */
import { drawBox, leftFace, rightFace } from './box.ts';
import { lit } from './color.ts';
import { drawDisc, drawDrum } from './fixture.ts';
import { box } from './geom.ts';
import { project } from './iso.ts';
import { LIGHTS_ON } from './light.ts';
import { LIT, STREET } from './palette.ts';
import { disc, fillShape } from './shape.ts';
import type { Piece } from './sort.ts';
import { paintText } from './text.ts';
import { type Prop, YAW } from './types.ts';

type Draw = Piece['draw'];

const LAMP_H = 4.6;

function lamp(p: Prop): Piece {
  const reach = 1.2;
  const dx = Math.round(Math.cos(YAW[p.facing])) * reach;
  const dy = Math.round(Math.sin(YAW[p.facing])) * reach;
  const head = { x: p.x + dx, y: p.y + dy };
  const draw: Draw = (ctx, view, frame) => {
    drawBox(ctx, view, box(p.x - 0.07, p.y - 0.07, 0, p.x + 0.07, p.y + 0.07, LAMP_H), STREET.pole);
    drawBox(
      ctx,
      view,
      box(
        Math.min(p.x, head.x) - 0.04,
        Math.min(p.y, head.y) - 0.04,
        LAMP_H - 0.08,
        Math.max(p.x, head.x) + 0.04,
        Math.max(p.y, head.y) + 0.04,
        LAMP_H,
      ),
      STREET.pole,
    );
    const on = frame.dark > LIGHTS_ON;
    drawBox(ctx, view, box(head.x - 0.25, head.y - 0.14, LAMP_H - 0.22, head.x + 0.25, head.y + 0.14, LAMP_H - 0.06), {
      top: STREET.lampHead,
      left: on ? LIT : STREET.lampHead,
      right: on ? LIT : STREET.lampHead,
    });
    if (on) {
      const ground = project(view, { ...head, z: 0 });
      frame.lights.push({ kind: 'pool', at: ground, radius: 4.2 * Math.SQRT2 * view.u, strength: 0.9, flat: true });
      frame.lights.push({
        kind: 'pool',
        at: project(view, { ...head, z: LAMP_H - 0.2 }),
        radius: 0.9 * view.u,
        strength: 1,
        glow: true,
      });
    }
  };
  const x0 = Math.min(p.x, head.x) - 0.25;
  const y0 = Math.min(p.y, head.y) - 0.25;
  return { box: box(x0, y0, 0, Math.max(p.x, head.x) + 0.25, Math.max(p.y, head.y) + 0.25, LAMP_H), draw };
}

function tree(p: Prop): Piece {
  const k = p.size ?? 1;
  const draw: Draw = (ctx, view) => {
    drawBox(ctx, view, box(p.x - 0.12, p.y - 0.12, 0, p.x + 0.12, p.y + 0.12, 2.4 * k), STREET.trunk);
    const s = Math.SQRT2 * view.u;
    const blobs: [number, number, number, number, string][] = [
      [-0.5, 0.3, 3.0, 1.0, STREET.leaves],
      [0.55, -0.2, 3.2, 1.0, STREET.leaves],
      [0, -0.6, 3.9, 0.95, STREET.leaves],
      [0.1, 0.5, 3.8, 0.9, STREET.leavesLight],
      [-0.3, -0.2, 4.3, 0.85, STREET.leavesLight],
    ];
    for (const [dx, dy, z, r, color] of blobs) {
      fillShape(ctx, disc(project(view, { x: p.x + dx * k, y: p.y + dy * k, z: z * k }), r * k * s), lit(color, 0.95));
    }
  };
  return { box: box(p.x - 1.3 * k, p.y - 1.3 * k, 0, p.x + 1.3 * k, p.y + 1.3 * k, 5 * k), draw };
}

function bench(p: Prop): Piece {
  const along = p.facing === 'n' || p.facing === 's';
  const w = along ? 1.8 : 0.5;
  const d = along ? 0.5 : 1.8;
  const b = box(p.x - w / 2, p.y - d / 2, 0, p.x + w / 2, p.y + d / 2, 0.9);
  const draw: Draw = (ctx, view) => {
    drawBox(ctx, view, box(b.x0 + 0.1, b.y0 + 0.1, 0, b.x1 - 0.1, b.y1 - 0.1, 0.42), STREET.benchFrame);
    drawBox(ctx, view, box(b.x0, b.y0, 0.42, b.x1, b.y1, 0.48), STREET.bench);
    const back =
      p.facing === 's' ? box(b.x0, b.y0, 0.48, b.x1, b.y0 + 0.08, 0.9) : box(b.x0, b.y0, 0.48, b.x0 + 0.08, b.y1, 0.9);
    drawBox(ctx, view, back, STREET.bench);
  };
  return { box: b, draw };
}

/** A diner's sign on a pole by the curb: a cup and a word, lit after dark. */
function poleSign(p: Prop): Piece {
  const h = 5.4;
  const broadSouth = p.facing === 's';
  const sign = broadSouth
    ? box(p.x - 0.95, p.y - 0.12, h - 1.3, p.x + 0.95, p.y + 0.12, h)
    : box(p.x - 0.12, p.y - 0.95, h - 1.3, p.x + 0.12, p.y + 0.95, h);
  const draw: Draw = (ctx, view, frame) => {
    drawBox(ctx, view, box(p.x - 0.09, p.y - 0.09, 0, p.x + 0.09, p.y + 0.09, h - 1.3), STREET.pole);
    const on = frame.dark > LIGHTS_ON;
    const color = p.sign?.color ?? '#C9473A';
    drawBox(ctx, view, sign, on ? LIT : color);
    const face = broadSouth ? leftFace(sign) : rightFace(sign);
    if (p.sign)
      paintText(
        ctx,
        view,
        face,
        p.sign.text,
        { s: face.width / 2, t: face.height * 0.42, height: 0.62, maxWidth: face.width * 0.9 },
        p.sign.ink,
      );
    // A cup above the word.
    const cup = { x: (sign.x0 + sign.x1) / 2, y: (sign.y0 + sign.y1) / 2 };
    drawDrum(ctx, view, { x: cup.x, y: cup.y }, 0.22, h, h + 0.32, '#F3EBD8');
    drawDisc(ctx, view, cup, 0.17, h + 0.33, '#5A3A26');
    if (on) {
      const mid = project(view, { ...cup, z: h - 0.65 });
      frame.lights.push({ kind: 'pool', at: mid, radius: 1.6 * Math.SQRT2 * view.u, strength: 0.95, glow: true });
    }
  };
  return {
    box: box(
      Math.min(sign.x0, p.x - 0.1),
      Math.min(sign.y0, p.y - 0.1),
      0,
      Math.max(sign.x1, p.x + 0.1),
      Math.max(sign.y1, p.y + 0.1),
      h + 0.35,
    ),
    draw,
  };
}

function patioTable(p: Prop): Piece {
  const draw: Draw = (ctx, view) => {
    drawBox(ctx, view, box(p.x - 0.03, p.y - 0.03, 0, p.x + 0.03, p.y + 0.03, 0.72), STREET.pole);
    drawDrum(ctx, view, p, 0.36, 0.72, 0.76, '#E9E2D2');
    drawDisc(ctx, view, { x: p.x + 0.08, y: p.y - 0.06 }, 0.11, 0.77, '#FFFFFF');
  };
  return { box: box(p.x - 0.36, p.y - 0.36, 0, p.x + 0.36, p.y + 0.36, 0.78), draw };
}

function patioChair(p: Prop): Piece {
  const F = { x: Math.round(Math.cos(YAW[p.facing])), y: Math.round(Math.sin(YAW[p.facing])) };
  const b = box(p.x - 0.22, p.y - 0.22, 0, p.x + 0.22, p.y + 0.22, 0.9);
  const draw: Draw = (ctx, view) => {
    drawBox(ctx, view, box(b.x0 + 0.04, b.y0 + 0.04, 0, b.x1 - 0.04, b.y1 - 0.04, 0.42), STREET.benchFrame);
    drawBox(ctx, view, box(b.x0, b.y0, 0.42, b.x1, b.y1, 0.46), '#C9473A');
    const bx = p.x - F.x * 0.2;
    const by = p.y - F.y * 0.2;
    drawBox(
      ctx,
      view,
      box(
        bx - (F.x === 0 ? 0.22 : 0.03),
        by - (F.y === 0 ? 0.22 : 0.03),
        0.46,
        bx + (F.x === 0 ? 0.22 : 0.03),
        by + (F.y === 0 ? 0.22 : 0.03),
        0.9,
      ),
      '#C9473A',
    );
  };
  return { box: b, draw };
}

function hydrant(p: Prop): Piece {
  const draw: Draw = (ctx, view) => {
    drawDrum(ctx, view, p, 0.13, 0, 0.62, STREET.hydrant);
    drawDisc(ctx, view, p, 0.09, 0.7, STREET.hydrant, 1.1);
  };
  return { box: box(p.x - 0.15, p.y - 0.15, 0, p.x + 0.15, p.y + 0.15, 0.72), draw };
}

export function propPiece(p: Prop): Piece {
  switch (p.kind) {
    case 'lamp':
      return lamp(p);
    case 'tree':
      return tree(p);
    case 'bench':
      return bench(p);
    case 'pole-sign':
      return poleSign(p);
    case 'patio-table':
      return patioTable(p);
    case 'patio-chair':
      return patioChair(p);
    case 'hydrant':
      return hydrant(p);
  }
}
