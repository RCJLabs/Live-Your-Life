/**
 * Buildings as pieces for the depth sort. Whole, a building is one box with its facade and
 * roof. Cut away (D18, the Sims' cutaway), it comes apart: the far walls stand a storey high
 * showing their inside, the near walls are cut to a stub below a standing person's hips
 * (Space-Wrecked cuts at 0.55 m, `battleScene.js`), the storeys above go, and what is inside
 * sorts with the people. Only a building with an interior template can be cut.
 */
import { drawBox, fillFace, leftFace, patch, rightFace, topFace } from './box.ts';
import { lit, shadeHex } from './color.ts';
import { drawFront, drawSide } from './facade.ts';
import { type Box3, box } from './geom.ts';
import { project } from './iso.ts';
import { BUILDING } from './palette.ts';
import { fillShape, poly } from './shape.ts';
import type { Piece } from './sort.ts';
import type { Building, Interior, Room } from './types.ts';

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

/** A far wall of a building with rooms: its inside face painted room by room, where each meets it. */
function paintedWall(
  bounds: Box3,
  colors: { left?: string; right?: string; cap: string },
  inside: 'left' | 'right',
  base: string,
  rooms: readonly Room[],
): Piece {
  return {
    box: bounds,
    draw(ctx, view) {
      if (colors.left) fillFace(ctx, view, leftFace(bounds), colors.left);
      if (colors.right) fillFace(ctx, view, rightFace(bounds), colors.right);
      const face = inside === 'left' ? leftFace(bounds) : rightFace(bounds);
      fillFace(ctx, view, face, base);
      for (const r of rooms) {
        // A left face's s runs east from its west end; a right face's runs north from its south end.
        const [s0, s1] =
          inside === 'left' ? [r.x0 - bounds.x0, r.x1 - bounds.x0] : [bounds.y1 - r.y1, bounds.y1 - r.y0];
        const from = Math.max(0, s0);
        const to = Math.min(face.width, s1);
        if (to > from) patch(ctx, view, face, [from, 0, to, face.height], r.wall);
      }
      fillFace(ctx, view, topFace(bounds), colors.cap, 1.6);
    },
  };
}

/** How high a way out's opening stands; the far wall carries on above it as a lintel. */
const DOOR_HEIGHT = 2.1;
/** What is left of [from, to] once the gaps are cut out of it. */
function spansBetween(from: number, to: number, gaps: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  let at = from;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > at) out.push([at, Math.min(a, to)]);
    at = Math.max(at, b);
  }
  if (to > at) out.push([at, to]);
  return out.filter(([a, b]) => b - a > 1e-6);
}

/**
 * The cut of a building with rooms (M1.2): the far walls show each room's colour, the inside walls
 * are cut low like the near ones, and a way out is an opening: through a far wall under a lintel,
 * or a gap in a near one. Openings, not doors drawn on the wall, so someone walking through one
 * is never inside a wall's box, where the depth sort could put the wall in front of them.
 */
function cutAwayRooms(b: Building, i: Interior): Piece[] {
  const rooms = i.rooms ?? [];
  const h = b.storeyHeight;
  const cap = capColor(b.facade.wall);
  const outside = b.facade.ground === 'diner' ? BUILDING.dinerRed : b.facade.wall;
  const near = 1e-6;
  const north = rooms.filter((r) => r.y0 <= b.y0 + WALL + near);
  const west = rooms.filter((r) => r.x0 <= b.x0 + WALL + near);
  const corner = rooms.findLast((r) => r.x1 >= b.x1 - WALL - near && r.y0 <= b.y0 + WALL + near)?.wall ?? i.wall;
  const doors = i.doors ?? [];
  const gaps = (side: 'n' | 'e' | 's' | 'w'): (readonly [number, number])[] =>
    doors
      .filter((d) => d.wall === side)
      .map((d) => {
        const mid = side === 's' || side === 'n' ? d.x : d.y;
        return [mid - d.width / 2, mid + d.width / 2] as const;
      });
  const front = b.x0 + i.door;
  const pieces: Piece[] = [
    wall(box(b.x1 - WALL, b.y0, 0, b.x1, b.y0 + WALL, h), { right: b.facade.wall, left: corner, cap }),
  ];
  // The far walls stand, opened where a way out goes through them, a lintel over each opening.
  for (const [s, e] of spansBetween(b.y0, b.y1, gaps('w')))
    pieces.push(paintedWall(box(b.x0, s, 0, b.x0 + WALL, e, h), { left: b.facade.wall, cap }, 'right', i.wall, west));
  for (const [s, e] of gaps('w'))
    pieces.push(paintedWall(box(b.x0, s, DOOR_HEIGHT, b.x0 + WALL, e, h), { cap }, 'right', i.wall, west));
  for (const [s, e] of spansBetween(b.x0 + WALL, b.x1 - WALL, gaps('n')))
    pieces.push(paintedWall(box(s, b.y0, 0, e, b.y0 + WALL, h), { cap }, 'left', i.wall, north));
  for (const [s, e] of gaps('n'))
    pieces.push(paintedWall(box(s, b.y0, DOOR_HEIGHT, e, b.y0 + WALL, h), { cap }, 'left', i.wall, north));
  for (const [s, e] of spansBetween(b.x0 + WALL, b.x1 - WALL, [[front - 0.5, front + 0.5], ...gaps('s')]))
    pieces.push(wall(box(s, b.y1 - WALL, 0, e, b.y1, CUT), { left: outside, cap }));
  for (const [s, e] of spansBetween(b.y0 + WALL, b.y1, gaps('e')))
    pieces.push(wall(box(b.x1 - WALL, s, 0, b.x1, e, CUT), { left: outside, right: b.facade.wall, cap }));
  for (const p of i.partitions ?? [])
    pieces.push(wall(box(p.x0, p.y0, 0, p.x1, p.y1, CUT), { left: p.face, right: p.face, cap: capColor(p.face) }));
  return pieces;
}

function cutAway(b: Building): Piece[] {
  if (b.interior?.rooms) return cutAwayRooms(b, b.interior);
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
