/**
 * The spike's block, laid out from a seed and the templates: the street, three lots in a
 * seeded order, two interiors furnished by their rules, the street's furniture, and where the
 * six people are (D27). The same seed always gives the same block (the engine's `Rng`).
 */
import { Rng } from '@eb/core';
import {
  BUILDING,
  type Building,
  type BuildingKind,
  type Curb,
  type Fixture,
  GROUND,
  type Mark,
  type Patch,
  type Prop,
  type Scene,
  WALL,
} from '@lyl/stage';
import { BACK_ROW, BUILDINGS, type FixtureRule, INTERIORS, type Role, STREET } from './templates.ts';

export interface Placement {
  readonly role: Role;
  readonly x: number;
  readonly y: number;
  readonly yaw: number;
  /** The walker paces between these x. */
  readonly path?: readonly [number, number];
  /** The sleeper's bed. */
  readonly bed?: string;
}

export interface Block {
  readonly scene: Scene;
  readonly people: readonly Placement[];
  readonly byKind: Readonly<Record<BuildingKind, Building>>;
  /** The y of the street's near curb, and of the line the walker keeps to. */
  readonly curb: number;
}

/** A number in [min, max] at a tenth's resolution: the Rng deals in integers. */
const between = (rng: Rng, [min, max]: readonly [number, number]) =>
  rng.int(Math.round(min * 10), Math.round(max * 10)) / 10;

/** The orders the lots can come in: the diner and the apartment house always side by side. */
const ORDERS: readonly (readonly BuildingKind[])[] = [
  ['storefront', 'diner', 'apartment'],
  ['storefront', 'apartment', 'diner'],
  ['diner', 'apartment', 'storefront'],
  ['apartment', 'diner', 'storefront'],
];

function furnish(
  b: { x0: number; y0: number; x1: number; y1: number },
  rules: readonly FixtureRule[],
  prefix: string,
): Fixture[] {
  const ix0 = b.x0 + WALL;
  const ix1 = b.x1 - WALL;
  const iy0 = b.y0 + WALL;
  const iy1 = b.y1 - WALL;
  const width = ix1 - ix0;
  const out: Fixture[] = [];
  rules.forEach((rule, n) => {
    const y = rule.line >= 0 ? iy0 + rule.line : iy1 + rule.line;
    const place = (x: number, w: number, i: number) => {
      const across = rule.facing === 'n' || rule.facing === 's';
      out.push({
        id: rule.id ?? `${prefix}-${rule.kind}-${n}-${i}`,
        kind: rule.kind,
        x,
        y,
        w: across ? w : rule.depth,
        d: across ? rule.depth : w,
        facing: rule.facing,
      });
    };
    if (rule.span) {
      const from = ix0 + width * rule.span[0];
      const to = ix0 + width * rule.span[1];
      if (rule.every) {
        const count = Math.max(1, Math.floor((to - from) / rule.every));
        for (let i = 0; i < count; i++) place(from + rule.every * (i + 0.5), rule.width ?? rule.every * 0.8, i);
      } else {
        place((from + to) / 2, to - from, 0);
      }
    } else {
      place(ix0 + width * (rule.at ?? 0.5), rule.width ?? 1, 0);
    }
  });
  return out;
}

function building(rng: Rng, kind: BuildingKind, x0: number, width: number): Building {
  const t = BUILDINGS[kind];
  const rect = { x0, y0: STREET.lotDepth - t.depth, x1: x0 + width, y1: STREET.lotDepth };
  const interior = INTERIORS[kind];
  const door = width * between(rng, t.door);
  return {
    id: kind,
    kind,
    ...rect,
    storeys: t.storeys,
    storeyHeight: t.storeyHeight,
    facade: {
      wall: rng.pick(t.walls),
      trim: t.trim,
      roof: BUILDING.roof,
      bays: t.bays,
      ground: t.ground,
      litBits: rng.int(0, 0x7fffffff),
      ...(kind === 'diner' ? { sign: { text: 'DINER', color: BUILDING.sign, ink: BUILDING.dinerRed } } : {}),
      ...(kind === 'storefront' ? { awning: { color: '#5E7F64', stripe: '#E3DCC9' }, card: 'FOR LEASE' } : {}),
    },
    ...(interior
      ? {
          interior: { floor: interior.floor, wall: interior.wall, door, fixtures: furnish(rect, interior.rules, kind) },
        }
      : {}),
  };
}

