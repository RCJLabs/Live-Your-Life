/**
 * What a planned interior must keep to (M1.2's gates): rooms that cover the floor, doors that join
 * two rooms, fixtures inside their rooms and clear of walls, of each other and of doorways, and
 * every unit with a place for each thing it needs. Each broken rule is a line of text; none is a
 * plan that passes. Whether a person can walk to each fixture is the walk grid's to check.
 */
import type { FixturePlan } from './furnish.ts';
import type { InteriorPlan } from './interior.ts';
import { type DoorPlan, type Frame, OUTSIDE, type Rect, roomAt, WALL } from './rooms.ts';

/** A room narrower than this is a cupboard nobody can turn round in (tune). */
const NARROWEST = 1;
/** How far in front of a doorway, either side, no fixture may stand (tune). */
const CLEAR = 0.8;
const EPS = 1e-6;
/** How finely the floor is looked over for a gap between rooms. */
const SAMPLE = 0.25;

const overlap = (a: Rect, b: Rect): boolean =>
  a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS;
const footprint = (f: FixturePlan): Rect => ({
  x0: f.x - f.w / 2,
  y0: f.y - f.d / 2,
  x1: f.x + f.w / 2,
  y1: f.y + f.d / 2,
});

/** The floor in front of a doorway, both sides, as wide as its opening. */
function clearOf(d: DoorPlan): Rect {
  const reach = WALL / 2 + CLEAR;
  return d.along === 'x'
    ? { x0: d.x - d.width / 2, y0: d.y - reach, x1: d.x + d.width / 2, y1: d.y + reach }
    : { x0: d.x - reach, y0: d.y - d.width / 2, x1: d.x + reach, y1: d.y + d.width / 2 };
}

function roomProblems(inside: InteriorPlan, f: Frame): string[] {
  const out: string[] = [];
  for (const r of inside.rooms) {
    if (r.x0 < f.x0 - EPS || r.y0 < f.y0 - EPS || r.x1 > f.x1 + EPS || r.y1 > f.y1 + EPS)
      out.push(`room ${r.id} runs past the outside walls`);
    if (r.inner.x1 - r.inner.x0 < NARROWEST || r.inner.y1 - r.inner.y0 < NARROWEST)
      out.push(`room ${r.id} is under a metre across`);
  }
  for (let x = f.x0 + SAMPLE / 2; x < f.x1; x += SAMPLE) {
    for (let y = f.y0 + SAMPLE / 2; y < f.y1; y += SAMPLE) {
      if (!roomAt(inside.rooms, x, y)) {
        out.push(`no room covers the floor at ${x.toFixed(2)}, ${y.toFixed(2)}`);
        return out;
      }
    }
  }
  return out;
}

/** The rooms either side of a door, a little in from one jamb. */
function sidesAt(inside: InteriorPlan, d: DoorPlan, along: number): [string, string] {
  const probe = WALL / 2 + 0.2;
  const room = (x: number, y: number) => roomAt(inside.rooms, x, y)?.id ?? OUTSIDE;
  const [a, b] =
    d.along === 'x'
      ? [room(along, d.y - probe), room(along, d.y + probe)]
      : [room(d.x - probe, along), room(d.x + probe, along)];
  return a === d.room ? [a, b] : [b, a];
}

function doorProblems(inside: InteriorPlan): string[] {
  const out: string[] = [];
  for (const d of inside.doors) {
    const [here, there] = d.rooms;
    const name = d.wall ? `the way out in ${d.room}` : `the door in ${d.room}`;
    if (here === OUTSIDE) out.push(`${name} opens into no room`);
    else if (here !== d.room) out.push(`${name} opens from ${here}`);
    if (there === here) out.push(`${name} opens back into ${here}`);
    const mid = d.along === 'x' ? d.x : d.y;
    for (const end of [mid - d.width / 2 + 0.05, mid + d.width / 2 - 0.05]) {
      const [a, b] = sidesAt(inside, d, end);
      if (a !== here || (!d.wall && b !== there)) out.push(`${name} runs past the end of its wall`);
    }
  }
  return out;
}

function fixtureProblems(inside: InteriorPlan): string[] {
  const out: string[] = [];
  const blocking = inside.fixtures.filter((f) => f.blocks);
  for (const f of inside.fixtures) {
    const room = inside.rooms.find((r) => r.id === f.room);
    const at = footprint(f);
    const inner = room?.inner;
    if (
      !inner ||
      at.x0 < inner.x0 - EPS ||
      at.y0 < inner.y0 - EPS ||
      at.x1 > inner.x1 + EPS ||
      at.y1 > inner.y1 + EPS
    ) {
      out.push(`${f.id} stands outside its room`);
      continue;
    }
    for (const [x, y] of [
      [at.x0 + 0.01, at.y0 + 0.01],
      [at.x1 - 0.01, at.y0 + 0.01],
      [at.x0 + 0.01, at.y1 - 0.01],
      [at.x1 - 0.01, at.y1 - 0.01],
    ] as const) {
      const there = roomAt(inside.rooms, x, y)?.id;
      if (there !== f.room) {
        out.push(`${f.id} stands in ${there ?? 'no room'}`);
        break;
      }
    }
    if (f.use) {
      const u = f.use;
      const past = { n: u.y < at.y0, s: u.y > at.y1, w: u.x < at.x0, e: u.x > at.x1 }[u.from];
      if (!past) out.push(`${f.id} is used from inside itself`);
    }
    if (!f.blocks) continue;
    if (inside.walls.some((w) => overlap(at, w))) out.push(`${f.id} stands in a wall`);
    for (const d of inside.doors)
      if (overlap(at, clearOf(d))) out.push(`${f.id} stands in front of a door in ${d.room}`);
  }
  for (let i = 0; i < blocking.length; i++) {
    for (let j = i + 1; j < blocking.length; j++) {
      const a = blocking[i] as FixturePlan;
      const b = blocking[j] as FixturePlan;
      if (overlap(footprint(a), footprint(b))) out.push(`${a.id} and ${b.id} overlap`);
    }
  }
  return out;
}

function unitProblems(inside: InteriorPlan): string[] {
  const out: string[] = [];
  for (const u of inside.units) {
    const theirs = inside.fixtures.filter((f) => u.rooms.includes(f.room));
    for (const need of u.needs) {
      if (!theirs.some((f) => f.use?.serves.includes(need))) out.push(`unit ${u.id} has no place to ${need}`);
    }
  }
  return out;
}

/** Every rule the interior breaks, in words; none for a plan that keeps them all. */
export function interiorProblems(inside: InteriorPlan, frame: Frame): string[] {
  return [...roomProblems(inside, frame), ...doorProblems(inside), ...fixtureProblems(inside), ...unitProblems(inside)];
}
