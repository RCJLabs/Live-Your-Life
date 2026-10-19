/**
 * The furniture kit (docs/DESIGN.md, Presentation): every fixture a few boxes and discs in
 * flat colour, placed by its template's rules. A kitchen reads by its flames, pans and steam;
 * a bedroom by its pillow and blanket, with the sleeper under it.
 */
import { at, drawDisc, drawDrum, extent, part, slab } from './fixture.ts';
import { box } from './geom.ts';
import { nearness, project } from './iso.ts';
import { INSIDE, LIT } from './palette.ts';
import { drawPerson } from './person/draw.ts';
import { rig } from './person/rig.ts';
import { fillShape, poly } from './shape.ts';
import type { Piece } from './sort.ts';
import { type Fixture, YAW } from './types.ts';

type Draw = Piece['draw'];

const stove: (f: Fixture) => Draw = (f) => (ctx, view, frame) => {
  const { depth, width } = extent(f);
  const h = 0.92;
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, h]), INSIDE.steel);
  slab(
    ctx,
    view,
    part(f, [-depth / 2 + 0.06, depth / 2 - 0.06], [-width / 2 + 0.05, 0.1], [h, h + 0.03]),
    INSIDE.checkerDark,
  );
  // Patties on the griddle, a pot on the burner with its flames, and steam rising.
  for (const side of [-width / 2 + 0.3, -width / 2 + 0.6])
    drawDisc(ctx, view, at(f, 0.05, side), 0.09, h + 0.04, '#7A4A2C');
  const pot = at(f, 0, width / 2 - 0.3);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + frame.time * 3;
    const flick = 0.06 + 0.03 * Math.sin(frame.time * 17 + i * 2.1);
    const base = project(view, { x: pot.x + Math.cos(a) * 0.17, y: pot.y + Math.sin(a) * 0.17, z: h });
    const tip = project(view, { x: pot.x + Math.cos(a) * 0.15, y: pot.y + Math.sin(a) * 0.15, z: h + flick });
    const half = 0.035 * Math.SQRT2 * view.u;
    fillShape(ctx, poly([{ x: base.x - half, y: base.y }, tip, { x: base.x + half, y: base.y }]), INSIDE.flame);
  }
  drawDrum(ctx, view, pot, 0.16, h + 0.02, h + 0.24, INSIDE.steelDark);
  ctx.strokeStyle = 'rgba(240,240,236,0.75)';
  ctx.lineWidth = Math.max(1, 0.035 * view.u);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const life = (frame.time / 2.2 + i / 3) % 1;
    const p = project(view, { x: pot.x, y: pot.y, z: h + 0.3 + life * 0.8 });
    const sway = Math.sin(frame.time * 2 + i) * 0.1 * view.u;
    ctx.globalAlpha = 1 - life;
    ctx.beginPath();
    ctx.moveTo(p.x - sway, p.y + 0.12 * view.u);
    ctx.quadraticCurveTo(p.x + sway, p.y, p.x - sway * 0.5, p.y - 0.14 * view.u);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const fridge: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 1.85]), INSIDE.white);
  slab(
    ctx,
    view,
    part(f, [depth / 2 - 0.01, depth / 2 + 0.02], [-width / 2 + 0.05, width / 2 - 0.05], [1.18, 1.21]),
    INSIDE.steelDark,
  );
};

const prep: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.9]), INSIDE.steel);
  for (let s = -width / 2 + 0.25; s < width / 2 - 0.2; s += 0.45) {
    slab(ctx, view, part(f, [-0.15, 0.12], [s, s + 0.28], [0.9, 1.08]), s % 0.9 < 0.45 ? '#D9CDB4' : '#B9C7C9');
  }
};

const counter: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 1.0]), INSIDE.counterFront);
  slab(
    ctx,
    view,
    part(f, [-depth / 2 - 0.04, depth / 2 + 0.04], [-width / 2 - 0.04, width / 2 + 0.04], [1.0, 1.06]),
    INSIDE.counterTop,
  );
  for (let s = -width / 2 + 0.5; s < width / 2 - 0.3; s += 1.2)
    drawDrum(ctx, view, at(f, 0, s), 0.05, 1.06, 1.15, INSIDE.white);
};

const stool: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const c = at(f, 0, 0);
  slab(ctx, view, box(c.x - 0.03, c.y - 0.03, 0, c.x + 0.03, c.y + 0.03, 0.7), INSIDE.steel);
  drawDrum(ctx, view, c, 0.19, 0.68, 0.76, INSIDE.booth);
};

function seat(f: Fixture, back: number, color: string): Draw {
  return (ctx, view) => {
    const { depth, width } = extent(f);
    const rear = part(f, [-depth / 2, -depth / 2 + 0.12], [-width / 2, width / 2], [0, back]);
    const pan = part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0.38, 0.46]);
    const legs = part(f, [-depth / 2 + 0.05, depth / 2 - 0.05], [-width / 2 + 0.05, width / 2 - 0.05], [0, 0.38]);
    // The back is drawn first when it is the far side, last when it faces the camera.
    const backFirst = nearness(at(f, -depth / 2, 0)) < nearness(at(f, depth / 2, 0));
    if (backFirst) slab(ctx, view, rear, color);
    slab(ctx, view, legs, color === INSIDE.booth ? '#7E2F28' : INSIDE.steelDark);
    slab(ctx, view, pan, color);
    if (!backFirst) slab(ctx, view, rear, color);
  };
}

const table: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  const c = at(f, 0, 0);
  slab(ctx, view, box(c.x - 0.04, c.y - 0.04, 0, c.x + 0.04, c.y + 0.04, 0.72), INSIDE.steelDark);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0.72, 0.77]), INSIDE.tableTop);
  drawDisc(ctx, view, at(f, 0.1, -0.1), 0.12, 0.78, INSIDE.white);
};

