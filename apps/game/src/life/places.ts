/**
 * Where you can do things on the block (M1.6): the fixtures in your flat and in the diner, by what
 * their records say they serve; each shelf in the corner shop, with the goods it holds; the fence
 * behind the diner; the corner by the corner shop (M2.4); and every building's front door, for the map (D51). Your flat is one of the
 * walk-up's, chosen from the block's seed: where you live is the page's to show until the city
 * gives homes to people (M2.2). Nothing here decides anything: the sim's options still say what
 * can be done.
 */
import { type RecordStore, Rng } from '@eb/core';
import {
  type BlockPlan,
  type BuildingPlan,
  CELL,
  cellAt,
  centreOf,
  doorStep,
  type FixturePlan,
  type PlaceActivity,
  shopOn,
  stockOf,
  useCell,
  type WalkGrid,
  walkGrid,
} from '@lyl/sim';

export type PlaceKind = 'fixture' | 'shelf' | 'fence' | 'corner' | 'door';

export interface Place {
  readonly id: string;
  readonly kind: PlaceKind;
  readonly label: string;
  readonly building: string;
  /** Where you stand to use it, and its cell. */
  readonly stand: { readonly x: number; readonly y: number };
  readonly cell: number;
  /** What tapping hits: its footprint, or round where you stand. */
  readonly hit: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  readonly serves?: readonly PlaceActivity[];
  readonly take?: { readonly spot: string; readonly item: string };
  readonly fixture?: FixturePlan;
}

export interface Places {
  readonly all: readonly Place[];
  /** Your flat's unit, and the place you start the day: your bed. */
  readonly home: string;
  readonly bed: Place;
}

const nameOf = (store: RecordStore, type: string, id: string): string =>
  store.get<{ name: string }>(type, id)?.name ?? id;

const capital = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

const footprint = (f: FixturePlan) => ({ x0: f.x - f.w / 2, y0: f.y - f.d / 2, x1: f.x + f.w / 2, y1: f.y + f.d / 2 });
const around = (p: { x: number; y: number }, r: number) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });

function fixturePlaces(
  store: RecordStore,
  grid: WalkGrid,
  b: BuildingPlan,
  rooms: ReadonlySet<string> | null,
): Place[] {
  const inside = b.interior;
  if (!inside) return [];
  return inside.fixtures.flatMap((f) => {
    if (!f.use || (rooms && !rooms.has(f.room))) return [];
    const cell = useCell(grid, inside, f);
    if (cell < 0) return [];
    const stand = centreOf(grid, cell);
    const label = nameOf(store, 'fixture', f.template);
    return [
      {
        id: f.id,
        kind: 'fixture',
        label,
        building: b.id,
        stand,
        cell,
        hit: footprint(f),
        serves: f.use.serves,
        fixture: f,
      },
    ];
  });
}

function shelfPlaces(store: RecordStore, grid: WalkGrid, plan: BlockPlan, block: string): Place[] {
  const sight = shopOn(store, block);
  const shop = plan.buildings.find((b) => b.id === sight.building);
  const fixtures = shop?.interior?.fixtures ?? [];
  // The law's sight lines count cells of the block's own grid (sight.ts); the page may walk a wider
  // one (the town, M2.1), whose cells line up with it but are numbered otherwise.
  const own = walkGrid(plan);
  return stockOf(store, block).flatMap(({ spot, item }) => {
    const at = sight.spots.find((s) => s.id === spot);
    const f = fixtures.find((x) => x.id === spot);
    if (!at || !f || !shop) return [];
    const stand = centreOf(own, at.cell);
    const label = nameOf(store, 'item', item);
    return [
      {
        id: spot,
        kind: 'shelf',
        label,
        building: shop.id,
        stand,
        cell: cellAt(grid, stand.x, stand.y),
        hit: footprint(f),
        take: { spot, item },
        fixture: f,
      },
    ];
  });
}

