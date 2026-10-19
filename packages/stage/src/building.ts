/**
 * Buildings as pieces for the depth sort. Whole, a building is one box with its facade and
 * roof. Cut away (D18, the Sims' cutaway), it comes apart: the far walls stand a storey high
 * showing their inside, the near walls are cut to a stub below a standing person's hips
 * (Space-Wrecked cuts at 0.55 m, `battleScene.js`), the storeys above go, and what is inside
 * sorts with the people. Only a building with an interior template can be cut.
 */
import { drawBox, fillFace, leftFace, rightFace, topFace } from './box.ts';
import { lit, shadeHex } from './color.ts';
import { drawFront, drawSide } from './facade.ts';
import { box } from './geom.ts';
import { project } from './iso.ts';
import { BUILDING } from './palette.ts';
import { fillShape, poly } from './shape.ts';
import type { Piece } from './sort.ts';
import type { Building } from './types.ts';

/** Wall thickness, and how high the near walls stand when cut. */
export const WALL = 0.15;
export const CUT = 0.55;
const PARAPET = 0.25;
const AWNING_DEPTH = 1.1;

export const heightOf = (b: Building): number => b.storeys * b.storeyHeight + PARAPET;

/** The cut top of a wall: darker than the wall, as a section is. */
const capColor = (hex: string) => shadeHex(hex, 0.55);

function solid(b: Building): Piece {
  const h = heightOf(b);
  const whole = box(b.x0, b.y0, 0, b.x1, b.y1, h);
  return {
    box: whole,
    draw(ctx, view, frame) {
      drawFront(ctx, view, b, leftFace(whole), frame);
      drawSide(ctx, view, b, rightFace(whole), frame);
      // The roof: a parapet's edge round a flat roof, and a unit on it.
      fillFace(ctx, view, topFace(whole), BUILDING.roofEdge);
      const inset = 0.3;
      const corners = [
        { x: b.x0 + inset, y: b.y0 + inset, z: h },
        { x: b.x1 - inset, y: b.y0 + inset, z: h },
        { x: b.x1 - inset, y: b.y1 - inset, z: h },
        { x: b.x0 + inset, y: b.y1 - inset, z: h },
      ].map((p) => project(view, p));
      fillShape(ctx, poly(corners), lit(b.facade.roof, 0.9));
      const ux = b.x0 + (b.x1 - b.x0) * 0.62;
      const uy = b.y0 + (b.y1 - b.y0) * 0.4;
      drawBox(ctx, view, box(ux, uy, h, ux + 1.4, uy + 1.0, h + 0.8), BUILDING.chrome);
    },
  };
}

function awning(b: Building): Piece[] {
  const a = b.facade.awning;
  if (!a) return [];
  const width = (b.x1 - b.x0) * 0.8;
  const x0 = b.x0 + (b.x1 - b.x0 - width) / 2;
  const z = 2.75;
  const shade = box(x0, b.y1, z, x0 + width, b.y1 + AWNING_DEPTH, z + 0.6);
  return [
    {
      box: shade,
      draw(ctx, view) {
        // A sloped canvas in stripes, and its valance.
        const stripes = Math.max(4, Math.round(width / 0.5));
        for (let i = 0; i < stripes; i++) {
          const s0 = x0 + (width * i) / stripes;
          const s1 = x0 + (width * (i + 1)) / stripes;
          const color = i % 2 === 0 ? a.color : a.stripe;
          const slope = [
            { x: s0, y: b.y1, z: z + 0.6 },
            { x: s1, y: b.y1, z: z + 0.6 },
            { x: s1, y: b.y1 + AWNING_DEPTH, z: z + 0.15 },
            { x: s0, y: b.y1 + AWNING_DEPTH, z: z + 0.15 },
          ].map((p) => project(view, p));
          fillShape(ctx, poly(slope), lit(color, 0.98));
          const valance = [
            { x: s0, y: b.y1 + AWNING_DEPTH, z: z + 0.15 },
            { x: s1, y: b.y1 + AWNING_DEPTH, z: z + 0.15 },
            { x: s1, y: b.y1 + AWNING_DEPTH, z },
            { x: s0, y: b.y1 + AWNING_DEPTH, z },
          ].map((p) => project(view, p));
          fillShape(ctx, poly(valance), lit(color, 0.86));
        }
      },
    },
  ];
}

/** A wall as a box, its visible faces in the colours given, its top cut. */
function wall(bounds: ReturnType<typeof box>, colors: { left?: string; right?: string; cap: string }): Piece {
  return {
    box: bounds,
    draw(ctx, view) {
      if (colors.left) fillFace(ctx, view, leftFace(bounds), colors.left);
      if (colors.right) fillFace(ctx, view, rightFace(bounds), colors.right);
      fillFace(ctx, view, topFace(bounds), colors.cap, 1.6);
    },
  };
}

function cutAway(b: Building): Piece[] {
  const inside = b.interior?.wall ?? BUILDING.wallInside;
  const outside = b.facade.ground === 'diner' ? BUILDING.dinerRed : b.facade.wall;
  const h = b.storeyHeight;
  const cap = capColor(b.facade.wall);
  const door = b.x0 + (b.interior?.door ?? (b.x1 - b.x0) / 2);
  const pieces: Piece[] = [
    // The far walls stand: their inside faces the camera; their ends show the outside.
    wall(box(b.x0, b.y0, 0, b.x0 + WALL, b.y1, h), { left: b.facade.wall, right: inside, cap }),
    wall(box(b.x0 + WALL, b.y0, 0, b.x1 - WALL, b.y0 + WALL, h), { left: inside, cap }),
    wall(box(b.x1 - WALL, b.y0, 0, b.x1, b.y0 + WALL, h), { right: b.facade.wall, left: inside, cap }),
    // The near walls are cut down, with a gap at the door.
    wall(box(b.x0 + WALL, b.y1 - WALL, 0, door - 0.5, b.y1, CUT), { left: outside, cap }),
    wall(box(door + 0.5, b.y1 - WALL, 0, b.x1 - WALL, b.y1, CUT), { left: outside, cap }),
    wall(box(b.x1 - WALL, b.y0 + WALL, 0, b.x1, b.y1, CUT), { left: outside, right: b.facade.wall, cap }),
  ];
  return pieces;
}

/** The pieces a building draws as: whole, or cut away to show its ground floor. */
export function buildingPieces(b: Building, cut: boolean): Piece[] {
  if (cut && b.interior) return cutAway(b);
  return [solid(b), ...awning(b)];
}