const bed: (f: Fixture) => Draw = (f) => (ctx, view, frame) => {
  const { depth, width } = extent(f);
  // The bed faces its foot: the head is at the back.
  const head = (z: [number, number]) => part(f, [-depth / 2, -depth / 2 + 0.08], [-width / 2, width / 2], z);
  const headFirst = nearness(at(f, -depth / 2, 0)) < nearness(at(f, depth / 2, 0));
  if (headFirst) slab(ctx, view, head([0, 0.95]), INSIDE.bedFrame);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0.1, 0.36]), INSIDE.bedFrame);
  slab(
    ctx,
    view,
    part(f, [-depth / 2 + 0.05, depth / 2 - 0.03], [-width / 2 + 0.03, width / 2 - 0.03], [0.36, 0.55]),
    INSIDE.sheet,
  );
  slab(
    ctx,
    view,
    part(f, [-depth / 2 + 0.12, -depth / 2 + 0.5], [-width / 2 + 0.15, width / 2 - 0.15], [0.55, 0.66]),
    INSIDE.pillow,
  );
  const sleeper = frame.sleepers.get(f.id);
  if (sleeper) {
    // Head on the pillow, lying along the bed toward its foot.
    const pillow = at(f, -depth / 2 + 0.32, 0);
    const sk = rig(sleeper.look, sleeper.pose, { x: pillow.x, y: pillow.y, z: 0, yaw: YAW[f.facing] + Math.PI });
    frame.heads.set(sleeper.id, drawPerson(ctx, view, sk, sleeper.look, frame.ink, false).headTop);
  }
  // The blanket over all but the head, puffed a little.
  slab(
    ctx,
    view,
    part(f, [-depth / 2 + 0.62, depth / 2 - 0.02], [-width / 2 + 0.01, width / 2 - 0.01], [0.55, 0.72]),
    INSIDE.blanket,
  );
  if (!headFirst) slab(ctx, view, head([0, 0.95]), INSIDE.bedFrame);
};

const nightstand: (f: Fixture) => Draw = (f) => (ctx, view, frame) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.55]), INSIDE.bedFrame);
  const c = at(f, 0, 0);
  drawDrum(ctx, view, c, 0.06, 0.55, 0.78, INSIDE.steelDark);
  drawDrum(ctx, view, c, 0.15, 0.78, 0.98, frame.dark > 0.3 ? LIT : INSIDE.sheet);
  if (frame.dark > 0.3)
    frame.lights.push({ kind: 'pool', at: project(view, { ...c, z: 0.6 }), radius: 2.2 * view.u, strength: 0.75 });
};

const couch: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.25], [-width / 2, width / 2], [0, 0.85]), INSIDE.couch);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.45]), INSIDE.couch);
  for (const side of [-width / 2, width / 2 - 0.2])
    slab(ctx, view, part(f, [-depth / 2, depth / 2], [side, side + 0.2], [0, 0.62]), INSIDE.couch);
};

const tv: (f: Fixture) => Draw = (f) => (ctx, view, frame) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.5]), INSIDE.bedFrame);
  const screen = part(f, [-0.04, 0.04], [-width / 2 + 0.1, width / 2 - 0.1], [0.55, 1.15]);
  slab(ctx, view, screen, frame.dark > 0.3 ? '#9FC3E0' : INSIDE.screen);
  if (frame.dark > 0.3)
    frame.lights.push({ kind: 'pool', at: project(view, at(f, 0.6, 0, 0.8)), radius: 1.6 * view.u, strength: 0.55 });
};

const kitchenette: (f: Fixture) => Draw = (f) => (ctx, view) => {
  const { depth, width } = extent(f);
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0, 0.9]), '#D9D2C0');
  slab(ctx, view, part(f, [-depth / 2, depth / 2], [-width / 2, width / 2], [0.9, 0.94]), INSIDE.counterTop);
  slab(ctx, view, part(f, [-0.1, 0.15], [-width / 2 + 0.3, -width / 2 + 0.8], [0.94, 0.95]), INSIDE.steelDark);
  slab(ctx, view, part(f, [-depth / 2, -depth / 2 + 0.32], [-width / 2, width / 2], [1.45, 2.1]), '#D9D2C0');
};

const DRAWS: Readonly<Record<Fixture['kind'], (f: Fixture) => Draw>> = {
  stove,
  fridge,
  prep,
  counter,
  stool,
  booth: (f) => seat(f, 1.1, INSIDE.booth),
  table,
  chair: (f) => seat(f, 0.9, INSIDE.bedFrame),
  bed,
  nightstand,
  couch,
  tv,
  rug: () => () => {},
  kitchenette,
};

const HEIGHT: Readonly<Record<Fixture['kind'], number>> = {
  stove: 1.3,
  fridge: 1.85,
  prep: 1.1,
  counter: 1.15,
  stool: 0.76,
  booth: 1.1,
  table: 0.8,
  chair: 0.9,
  bed: 0.95,
  nightstand: 1.0,
  couch: 0.85,
  tv: 1.15,
  rug: 0.01,
  kitchenette: 2.1,
};

/** A fixture as a piece for the depth sort. Rugs lie in the floor pass instead. */
export function fixturePiece(f: Fixture): Piece {
  return {
    box: box(f.x - f.w / 2, f.y - f.d / 2, 0, f.x + f.w / 2, f.y + f.d / 2, HEIGHT[f.kind]),
    draw: DRAWS[f.kind](f),
  };
}
