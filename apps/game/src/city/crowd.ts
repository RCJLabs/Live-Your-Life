/**
 * The tier-1 people in the town (M2.2, D69): whoever the sim's hour puts on the streets round your
 * block, drawn walking there. Their homes, work and third places are the city's lots (placed.ts);
 * their hour is the people module's own (day.ts); the stage only draws where that puts them. On
 * the way to work they walk the streets from their door to their work's, on the right-hand
 * sidewalk; at home, at work and out they are indoors and not drawn. The coworker stands at the
 * griddle through their shift and the fence behind the diner in their hours (D70).
 */

import { Rng } from '@eb/core';
import { contentStore } from '@lyl/content';
import {
  careerRoster,
  type DistrictRecord,
  type FaceSide,
  HOURS,
  hourOf,
  inFront,
  LINKED,
  type Roster,
  type Streets,
  streetsOf,
  walkBetween,
} from '@lyl/sim';
import { type Actor, CLOTH, HAIR, type Look, SHOES, SKIN } from '@lyl/stage';
import type { TownScene } from './town.ts';
import { workOf } from './workplace.ts';

/** Metres a stage second on the way to work, at speed 1, as the player walks (life/player.ts). */
const PACE = 3.9;
/** How far off a street's middle the sidewalk is: half a street, less half a sidewalk (tune). */
const KERB = 7;
const STRIDE = 1.6;
const HAIRSTYLES = ['short', 'short', 'long', 'bun', 'bald'] as const;

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A person's look, from the people's seed and who they are: the same every time. */
export function lookOf(seed: number, i: number): Look {
  const r = Rng.create(`person:${seed}:${i}`);
  return {
    skin: r.pick(SKIN),
    hair: r.pick(HAIR),
    hairStyle: r.pick(HAIRSTYLES),
    top: r.pick(CLOTH),
    sleeve: r.chance(1, 2) ? 'long' : 'short',
    bottom: r.pick(CLOTH),
    shoe: r.pick(SHOES),
    height: r.int(155, 192) / 100,
    build: r.int(86, 118) / 100,
  };
}

/** A path pushed to the right of its direction of travel, so a walk keeps to the sidewalk. */
function sidewalk(path: readonly Pt[]): Pt[] {
  return path.map((p, k) => {
    const a = path[Math.max(0, k - 1)] as Pt;
    const b = path[Math.min(path.length - 1, k + 1)] as Pt;
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    return { x: p.x - dy * KERB, y: p.y + dx * KERB };
  });
}

/** Metres either side of a corner a walker curves round it, rather than turning on the spot (tune). */
const ROUND = 2;

const dist = (a: Pt, b: Pt): number => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

/** The curve round corner v, from p to q, `d` metres into its 2r: a quadratic Bezier through v. */
function rounded(p: Pt, v: Pt, q: Pt, r: number, d: number): { at: Pt; yaw: number } {
  const lin = dist(p, v);
  const lout = dist(v, q);
  const p0 = { x: v.x + ((p.x - v.x) * r) / lin, y: v.y + ((p.y - v.y) * r) / lin };
  const p2 = { x: v.x + ((q.x - v.x) * r) / lout, y: v.y + ((q.y - v.y) * r) / lout };
  const u = d / (2 * r);
  const a = (1 - u) * (1 - u);
  const b = 2 * u * (1 - u);
  const c = u * u;
  const at = { x: a * p0.x + b * v.x + c * p2.x, y: a * p0.y + b * v.y + c * p2.y };
  const dx = 2 * (1 - u) * (v.x - p0.x) + 2 * u * (p2.x - v.x);
  const dy = 2 * (1 - u) * (v.y - p0.y) + 2 * u * (p2.y - v.y);
  return { at, yaw: Math.atan2(dy, dx) };
}

/** How far either side of the corner at path[k] a walker curves: ROUND, or less on a short leg. */
const radiusAt = (path: readonly Pt[], k: number): number => {
  const p = path[k - 1];
  const v = path[k] as Pt;
  const q = path[k + 1];
  if (!p || !q || dist(p, v) === 0 || dist(v, q) === 0) return 0;
  // A corner only where the way turns; straight on needs none.
  if (Math.sign(v.x - p.x) === Math.sign(q.x - v.x) && Math.sign(v.y - p.y) === Math.sign(q.y - v.y)) return 0;
  return Math.min(ROUND, dist(p, v) / 2, dist(v, q) / 2);
};

/** Where along a path a walker is after `walked` metres, and which way they face, curving round corners. */
export function along(path: readonly Pt[], walked: number): { at: Pt; yaw: number } {
  let left = walked;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1] as Pt;
    const b = path[k] as Pt;
    const len = dist(a, b);
    if (left <= len || k === path.length - 1) {
      const s = Math.min(left, len);
      const rIn = radiusAt(path, k - 1);
      const rOut = radiusAt(path, k);
      if (rIn > 0 && s < rIn) return rounded(path[k - 2] as Pt, a, b, rIn, rIn + s);
      if (rOut > 0 && len - s < rOut) return rounded(a, b, path[k + 1] as Pt, rOut, rOut - (len - s));
      const f = len === 0 ? 0 : s / len;
      return { at: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, yaw: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= len;
  }
  return { at: path[0] as Pt, yaw: 0 };
}

