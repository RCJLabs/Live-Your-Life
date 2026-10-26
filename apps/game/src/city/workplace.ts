/**
 * Where Ridgefield's employers stand, and your walk to one (M2.3, D73). A tier-1 workplace stands
 * where the roster's placement puts it, in its career's district; a tier-2 employer on a lot of its
 * district drawn from the seed; your block's diner is on your block. Worked off screen, a job
 * costs the walk there along the streets, at a walking pace (tune), from your door and back.
 */
import { contentStore } from '@lyl/content';
import {
  cityTemplates,
  type DistrictRecord,
  type Employer,
  employersOf,
  type FaceSide,
  HOME_DISTRICT,
  hashOf,
  inFront,
  mix,
  type Placed,
  placeRoster,
  rosterOf,
  type Streets,
  streetsOf,
  walkBetween,
} from '@lyl/sim';
import type { TownScene } from './town.ts';

/** Metres a minute on foot across the city: about 1.3 m a second, an adult's usual pace (tune; CALIBRATION.md). */
export const WALK_PACE = 80;

export interface Work {
  readonly employers: readonly Employer[];
  /** The roster's places on the city's lots, workplaces in their careers' districts. */
  readonly placed: Placed;
  /** An employer's lot; -1 for your block's own. */
  lotOf(employer: string): number;
  /** The walk from your door to an employer's, in metres and game minutes; null for your block's own. */
  walkTo(employer: string): WalkThere | null;
  /** The walk from your door to a roster place's lot (M2.6: a third place you go out to). */
  walkToPlace(place: number): WalkThere | null;
}

/** A walk along the streets, and its two ends in the city's metres for the bus and a ride (M2.9). */
export interface WalkThere {
  readonly metres: number;
  readonly minutes: number;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

const kept = new WeakMap<TownScene, Map<string, Work>>();

export function workOf(town: TownScene, seed: number, n: number): Work {
  const key = `${seed}:${n}`;
  const known = kept.get(town)?.get(key);
  if (known) return known;
  const store = contentStore();
  const roster = rosterOf(seed, n);
  const employers = employersOf(store, seed, roster, HOME_DISTRICT);
  const districtIndex = (id: string) => town.city.districts.indexOf(id);
  const byPlace = new Map(employers.filter((e) => e.place >= 0).map((e) => [e.place, e]));
  const placed = placeRoster(
    roster,
    cityTemplates(store, town.city),
    town.city,
    seed,
    { block: town.home.block, side: 1 },
    (p) => {
      const e = byPlace.get(p);
      return e ? districtIndex(e.district) : null;
    },
  );
  const lotsIn = new Map<number, number[]>();
  for (let l = 0; l < town.city.lots.count; l++) {
    const d = town.city.blocks.district[town.city.lots.block[l] as number] as number;
    if (!lotsIn.has(d)) lotsIn.set(d, []);
    lotsIn.get(d)?.push(l);
  }
  const lotOf = (id: string): number => {
    const e = employers.find((x) => x.id === id);
    if (!e || e.home) return -1;
    if (e.place >= 0) return placed.lot[e.place] as number;
    const pool = lotsIn.get(districtIndex(e.district)) ?? [];
    return pool.length === 0 ? -1 : (pool[mix(seed, 44, hashOf(id)) % pool.length] as number);
  };
  let streets: Streets | null = null;
  const records: DistrictRecord[] = [...town.districts];
  const door = (lot: number) => {
    const block = town.city.lots.block[lot] as number;
    const side = town.city.lots.side[lot] as FaceSide;
    const mid = (town.city.lots.start[lot] as number) + (town.city.lots.width[lot] as number) / 2;
    return { block, side, x: side === 1 ? mid : (town.city.blocks.w[block] as number) - mid };
  };
  const walks = new Map<string, WalkThere | null>();
  const work: Work = {
    employers,
    placed,
    lotOf,
    walkTo(id) {
      return walkToLot(id, lotOf(id));
    },
    walkToPlace(place) {
      return walkToLot(`place-${place}`, placed.lot[place] ?? -1);
    },
  };
  function walkToLot(id: string, lot: number): WalkThere | null {
    if (walks.has(id)) return walks.get(id) ?? null;
    {
      let out: WalkThere | null = null;
      if (lot >= 0) {
        streets ??= streetsOf(town.city, records);
        const d = door(lot);
        // From your door: the walk-up's on the slice's block, the south face of yours (D67).
        const flat = town.plan.buildings.find((b) => b.interior?.template === 'walk-up');
        const from = inFront(town.city, records, streets, town.home.block, 1, flat?.door ?? 0);
        const to = inFront(town.city, records, streets, d.block, d.side, d.x);
        const walk = walkBetween(streets, from, to);
        if (walk)
          out = {
            metres: Math.round(walk.metres),
            minutes: Math.max(1, Math.ceil(walk.metres / WALK_PACE)),
            from: { x: from.x, y: from.y },
            to: { x: to.x, y: to.y },
          };
      }
      walks.set(id, out);
      return out;
    }
  }
  if (!kept.has(town)) kept.set(town, new Map());
  kept.get(town)?.set(key, work);
  return work;
}
