/**
 * Your block in Ridgefield (M2.1, D67): the slice's block, where it stands in the city, with the
 * blocks round it drawn and walkable. The city is planned from your block's seed, so it is the
 * same city every time you come back. Everything is in the home frame, the slice's block's own,
 * so your places, the walk to work and where you stood are unchanged.
 */
import { contentStore } from '@lyl/content';
import {
  aroundHome,
  type BlockPlan,
  type BuildingPlan,
  blockTemplates,
  type CityPlan,
  cityTemplates,
  type DistrictRecord,
  districtOf,
  faceRect,
  type Home,
  homeOf,
  type NearFace,
  planBlock,
  planCity,
  walkGridAround,
} from '@lyl/sim';
import { BUILDING, type Building, GROUND, type Patch, type Scene } from '@lyl/stage';
import { type BlockScene, buildingOf, groundOf, propOf } from './scene.ts';

/** How far round your block the town is drawn and can be walked, in metres (tune). */
export const REACH = 60;

const TEMPLATES = blockTemplates(contentStore(), 'slice');

export interface TownScene extends BlockScene {
  readonly home: Home;
  readonly city: CityPlan;
  /** The city's district records, in its order. */
  readonly districts: readonly DistrictRecord[];
  /** The middles of the town's sidewalks, a line each side of each block, with the people a hectare there. */
  readonly walkways: readonly Walkway[];
  /** Just north of the nearest building across the street from your block, and its id: for the tests. */
  readonly across: { readonly x: number; readonly y: number; readonly id: string } | null;
}

export interface Walkway {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly density: number;
}

/** A sidewalk's middle along each side of each block in the town, clipped to the town's ground. */
function walkwaysOf(
  around: { blocks: readonly { x0: number; y0: number; x1: number; y1: number }[]; sidewalk: number },
  ids: readonly number[],
  density: (b: number) => number,
  b: { x0: number; y0: number; x1: number; y1: number },
): Walkway[] {
  const h = around.sidewalk / 2;
  const out: Walkway[] = [];
  around.blocks.forEach((r, k) => {
    const d = density(ids[k] as number);
    const lines = [
      { x0: r.x0 - h, y0: r.y0 - h, x1: r.x1 + h, y1: r.y0 - h },
      { x0: r.x0 - h, y0: r.y1 + h, x1: r.x1 + h, y1: r.y1 + h },
      { x0: r.x0 - h, y0: r.y0 - h, x1: r.x0 - h, y1: r.y1 + h },
      { x0: r.x1 + h, y0: r.y0 - h, x1: r.x1 + h, y1: r.y1 + h },
    ];
    for (const l of lines) {
      const c = {
        x0: Math.max(l.x0, b.x0),
        y0: Math.max(l.y0, b.y0),
        x1: Math.min(l.x1, b.x1),
        y1: Math.min(l.y1, b.y1),
      };
      if (c.x0 <= c.x1 && c.y0 <= c.y1 && c.x1 - c.x0 + (c.y1 - c.y0) > 4) out.push({ ...c, density: d });
    }
  });
  return out;
}

/** A building of a face near home, in the home frame. A north face's fronts face away: its back is what shows. */
function nearBuilding(city: Parameters<typeof faceRect>[0], h: Home, f: NearFace, b: BuildingPlan): Building {
  const r = faceRect(city, h, f, b);
  const id = `${f.block}-${f.side}-${b.id}`;
  if (f.side === 1) {
    const { interior: _, ...whole } = buildingOf({ ...b, ...r, door: b.door - b.x0 + r.x0 });
    return { ...whole, id };
  }
  return {
    id,
    kind: b.template,
    ...r,
    storeys: b.storeys,
    storeyHeight: b.storeyHeight,
    facade: {
      wall: b.facade.wall,
      trim: b.facade.trim,
      roof: BUILDING.roof,
      bays: Math.max(2, Math.round((r.x1 - r.x0) / 2.6)),
      ground: 'back',
      litBits: b.facade.lit,
    },
  };
}

/** Your block for a seed, in the city, as the stage draws it. */
export function townScene(seed: string): TownScene {
  const store = contentStore();
  const plan: BlockPlan = planBlock(TEMPLATES, seed);
  const city = planCity(store, seed);
  const home = homeOf(city, 'inner-ring', plan);
  const { around, faces, ids } = aroundHome(cityTemplates(store, city), city, home, plan, REACH);
  const districts = city.districts.map((_, i) => districtOf(store, city, i));
  const fronts = plan.buildings.map(buildingOf);
  const others = faces.flatMap((f) => f.plan.buildings.map((b) => nearBuilding(city, home, f, b)));
  const { area, blocks, sidewalk } = around;
  const west = (city.blocks.x[home.block] as number) - home.ox;
  const own = groundOf(plan, { x0: west, x1: west + (city.blocks.w[home.block] as number) });
  const patches: Patch[] = [
    { ...area, color: GROUND.asphalt },
    ...blocks.map((b) => ({
      x0: b.x0 - sidewalk,
      y0: b.y0 - sidewalk,
      x1: b.x1 + sidewalk,
      y1: b.y1 + sidewalk,
      color: GROUND.sidewalk,
    })),
    ...blocks.map((b) => ({ ...b, color: GROUND.gravel })),
    ...own.patches,
  ];
  const scene: Scene = {
    ground: { ...own, patches },
    buildings: [...others, ...fronts],
    // Only the home block's near side keeps its furniture: across the street is the next block.
    props: plan.props.filter((p) => p.y < plan.street.farCurb).map(propOf),
    bounds: { x0: area.x0 + 4, y0: area.y0 + 4, x1: area.x1 - 4, y1: area.y1 - 4 },
  };
  const facing = others
    .filter((b) => b.y0 > plan.street.farCurb && b.x0 > 0 && b.x1 < plan.street.xb)
    .sort((a, b) => a.y0 - b.y0)[0];
  const across = facing ? { x: (facing.x0 + facing.x1) / 2, y: facing.y0 - 1, id: facing.id } : null;
  const needed = (kind: string) => fronts.find((b) => b.kind === kind) as Building;
  return {
    scene,
    people: [],
    byKind: { diner: needed('diner'), apartment: needed('apartment'), storefront: needed('corner-shop') },
    curb: plan.street.curb,
    plan,
    grid: walkGridAround(plan, around),
    fronts,
    home,
    city,
    across,
    districts,
    walkways: walkwaysOf(
      around,
      ids,
      (b) => (districts[city.blocks.district[b] as number] as DistrictRecord).density,
      scene.bounds,
    ),
  };
}