export interface Crowd {
  /** Who is out in the town at a minute of the life, at stage time t. */
  actorsAt(
    minute: number,
    weekday0: number,
    t: number,
    linked: (i: number, day: number, hour: number) => boolean,
  ): Actor[];
  /** How many people's way to work passes through the town: for the readings, since it routes every one. */
  nearby(): number;
}

/**
 * The crowd for a town. `rosterNow` gives the roster as the sim has it now, with whoever has left
 * or changed jobs (people/work.ts); without it, the roster as a life starts.
 */
export function makeCrowd(town: TownScene, seed: number, n: number, rosterNow?: () => Roster): Crowd {
  // Their hours as the sim keeps them: their careers' shifts (M2.3).
  const start = careerRoster(contentStore(), seed, n);
  const rosterOfNow = rosterNow ?? (() => start);
  // Workplaces where their careers' employers stand (M2.3), as the Jobs panel's are.
  const { placed } = workOf(town, seed, n);
  const records: DistrictRecord[] = [...town.districts];
  let streets: Streets | null = null;
  const b = town.scene.bounds;
  const inTown = (p: Pt) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;
  const home = (p: Pt): Pt => ({ x: p.x - town.home.ox, y: p.y - town.home.oy });
  const doorOf = (place: number) => {
    const lot = placed.lot[place] as number;
    const block = town.city.lots.block[lot] as number;
    const side = town.city.lots.side[lot] as FaceSide;
    const mid = (town.city.lots.start[lot] as number) + (town.city.lots.width[lot] as number) / 2;
    const x = side === 1 ? mid : (town.city.blocks.w[block] as number) - mid;
    return { block, side, x };
  };
  // A commute's way in the home frame, worked out when first needed and kept, by who and where to.
  const ways = new Map<string, Pt[] | null>();
  const wayOf = (i: number, roster: Roster = rosterOfNow()): Pt[] | null => {
    const p = roster.people[i];
    const key = `${i}:${p?.work ?? -1}`;
    if (ways.has(key)) return ways.get(key) as Pt[] | null;
    let way: Pt[] | null = null;
    if (p && p.work >= 0) {
      streets ??= streetsOf(town.city, records);
      const a = doorOf(p.home);
      const w = doorOf(p.work);
      const walk = walkBetween(
        streets,
        inFront(town.city, records, streets, a.block, a.side, a.x),
        inFront(town.city, records, streets, w.block, w.side, w.x),
      );
      const path = walk ? sidewalk(walk.path).map(home) : null;
      // Only those whose way passes through the town are ever drawn.
      way = path?.some(inTown) ? path : null;
    }
    ways.set(key, way);
    return way;
  };
  const looks = new Map<number, Look>();
  const griddle = town.plan.buildings
    .find((x) => x.interior?.template === 'diner')
    ?.interior?.fixtures.find((f) => f.use?.serves.includes('work'))?.use;
  const diner = town.plan.buildings.find((x) => x.interior?.template === 'diner');
  const backOfDiner = diner ? { x: (diner.x0 + diner.x1) / 2, y: diner.y0 - 1.5 } : null;
  return {
    nearby: () => rosterOfNow().people.filter((_, i) => i >= LINKED.count && wayOf(i) !== null).length,
    actorsAt(minute, weekday0, t, linked) {
      const day = Math.floor(minute / (24 * 60));
      const hour = Math.floor(minute / 60) % 24;
      const weekday = (weekday0 + day) % 7;
      const out: Actor[] = [];
      const add = (i: number, at: Pt, yaw: number, walking: boolean, walked = 0) =>
        out.push({
          id: `person-${i}`,
          look: looks.get(i) ?? (looks.set(i, lookOf(seed, i)).get(i) as Look),
          x: at.x,
          y: at.y,
          z: 0,
          yaw,
          pose: walking ? { kind: 'walk', t, stride: (walked / STRIDE) % 1 } : { kind: 'stand', t },
          bubble: null,
        });
      if (griddle && linked(LINKED.coworker, day, hour)) add(LINKED.coworker, griddle, -Math.PI / 2, false);
      if (backOfDiner && linked(LINKED.fence, day, hour)) add(LINKED.fence, backOfDiner, Math.PI / 2, false);
      const roster = rosterOfNow();
      roster.people.forEach((p, i) => {
        if (i < LINKED.count) return;
        if (hourOf(p, seed, i, day, weekday, hour) !== HOURS.commute) return;
        const way = wayOf(i, roster);
        if (!way) return;
        // An hour's walk spread over the way: those with a long one start sooner (tune).
        const length = way.reduce(
          (sum, q, k) =>
            k === 0 ? 0 : sum + Math.abs(q.x - (way[k - 1] as Pt).x) + Math.abs(q.y - (way[k - 1] as Pt).y),
          0,
        );
        const walked = Math.min(length, ((minute % 60) / 60) * Math.max(length, PACE * 60));
        const { at, yaw } = along(way, walked);
        if (inTown(at)) add(i, at, yaw, walked < length, walked);
      });
      return out;
    },
  };
}