function ground(
  xa: number,
  xb: number,
  buildings: readonly Building[],
): { patches: Patch[]; marks: Mark[]; curbs: Curb[] } {
  const near = STREET.lotDepth + STREET.sidewalk;
  const far = near + STREET.curb + STREET.roadway + STREET.curb;
  const patches: Patch[] = [
    { x0: xa, y0: -STREET.alley - STREET.yards, x1: xb, y1: -STREET.alley, color: GROUND.grass },
    { x0: xa, y0: -STREET.alley, x1: xb, y1: 0, color: GROUND.alley },
    { x0: xa, y0: 0, x1: xb, y1: STREET.lotDepth, color: GROUND.gravel },
    { x0: xa, y0: STREET.lotDepth, x1: xb, y1: near, color: GROUND.sidewalk },
    { x0: xa, y0: near, x1: xb, y1: far, color: GROUND.asphalt },
    { x0: xa, y0: far, x1: xb, y1: far + STREET.farSidewalk, color: GROUND.sidewalk },
    { x0: xa, y0: far + STREET.farSidewalk, x1: xb, y1: far + STREET.farSidewalk + STREET.verge, color: GROUND.grass },
  ];
  // Yards behind the buildings are dirt; the rest of each lot stays gravel.
  for (const b of buildings) patches.push({ x0: b.x0, y0: 0.6, x1: b.x1, y1: b.y0 - 0.4, color: GROUND.dirt });
  const marks: Mark[] = [];
  const mid = (near + far) / 2;
  marks.push({ x0: xa, y0: mid, x1: xb, y1: mid, width: 0.14, color: GROUND.laneYellow, dash: [3, 3] });
  for (const y of [near + 0.35, far - 0.35])
    marks.push({ x0: xa, y0: y, x1: xb, y1: y, width: 0.1, color: GROUND.laneWhite });
  for (let x = Math.ceil(xa / 1.5) * 1.5; x < xb; x += 1.5) {
    marks.push({ x0: x, y0: STREET.lotDepth + 0.05, x1: x, y1: near - 0.05, width: 0.03, color: GROUND.joint });
    marks.push({ x0: x, y0: far + 0.05, x1: x, y1: far + STREET.farSidewalk - 0.05, width: 0.03, color: GROUND.joint });
  }
  const curbs: Curb[] = [
    { x0: xa, y0: near - 0.05, x1: xb, y1: near + STREET.curb, height: 0.14, color: GROUND.curb },
    { x0: xa, y0: far - STREET.curb, x1: xb, y1: far + 0.05, height: 0.14, color: GROUND.curb },
  ];
  return { patches, marks, curbs };
}

/** The backs of the next street's buildings, across the alley: the city goes on. */
function backRow(rng: Rng, xa: number, xb: number): Building[] {
  const row: Building[] = [];
  const y1 = -STREET.alley;
  for (let x = xa + between(rng, [0, 3]), i = 0; x < xb; i++) {
    const width = between(rng, BACK_ROW.width);
    row.push({
      id: `back-${i}`,
      kind: 'storefront',
      x0: x,
      y0: y1 - BACK_ROW.depth,
      x1: x + width,
      y1,
      storeys: rng.int(BACK_ROW.storeys[0], BACK_ROW.storeys[1]),
      storeyHeight: BACK_ROW.storeyHeight,
      facade: {
        wall: rng.pick(BACK_ROW.walls),
        trim: BUILDING.cornice,
        roof: BUILDING.roof,
        bays: Math.max(2, Math.round(width / 2.6)),
        ground: 'back',
        litBits: rng.int(0, 0x7fffffff),
      },
    });
    x += width + between(rng, BACK_ROW.gap);
  }
  return row;
}

/** Where the street runs from and to, and its curbs: what the rest of the block hangs on. */
interface Street {
  readonly xa: number;
  readonly xb: number;
  readonly curb: number;
  readonly far: number;
}

const doorOf = (b: Building) => b.x0 + (b.interior?.door ?? 0);

/** The patio table's spot, outside the diner's door. */
const patioOf = (diner: Building) => ({ x: doorOf(diner) - 2.4, y: STREET.lotDepth + 1.25 });

