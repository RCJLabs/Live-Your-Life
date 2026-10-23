/**
 * One face of one of the city's blocks (M2.1): its buildings, interiors, street and furniture,
 * worked out only when the face is needed, from the city's seed and the district's frontage, the
 * same way every time. The city (city.ts) has already fixed each lot's frontage; this picks what
 * stands on each, among the frontage's buildings narrow enough to fit, and the city's
 * institutions on the lots it gave them.
 *
 * The plan is a block plan (block.ts) in the face's own frame, so everything that walks, draws
 * and checks a slice's block takes it unchanged: x runs along the face from its west end as seen
 * from the street, and y from the lots' backs at 0 to their fronts, the street beyond. A south
 * face lies in the city as drawn; a north face is turned half round (`toCity`).
 */
import { type RecordStore, Rng } from '@eb/core';
import { type BackPlan, type BlockPlan, between, buildingOf, type LotPlan, type StreetPlan } from './block.ts';
import { type CityPlan, type DistrictRecord, districtOf } from './city.ts';
import { type BuildingRecord, type FrontageTemplates, frontageTemplates } from './records.ts';
import { streetProps } from './street.ts';

export type Side = 0 | 1;

/** Each district's record, and its frontage once it can be walked, read once for a city. */
export interface CityTemplates {
  readonly districts: readonly { readonly record: DistrictRecord; readonly frontage?: FrontageTemplates }[];
}

export function cityTemplates(store: RecordStore, city: CityPlan): CityTemplates {
  const also = [...new Set(city.institutions.map((i) => i.building))];
  return {
    districts: city.districts.map((_, i) => {
      const record = districtOf(store, city, i);
      return record.walkable && record.frontage
        ? { record, frontage: frontageTemplates(store, record.frontage, also) }
        : { record };
    }),
  };
}

/** A face's lots, west to east in its frame, with the institution that stands on each, if any. */
interface FaceLot {
  readonly x0: number;
  readonly width: number;
  readonly institution?: string;
}

/** How deep a face's lots run: half the block, less half the alley between the two rows. */
export const lotDepthOf = (t: FrontageTemplates, city: CityPlan, block: number): number =>
  ((city.blocks.d[block] as number) - t.street.alley) / 2;

function faceLots(city: CityPlan, block: number, side: Side): FaceLot[] {
  const { blocks, lots } = city;
  const w = blocks.w[block] as number;
  const end = block + 1 < blocks.count ? (blocks.firstLot[block + 1] as number) : lots.count;
  const out: FaceLot[] = [];
  for (let l = blocks.firstLot[block] as number; l < end; l++) {
    if (lots.side[l] !== side) continue;
    const start = lots.start[l] as number;
    const width = lots.width[l] as number;
    const institution = city.institutions.find((i) => i.lot === l)?.building;
    // A north face is seen from the north: its west end, as you face it, is the city's east.
    const x0 = side === 1 ? start : w - start - width;
    out.push({ x0, width, ...(institution ? { institution } : {}) });
  }
  return out.sort((a, b) => a.x0 - b.x0);
}

/** The building on a lot by the frontage's weights, among those that fit; null for an empty one. */
function pick(t: FrontageTemplates, width: number, rng: Rng): string | null {
  const fits = Object.entries(t.frontage.fill).filter(
    ([id]) => (t.buildings.get(id) as BuildingRecord).width.min + t.frontage.gap.min <= width,
  );
  const k = rng.weightedIndex([...fits.map(([, w]) => w), t.frontage.vacant]);
  return k < fits.length ? (fits[k] as [string, number])[0] : null;
}

