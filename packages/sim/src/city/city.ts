/**
 * The whole city (M2.1, D65): a square of cells, each given a district by where it lies, and each
 * filled with that district's blocks and their lots, whole blocks to a cell. Nothing is placed by hand: the seed and the
 * city and district records decide it all, and the same seed always gives the same city. Blocks
 * and lots are kept in typed arrays, since the city has tens of thousands of them; what stands on
 * a lot is worked out only when its block is needed (M2.1's later steps).
 *
 * North is −y and east is +x, in metres from the city's north-west corner, as a block's are.
 */
import { type RecordStore, Rng } from '@eb/core';

export interface DistrictRecord {
  readonly name: string;
  readonly walkable: boolean;
  readonly colour: string;
  readonly block: { readonly length: number; readonly depth: number; readonly street: number };
  readonly lots: { readonly min: number; readonly max: number };
  readonly density: number;
  readonly income: 'low' | 'working' | 'middle' | 'upper';
  readonly frontage?: string;
}

export interface CityRecord {
  readonly name: string;
  readonly cell: number;
  readonly size: number;
  readonly arterialEvery: number;
  readonly core: { readonly district: string; readonly radius: number };
  readonly ring: { readonly district: string; readonly radius: number };
  readonly band: { readonly district: string; readonly width: number };
  readonly strip: { readonly district: string; readonly width: number };
  readonly rest: string;
  readonly population: { readonly min: number; readonly max: number };
  readonly institutions: readonly { readonly building: string; readonly district: string }[];
}

export const CITY = 'ridgefield';

export interface CityPlan {
  readonly name: string;
  readonly seed: string;
  /** Cells along each side, and a cell's side in metres. */
  readonly size: number;
  readonly cell: number;
  /** The district ids, in the order their indices below refer to. */
  readonly districts: readonly string[];
  /** Each cell's district, row by row from the north-west. */
  readonly cellDistrict: Uint8Array;
  /** The centre cell, the river's first row, and the strip's column. */
  readonly centre: { readonly col: number; readonly row: number };
  readonly river: number;
  readonly stripCol: number;
  readonly blocks: Blocks;
  readonly lots: Lots;
  /** People, by district density and area, streets included. */
  readonly population: number;
  /** The buildings the city has one of, and the lot each stands on. */
  readonly institutions: readonly { readonly building: string; readonly lot: number }[];
}

/** Each block: its corner, size and district, and where its lots start in `lots`. */
export interface Blocks {
  readonly count: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly w: Float64Array;
  readonly d: Float64Array;
  readonly district: Uint8Array;
  readonly firstLot: Uint32Array;
}

/** Each lot: its block, which face of it (0 north, 1 south), and where along it, in metres. */
export interface Lots {
  readonly count: number;
  readonly block: Uint32Array;
  readonly side: Uint8Array;
  readonly start: Float64Array;
  readonly width: Float64Array;
}

const recordOf = <T>(store: RecordStore, type: string, id: string): T => {
  const r = store.get<T>(type, id);
  if (!r) throw new Error(`city: no ${type} "${id}"`);
  return r;
};

/** Which district each cell is: downtown at the centre, the ring round it, the river's band, the strip, the rest. */
function zone(city: CityRecord, rng: Rng) {
  const n = city.size;
  const half = Math.floor(n / 2);
  const centre = { col: half + rng.int(-2, 2), row: half + rng.int(-2, 2) };
  const off = rng.int(2, 5) * (rng.chance(1, 2) ? 1 : -1);
  const river = centre.row + off;
  const stripCol = centre.col + Math.ceil(city.ring.radius) * (rng.chance(1, 2) ? 1 : -1);
  const ids = [city.core.district, city.ring.district, city.band.district, city.strip.district, city.rest];
  const districts = [...new Set(ids)];
  const index = (id: string) => districts.indexOf(id);
  const cellDistrict = new Uint8Array(n * n);
  const core2 = city.core.radius * city.core.radius;
  const ring2 = city.ring.radius * city.ring.radius;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const dx = col - centre.col;
      const dy = row - centre.row;
      const d2 = dx * dx + dy * dy;
      const inBand = row >= river && row < river + city.band.width;
      const onStrip = Math.abs(col - stripCol) < city.strip.width && d2 > ring2 && Math.sign(dy) === Math.sign(off);
      let id = city.rest;
      if (d2 <= core2) id = city.core.district;
      else if (inBand) id = city.band.district;
      else if (d2 <= ring2) id = city.ring.district;
      else if (onStrip) id = city.strip.district;
      cellDistrict[row * n + col] = index(id);
    }
  }
  return { districts, cellDistrict, centre, river, stripCol };
}

/**
 * Lot frontages along one face of a block, whole metres each within the district's range: the
 * last takes what's left, and any lot is drawn short enough to leave room for one more.
 */
function frontages(length: number, lots: DistrictRecord['lots'], rng: Rng): number[] {
  const out: number[] = [];
  let left = Math.floor(length);
  while (left >= lots.min) {
    // Too long for one lot and too short for two: a full lot, and the rest a strip of side yard.
    if (left > lots.max && left < 2 * lots.min) {
      out.push(lots.max);
      break;
    }
    const w = left <= lots.max ? left : rng.int(lots.min, Math.min(lots.max, left - lots.min));
    out.push(w);
    left -= w;
  }
  return out;
}