/** Lamps both sides, the diner's sign and patio, a hydrant, a bench and trees across the street. */
function streetProps(rng: Rng, s: Street, diner: Building, flat: Building): Prop[] {
  const props: Prop[] = [];
  for (let lx = s.xa + 4; lx < s.xb - 2; lx += STREET.lampEvery) {
    props.push({ id: `lamp-n-${lx}`, kind: 'lamp', x: lx, y: s.curb - 0.45, facing: 's' });
    props.push({ id: `lamp-s-${lx}`, kind: 'lamp', x: lx + STREET.lampEvery / 2, y: s.far + 0.45, facing: 'n' });
  }
  const sign = { text: 'EAT', color: BUILDING.dinerRed, ink: '#FFFDF5' };
  props.push({ id: 'sign', kind: 'pole-sign', x: diner.x0 + 3.2, y: s.curb - 0.6, facing: 's', sign });
  const patio = patioOf(diner);
  props.push({ id: 'patio-table', kind: 'patio-table', x: patio.x, y: patio.y, facing: 's' });
  props.push({ id: 'patio-chair', kind: 'patio-chair', x: patio.x, y: patio.y - 0.62, facing: 's' });
  props.push({ id: 'hydrant', kind: 'hydrant', x: flat.x1 + 0.6, y: s.curb - 0.4, facing: 's' });
  props.push({ id: 'bench', kind: 'bench', x: (s.xa + s.xb) / 2 + between(rng, [-6, 6]), y: s.far + 1.2, facing: 'n' });
  for (let i = 0; i < 4; i++) {
    const x = s.xa + 3 + ((s.xb - s.xa - 6) * (i + 0.5)) / 4 + between(rng, [-1.5, 1.5]);
    const y = s.far + STREET.farSidewalk + 2.5;
    props.push({ id: `tree-${i}`, kind: 'tree', x, y, facing: 's', size: between(rng, [0.85, 1.15]) });
  }
  return props;
}

/** The six, each where their role puts them: by a fixture, a door or the patio. */
function placePeople(diner: Building, flat: Building, row: readonly Building[]): Placement[] {
  const griddle = diner.interior?.fixtures.find((f) => f.id === 'griddle');
  const bed = flat.interior?.fixtures.find((f) => f.id === 'bed');
  const meet = { x: doorOf(flat) + 0.2, y: STREET.lotDepth + 1.45 };
  const patio = patioOf(diner);
  const beat: [number, number] = [Math.min(...row.map((b) => b.x0)) - 3, Math.max(...row.map((b) => b.x1)) + 3];
  return [
    {
      role: 'cook',
      x: griddle ? griddle.x : doorOf(diner),
      y: griddle ? griddle.y - griddle.d / 2 - 0.36 : diner.y0 + 2,
      yaw: Math.PI / 2,
    },
    { role: 'sleeper', x: bed?.x ?? flat.x0 + 2, y: bed?.y ?? flat.y0 + 2, yaw: 0, bed: bed?.id ?? 'bed' },
    // Face to face across the diagonal, so the camera sees both in profile.
    { role: 'arguer', x: meet.x - 0.42, y: meet.y + 0.42, yaw: -Math.PI / 4 },
    { role: 'answerer', x: meet.x + 0.42, y: meet.y - 0.42, yaw: (3 * Math.PI) / 4 },
    { role: 'walker', x: beat[0], y: STREET.lotDepth + 2.45, yaw: 0, path: beat },
    { role: 'sitter', x: patio.x, y: patio.y - 0.56, yaw: Math.PI / 2 },
  ];
}

export function makeBlock(seed: string): Block {
  const rng = Rng.create(`block:${seed}`);
  const buildings: Building[] = [];
  let x = 0;
  for (const kind of rng.pick(ORDERS)) {
    const width = between(rng.fork(kind), BUILDINGS[kind].width);
    buildings.push(building(rng.fork(`${kind}:look`), kind, x, width));
    x += width + between(rng, STREET.gap);
  }
  const byKind = Object.fromEntries(buildings.map((b) => [b.kind, b])) as Record<BuildingKind, Building>;
  const curb = STREET.lotDepth + STREET.sidewalk;
  const street: Street = { xa: -STREET.run, xb: x + STREET.run, curb, far: curb + STREET.curb * 2 + STREET.roadway };
  return {
    scene: {
      ground: ground(street.xa, street.xb, buildings),
      buildings: [...backRow(rng.fork('back-row'), street.xa, street.xb), ...buildings],
      props: streetProps(rng, street, byKind.diner, byKind.apartment),
      bounds: { x0: street.xa + 4, y0: 2, x1: street.xb - 4, y1: street.far + 2 },
    },
    people: placePeople(byKind.diner, byKind.apartment, buildings),
    byKind,
    curb,
  };
}