/** Each lot's building, or none, its front on the lot line and its gap drawn within the lot. */
function lotsOf(t: FrontageTemplates, city: CityPlan, block: number, side: Side): LotPlan[] {
  const rng = Rng.create(`face:${city.seed}:${block}:${side}`);
  const front = lotDepthOf(t, city, block);
  const seen = new Map<string, number>();
  return faceLots(city, block, side).map((lot, i): LotPlan => {
    const r = rng.fork(`lot-${i}`);
    const x1 = lot.x0 + lot.width;
    const template = lot.institution ?? pick(t, lot.width, r);
    if (template === null) return { x0: lot.x0, x1 };
    const b = t.buildings.get(template) as BuildingRecord;
    const room = Math.max(0, lot.width - b.width.min);
    const gap = between(r, { min: Math.min(t.frontage.gap.min, room), max: Math.min(t.frontage.gap.max, room) });
    // Whole tenths, never wider than the lot leaves once the gap is taken.
    const width = Math.min(b.width.max, Math.floor((lot.width - gap) * 10) / 10);
    const n = (seen.get(template) ?? 0) + 1;
    seen.set(template, n);
    const id = n === 1 ? template : `${template}-${n}`;
    return { x0: lot.x0, x1, building: buildingOf(t, r, template, id, lot.x0 + gap / 2, front, width) };
  });
}

/** The street in front of the face, out to the middle of the cross streets at each end. */
function streetOf(t: FrontageTemplates, city: CityPlan, block: number, across: number, rng: Rng): StreetPlan {
  const s = t.street;
  const lotFront = lotDepthOf(t, city, block);
  const curb = lotFront + s.sidewalk;
  const farCurb = curb + s.curb * 2 + s.roadway;
  return {
    xa: -across / 2,
    xb: (city.blocks.w[block] as number) + across / 2,
    alley: -s.alley,
    lotFront,
    curb,
    farCurb,
    openFront: farCurb + s.open.sidewalk,
    openBack: farCurb + s.open.sidewalk + s.open.depth,
    curbWidth: s.curb,
    open: rng.pick(s.open.kinds),
  };
}

/**
 * The other face of the block, across the alley, as this face sees it: from behind, turned half
 * round, its buildings at its own street's lot line beyond the yards.
 */
function backRowOf(t: FrontageTemplates, city: CityPlan, block: number, side: Side): BackPlan[] {
  const w = city.blocks.w[block] as number;
  const back = -t.street.alley - lotDepthOf(t, city, block);
  return lotsOf(t, city, block, side === 1 ? 0 : 1).flatMap((lot): BackPlan[] => {
    const b = lot.building;
    if (!b) return [];
    return [
      {
        x0: w - b.x1,
        x1: w - b.x0,
        y0: back,
        y1: back + (b.y1 - b.y0),
        storeys: b.storeys,
        storeyHeight: b.storeyHeight,
        wall: b.facade.wall,
        trim: b.facade.trim,
        bays: Math.max(2, Math.round((b.x1 - b.x0) / 2.6)),
        lit: b.facade.lit,
      },
    ];
  });
}

/** A face of a block in a walkable district, the same for the same city every time. */
export function planFace(ct: CityTemplates, city: CityPlan, block: number, side: Side): BlockPlan {
  const d = ct.districts[city.blocks.district[block] as number];
  if (!d?.frontage) throw new Error(`city: block ${block} is not in a district that can be walked`);
  const t = d.frontage;
  const rng = Rng.create(`face:${city.seed}:${block}:${side}`).fork('street');
  const lots = lotsOf(t, city, block, side);
  const street = streetOf(t, city, block, d.record.block.street, rng);
  const buildings = lots.flatMap((lot) => (lot.building ? [lot.building] : []));
  return {
    seed: `${city.seed}:${block}:${side}`,
    template: t.id,
    street,
    lots,
    buildings,
    backRow: backRowOf(t, city, block, side),
    props: streetProps(t.street, street, buildings, rng.fork('props')),
  };
}

/** A point in a face's frame, in the city's metres. */
export function toCity(city: CityPlan, block: number, side: Side, lotDepth: number, x: number, y: number) {
  const bx = city.blocks.x[block] as number;
  const by = city.blocks.y[block] as number;
  if (side === 1) return { x: bx + x, y: by + (city.blocks.d[block] as number) - lotDepth + y };
  return { x: bx + (city.blocks.w[block] as number) - x, y: by + lotDepth - y };
}
