/**
 * Where the tier-1 people's places stand in Ridgefield (M2.2, D68): each home, workplace and third
 * place of the roster on a lot of the city. Homes go to districts by their share of the people,
 * workplaces by their share of the jobs, third places by their people again; in a district that
 * can be walked, a home is a building people live in and the rest are shops, diners and offices.
 * Worked out from the seed, never stored, like the roster it places.
 */
import type { BuildingPlan } from '../city/block.ts';
import { type CityPlan, type DistrictRecord, lotFront } from '../city/city.ts';
import { type CityTemplates, planFace, type Side } from '../city/face.ts';
import { mix, type Roster } from './roster.ts';

export interface Placed {
  /** Per place of the roster: the lot it stands on. */
  readonly lot: Int32Array;
  /** Where its lot meets the street, in the city's metres. */
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** The building's id on its face, in a district that can be walked; '' elsewhere. */
  readonly building: readonly string[];
}

type Kind = 'home' | 'work' | 'third';

/** Lots tried by chance for one whose building suits the place, before going along them in turn. */
const TRIES = 8;

const suits = (kind: Kind, b: BuildingPlan | undefined): boolean =>
  b !== undefined &&
  (kind === 'home'
    ? b.use === 'home'
    : kind === 'work'
      ? b.use !== 'home'
      : b.use === 'shop' || b.use === 'restaurant');

/** Each district's lots, by index, and its weight for a kind of place. */
function byDistrict(city: CityPlan, records: readonly DistrictRecord[]) {
  const lots: number[][] = city.districts.map(() => []);
  for (let l = 0; l < city.lots.count; l++) lots[city.blocks.district[city.lots.block[l] as number] as number]?.push(l);
  const cells = city.districts.map(() => 0);
  for (const d of city.cellDistrict) cells[d] = (cells[d] as number) + 1;
  const weight = (kind: Kind) => records.map((r, i) => (cells[i] as number) * (kind === 'work' ? r.jobs : r.density));
  return { lots, weight };
}

/** The district a roll falls in, by weight. */
function districtFor(weights: readonly number[], roll: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let left = (roll % 1_000_000) * (total / 1_000_000);
  for (let i = 0; i < weights.length; i++) {
    left -= weights[i] as number;
    if (left < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Places a roster in the city. `skip` is a face left out, your own block's, which the slice's
 * block stands on instead (D67). `districtOf` names a place's district, by its index in the city,
 * where something else has chosen it: a workplace's, by its career (M2.3).
 */
export function placeRoster(
  roster: Roster,
  ct: CityTemplates,
  city: CityPlan,
  seed: number,
  skip?: { readonly block: number; readonly side: Side },
  districtOf?: (place: number) => number | null,
): Placed {
  const records = ct.districts.map((d) => d.record);
  const { lots, weight } = byDistrict(city, records);
  const faces = new Map<number, readonly BuildingPlan[]>();
  const buildingOn = (lot: number): BuildingPlan | undefined => {
    const block = city.lots.block[lot] as number;
    const side = city.lots.side[lot] as Side;
    if (!ct.districts[city.blocks.district[block] as number]?.frontage) return undefined;
    const key = block * 2 + side;
    let byLot = faces.get(key);
    if (!byLot) {
      const plan = planFace(ct, city, block, side);
      const ofSide: number[] = [];
      const end = block + 1 < city.blocks.count ? (city.blocks.firstLot[block + 1] as number) : city.lots.count;
      for (let l = city.blocks.firstLot[block] as number; l < end; l++) if (city.lots.side[l] === side) ofSide.push(l);
      // A north face's lots run the other way in its frame (face.ts).
      const order = side === 1 ? ofSide : [...ofSide].reverse();
      const at: BuildingPlan[] = [];
      order.forEach((l, k) => {
        const b = plan.lots[k]?.building;
        if (b) at[l - (city.blocks.firstLot[block] as number)] = b;
      });
      byLot = at;
      faces.set(key, byLot);
    }
    return byLot[lot - (city.blocks.firstLot[block] as number)];
  };
  const n = roster.places;
  const placed = { lot: new Int32Array(n), x: new Float64Array(n), y: new Float64Array(n), building: [] as string[] };
  for (let p = 0; p < n; p++) {
    const kind: Kind = p < roster.firstShared ? 'home' : p < roster.firstThird ? 'work' : 'third';
    // A workplace stands where its career's employers do (M2.3, market/employers.ts), when that is known.
    const pool = lots[districtOf?.(p) ?? districtFor(weight(kind), mix(seed, 20, p))] as number[];
    let chosen = -1;
    let building: BuildingPlan | undefined;
    // A few lots by chance, then on along the district's lots from the last, so a building that
    // suits is found if the district has one: downtown has few homes.
    const start = pool.length > 0 ? mix(seed, 21, p) % pool.length : 0;
    for (let t = 0; t < pool.length; t++) {
      const lot = pool[(t < TRIES ? mix(seed, 21, p, t) : start + t) % pool.length] as number;
      if (skip && city.lots.block[lot] === skip.block && city.lots.side[lot] === skip.side) continue;
      const walkable = ct.districts[city.blocks.district[city.lots.block[lot] as number] as number]?.frontage;
      const b = walkable ? buildingOn(lot) : undefined;
      if (chosen < 0 || !walkable || suits(kind, b)) {
        chosen = lot;
        building = b;
      }
      if (!walkable || suits(kind, b)) break;
    }
    const at = lotFront(city.blocks, city.lots, Math.max(0, chosen));
    placed.lot[p] = chosen;
    placed.x[p] = at.x;
    placed.y[p] = at.y;
    placed.building.push(building && suits(kind, building) ? building.id : '');
  }
  return placed;
}