/** Where a lot's front meets its street, in the city's metres. */
export function lotFront(blocks: Blocks, lots: Lots, lot: number): { x: number; y: number } {
  const b = lots.block[lot] as number;
  return {
    x: (blocks.x[b] as number) + (lots.start[lot] as number) + (lots.width[lot] as number) / 2,
    y: (blocks.y[b] as number) + (lots.side[lot] === 1 ? (blocks.d[b] as number) : 0),
  };
}

/** The lot of a district nearest a point that is at least `width` wide and not taken; −1 if none. */
function nearestLot(
  blocks: Blocks,
  lots: Lots,
  at: { x: number; y: number },
  district: number,
  width: number,
  taken: ReadonlySet<number>,
): number {
  let best = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let l = 0; l < lots.count; l++) {
    if (blocks.district[lots.block[l] as number] !== district || (lots.width[l] as number) < width || taken.has(l))
      continue;
    const p = lotFront(blocks, lots, l);
    const d = (p.x - at.x) * (p.x - at.x) + (p.y - at.y) * (p.y - at.y);
    if (d < bestD) {
      best = l;
      bestD = d;
    }
  }
  return best;
}

/**
 * How many blocks a district's cell holds each way: as many of the district's size as come
 * nearest to filling it. Each is then stretched or squeezed so whole blocks fill the cell, and
 * the cell's edges are the middles of streets, which the cells round it share (streets.ts).
 */
export function gridOf(cell: number, d: DistrictRecord): { across: number; down: number } {
  return {
    across: Math.max(1, Math.round(cell / (d.block.length + d.block.street))),
    down: Math.max(1, Math.round(cell / (d.block.depth + d.block.street))),
  };
}

/** The city from a seed: its districts, blocks and lots. */
export function planCity(store: RecordStore, seed: string, id = CITY): CityPlan {
  const city = recordOf<CityRecord>(store, 'city', id);
  const root = Rng.create(`city:${seed}`);
  const z = zone(city, root.fork('zones'));
  const records = z.districts.map((d) => recordOf<DistrictRecord>(store, 'district', d));
  const bx: number[] = [];
  const by: number[] = [];
  const bw: number[] = [];
  const bd: number[] = [];
  const bdist: number[] = [];
  const first: number[] = [];
  const lb: number[] = [];
  const ls: number[] = [];
  const lstart: number[] = [];
  const lw: number[] = [];
  let population = 0;
  const n = city.size;
  const hectares = (city.cell * city.cell) / 10_000;
  for (let cell = 0; cell < n * n; cell++) {
    const di = z.cellDistrict[cell] as number;
    const d = records[di] as DistrictRecord;
    population += d.density * hectares;
    const rng = root.fork(cell);
    const cx = (cell % n) * city.cell;
    const cy = Math.floor(cell / n) * city.cell;
    const { across, down } = gridOf(city.cell, d);
    const length = city.cell / across - d.block.street;
    const depth = city.cell / down - d.block.street;
    for (let j = 0; j < down; j++) {
      for (let i = 0; i < across; i++) {
        const block = bx.length;
        bx.push(cx + d.block.street / 2 + (i * city.cell) / across);
        by.push(cy + d.block.street / 2 + (j * city.cell) / down);
        bw.push(length);
        bd.push(depth);
        bdist.push(di);
        first.push(lb.length);
        for (let side = 0; side < 2; side++) {
          let at = 0;
          for (const w of frontages(length, d.lots, rng)) {
            lb.push(block);
            ls.push(side);
            lstart.push(at);
            lw.push(w);
            at += w;
          }
        }
      }
    }
  }
  const blocks: Blocks = {
    count: bx.length,
    x: Float64Array.from(bx),
    y: Float64Array.from(by),
    w: Float64Array.from(bw),
    d: Float64Array.from(bd),
    district: Uint8Array.from(bdist),
    firstLot: Uint32Array.from(first),
  };
  const lots: Lots = {
    count: lb.length,
    block: Uint32Array.from(lb),
    side: Uint8Array.from(ls),
    start: Float64Array.from(lstart),
    width: Float64Array.from(lw),
  };
  const centre = { x: (z.centre.col + 0.5) * city.cell, y: (z.centre.row + 0.5) * city.cell };
  const taken = new Set<number>();
  const institutions = city.institutions.map(({ building, district }) => {
    const b = recordOf<{ width: { min: number } }>(store, 'building', building);
    const lot = nearestLot(blocks, lots, centre, z.districts.indexOf(district), b.width.min, taken);
    if (lot < 0) throw new Error(`city: no lot in ${district} fits ${building}`);
    taken.add(lot);
    return { building, lot };
  });
  return {
    name: city.name,
    seed,
    size: n,
    cell: city.cell,
    districts: z.districts,
    cellDistrict: z.cellDistrict,
    centre: z.centre,
    river: z.river,
    stripCol: z.stripCol,
    blocks,
    lots,
    population: Math.round(population),
    institutions,
  };
}

/** The district record of a district index in a plan. */
export const districtOf = (store: RecordStore, plan: CityPlan, index: number): DistrictRecord =>
  recordOf<DistrictRecord>(store, 'district', plan.districts[index] as string);
