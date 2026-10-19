/**
 * The fittings M1.2's rooms add to the furniture kit: a shower, a toilet, a sink, a dish pit,
 * shelving and a flight of stairs. Like the rest of the kit, each is a few boxes and discs in
 * flat colour, laid out in its own frame (fixture.ts), so it turns with the way it faces.
 */
import { drawBox } from './box.ts';
import { at, drawDisc, drawDrum, extent, part, slab } from './fixture.ts';
import { nearness } from './iso.ts';
import { BUILDING, INSIDE } from './palette.ts';
import type { Piece } from './sort.ts';
import type { Fixture } from './types.ts';

type Draw = Piece['draw'];

/** A tray, a glass screen down one side, the head, and the drain. */
const shower: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.08]), INSIDE.porcelain);
  drawDisc(ctx, view, at(f, 0, 0), 0.05, 0.085, INSIDE.steelDark);
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.06], [-0.05, 0.05], [1.75, 1.95]), INSIDE.steel);
  drawDrum(ctx, view, at(f, -depth / 2 + 0.15, 0), 0.08, 1.85, 1.9, INSIDE.steel);
  ctx.globalAlpha = 0.45;
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [width / 2 - 0.03, width / 2], [0.08, 2]), BUILDING.glass);
  ctx.globalAlpha = 1;
};

/** The cistern against the wall, the bowl out in front of it, and its seat. */
const toilet: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  const tank = part(f, [-depth / 2, -depth / 2 + 0.2], [-width / 2, width / 2], [0.35, 0.8]);
  const bowl = at(f, 0.08, 0);
  const tankFirst = nearness(at(f, -depth / 2, 0)) < nearness(at(f, depth / 2, 0));
  if (tankFirst) slab(ctx, view, tank, INSIDE.porcelain);
  slab(ctx, view, part(f, [-depth / 2 + 0.1, 0.05], [-0.1, 0.1], [0, 0.35]), INSIDE.porcelain);
  drawDrum(ctx, view, bowl, 0.18, 0.05, 0.4, INSIDE.porcelain);
  drawDisc(ctx, view, bowl, 0.12, 0.41, INSIDE.steel);
  if (!tankFirst) slab(ctx, view, tank, INSIDE.porcelain);
};

/** A basin on a pedestal. */
const sink: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.18], [-0.09, 0.09], [0, 0.78]), INSIDE.porcelain);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0.78, 0.88]), INSIDE.porcelain);
  slab(
    ctx,
    view,
    part(f, [-depth / 2 + 0.08, depth / 2 - 0.06], [-width / 2 + 0.08, width / 2 - 0.08], [0.88, 0.885]),
    INSIDE.steel,
  );
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.06], [-0.02, 0.02], [0.88, 1.02]), INSIDE.steelDark);
};

/** A steel sink unit with two basins, its spray arm, and a rack of plates drying. */
const dish: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.9]), INSIDE.steel);
  for (const s of [-width / 2 + 0.1, 0.05])
    slab(
      ctx,
      view,
      part(f, [-depth / 2 + 0.1, depth / 2 - 0.1], [s, s + width / 2 - 0.15], [0.9, 0.905]),
      INSIDE.steelDark,
    );
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.05], [-0.02, 0.02], [0.9, 1.55]), INSIDE.steelDark);
  for (let k = 0; k < 4; k++) drawDisc(ctx, view, at(f, 0, width / 2 - 0.25), 0.13, 0.92 + k * 0.04, INSIDE.white);
};

/** Wire shelving, four levels, the stock on them in the seed-free colours of a dry store. */
const shelves: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  const levels = [0.12, 0.62, 1.12, 1.62];
  for (const s of [-width / 2, width / 2 - 0.03])
    slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.03], [s, s + 0.03], [0, 1.8]), INSIDE.wire);
  levels.forEach((z, n) => {
    slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [z, z + 0.03]), INSIDE.wire);
    for (let s = -width / 2 + 0.06, k = n; s < width / 2 - 0.25; s += 0.3, k++) {
      const color = INSIDE.stock[k % INSIDE.stock.length] as string;
      slab(ctx, view, part(f, [-depth / 2 + 0.05, depth / 2 - 0.08], [s, s + 0.24], [z + 0.03, z + 0.3]), color);
    }
  });
  for (const s of [-width / 2, width / 2 - 0.03])
    slab(ctx, view, part(f, [depth / 2 - 0.03, depth / 2], [s, s + 0.03], [0, 1.8]), INSIDE.wire);
};

/** A straight flight up to the next floor, its foot at the front, drawn far step first. */
const STEP_RISE = 0.19;
const stairs: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  const count = Math.max(1, Math.round(depth / 0.28));
  const run = depth / count;
  const steps = Array.from({ length: count }, (_, i) => ({
    box: part(f, [depth / 2 - (i + 1) * run, depth / 2 - i * run], [-width / 2, width / 2], [0, (i + 1) * STEP_RISE]),
    near: nearness(at(f, depth / 2 - (i + 0.5) * run, 0)),
  })).sort((a, b) => a.near - b.near);
  for (const s of steps) drawBox(ctx, view, s.box, { top: INSIDE.tread, left: INSIDE.riser, right: INSIDE.riser });
};

/** The new kinds' drawings, and their heights for the depth sort. */
export const FITTINGS = { shower, toilet, sink, dish, shelves, stairs } as const;
export const FITTING_HEIGHT = { shower: 2, toilet: 0.8, sink: 1.02, dish: 1.55, shelves: 1.8, stairs: 2.9 } as const;
export const STAIRS_RISE = STEP_RISE;