/** The fence's spot: the yard outside the diner's back door. */
function fencePlace(grid: WalkGrid, plan: BlockPlan): Place[] {
  const diner = plan.buildings.find((b) => b.interior?.template === 'diner');
  const back = diner?.interior?.doors.find((d) => d.wall === 'n');
  if (!diner || !back) return [];
  const stand = { x: back.x, y: diner.y0 - 2 * CELL };
  const cell = cellAt(grid, stand.x, stand.y);
  if (cell < 0 || (grid.cost[cell] as number) === Number.POSITIVE_INFINITY) return [];
  const label = 'Behind the diner';
  return [
    { id: 'fence', kind: 'fence', label, building: diner.id, stand: centreOf(grid, cell), cell, hit: around(stand, 1) },
  ];
}

/**
 * The corner (M2.4, D78): the sidewalk a few steps along from the corner shop's door, where buyers
 * come and the supplier stands at their hours. The first of those steps that can be walked.
 */
function cornerPlace(store: RecordStore, grid: WalkGrid, plan: BlockPlan, block: string): Place[] {
  const shop = plan.buildings.find((b) => b.id === shopOn(store, block).building);
  if (!shop) return [];
  const door = doorStep(shop);
  for (const dx of [3, -3, 4, -4, 2, -2]) {
    const cell = cellAt(grid, door.x + dx * CELL, door.y);
    if (cell < 0 || (grid.cost[cell] as number) === Number.POSITIVE_INFINITY) continue;
    const stand = centreOf(grid, cell);
    return [
      { id: 'corner', kind: 'corner', label: 'The corner', building: shop.id, stand, cell, hit: around(stand, 1) },
    ];
  }
  return [];
}

function doorPlaces(store: RecordStore, grid: WalkGrid, plan: BlockPlan, home: string | null): Place[] {
  return plan.buildings.flatMap((b) => {
    const stand = doorStep(b);
    const cell = cellAt(grid, stand.x, stand.y);
    if (cell < 0) return [];
    // A shop goes by its sign, as people name it; the rest by what they are.
    const sign = b.facade.sign?.text;
    const label = b.id === home ? 'Your building' : sign ? capital(sign) : nameOf(store, 'building', b.template);
    return [{ id: `door/${b.id}`, kind: 'door', label, building: b.id, stand, cell, hit: around(stand, 0.8) }];
  });
}

export function placesOf(store: RecordStore, plan: BlockPlan, grid: WalkGrid, block: string): Places {
  const flat = plan.buildings.find((b) => b.interior?.template === 'walk-up');
  const units = flat?.interior?.units ?? [];
  if (!flat || units.length === 0) throw new Error(`block "${block}": no walk-up to live in`);
  const unit = Rng.create(`home:${block}`).pick(units);
  const diner = plan.buildings.find((b) => b.interior?.template === 'diner');
  const all = [
    ...fixturePlaces(store, grid, flat, new Set(unit.rooms)),
    ...(diner ? fixturePlaces(store, grid, diner, null) : []),
    ...shelfPlaces(store, grid, plan, block),
    ...fencePlace(grid, plan),
    ...cornerPlace(store, grid, plan, block),
    ...doorPlaces(store, grid, plan, flat.id),
  ];
  const bed = all.find((p) => p.building === flat.id && p.serves?.includes('sleep'));
  if (!bed) throw new Error(`block "${block}": your flat has no bed`);
  return { all, home: unit.id, bed };
}

/** How near where you'd stand a tap may land and still mean the place, in metres (tune). */
const NEAR = 0.6;

/** The place a tap on the ground at (x, y) means, if any: what it hits, or where you'd stand at it; the nearest first. */
export function placeAt(places: Places, x: number, y: number): Place | undefined {
  const far = (p: Place) => (p.stand.x - x) ** 2 + (p.stand.y - y) ** 2;
  const hits = places.all.filter(
    (p) => (x >= p.hit.x0 && x <= p.hit.x1 && y >= p.hit.y0 && y <= p.hit.y1) || far(p) <= NEAR * NEAR,
  );
  return hits.sort((a, b) => far(a) - far(b))[0];
}
