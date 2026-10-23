/**
 * Your life's block in the city (D67): the slice's block, planned from its own seed as M1.1 plans
 * it, stands whole as the south face of an inner-ring block, the one nearest downtown that is long
 * enough to hold it. The city is planned from the same seed, so where you live is worked out from
 * the save, never stored in it, and a save from before the city loads unchanged.
 *
 * The home frame is the slice's block's own frame (block.ts), so the places, the walk to work and
 * where you stood stay as they were; `homeToCity` and `cityToHome` move between it and the city.
 */
import type { BlockPlan } from './block.ts';
import type { CityPlan } from './city.ts';
import { type CityTemplates, planFace, type Side, toCity } from './face.ts';
import type { Rect } from './rooms.ts';
import type { Around } from './walk.ts';

export interface Home {
  readonly block: number;
  /** The city's x and y of the home frame's origin. */
  readonly ox: number;
  readonly oy: number;
}

/** The slice's block's length, end building to end building. */
const spanOf = (plan: BlockPlan): number => (plan.lots[plan.lots.length - 1]?.x1 ?? 0) - (plan.lots[0]?.x0 ?? 0);

/**
 * The south face of the district's block nearest the city's centre that holds the slice's block,
 * and where the home frame's origin lands: the slice's lots from the block's west end, their fronts
 * on its south lot line.
 */
export function homeOf(city: CityPlan, district: string, plan: BlockPlan): Home {
  const want = city.districts.indexOf(district);
  const span = spanOf(plan);
  const cx = (city.centre.col + 0.5) * city.cell;
  const cy = (city.centre.row + 0.5) * city.cell;
  let best = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let b = 0; b < city.blocks.count; b++) {
    if (city.blocks.district[b] !== want || (city.blocks.w[b] as number) < span) continue;
    const x = (city.blocks.x[b] as number) + (city.blocks.w[b] as number) / 2 - cx;
    const y = (city.blocks.y[b] as number) + (city.blocks.d[b] as number) - cy;
    const d = x * x + y * y;
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  if (best < 0) throw new Error(`city: no ${district} block holds a block ${span} m long`);
  return {
    block: best,
    ox: (city.blocks.x[best] as number) - (plan.lots[0]?.x0 ?? 0),
    oy: (city.blocks.y[best] as number) + (city.blocks.d[best] as number) - plan.street.lotFront,
  };
}

export const homeToCity = (h: Home, x: number, y: number) => ({ x: x + h.ox, y: y + h.oy });
export const cityToHome = (h: Home, x: number, y: number) => ({ x: x - h.ox, y: y - h.oy });

/** A face near home, its plan in its own frame, and how its frame lands in the home frame. */
export interface NearFace {
  readonly block: number;
  readonly side: Side;
  readonly plan: BlockPlan;
  /** The face's lot line in its frame, for `toCity`. */
  readonly lotDepth: number;
}

/** A rectangle of a face's frame in the home frame: a north face is turned half round. */
export function faceRect(city: CityPlan, h: Home, f: NearFace, r: Rect): Rect {
  const a = toCity(city, f.block, f.side, f.lotDepth, r.x0, r.y0);
  const b = toCity(city, f.block, f.side, f.lotDepth, r.x1, r.y1);
  return {
    x0: Math.min(a.x, b.x) - h.ox,
    y0: Math.min(a.y, b.y) - h.oy,
    x1: Math.max(a.x, b.x) - h.ox,
    y1: Math.max(a.y, b.y) - h.oy,
  };
}

/**
 * The blocks within `reach` metres of the home block, in the home frame, with the faces of those
 * the walkable districts plan; the home face itself is the slice's block and is left out. `ids`
 * are the blocks' indices in the city, in the order of `around.blocks`.
 */
export function aroundHome(
  ct: CityTemplates,
  city: CityPlan,
  h: Home,
  plan: BlockPlan,
  reach: number,
): { around: Around; faces: NearFace[]; ids: number[] } {
  const s = plan.street;
  const area = { x0: s.xa - reach, y0: s.alley - reach, x1: s.xb + reach, y1: s.farCurb + reach };
  const blocks: Rect[] = [];
  const faces: NearFace[] = [];
  const solids: Rect[] = [];
  const ids: number[] = [];
  for (let b = 0; b < city.blocks.count; b++) {
    const x0 = (city.blocks.x[b] as number) - h.ox;
    const y0 = (city.blocks.y[b] as number) - h.oy;
    const r = { x0, y0, x1: x0 + (city.blocks.w[b] as number), y1: y0 + (city.blocks.d[b] as number) };
    if (r.x1 < area.x0 || r.x0 > area.x1 || r.y1 < area.y0 || r.y0 > area.y1) continue;
    blocks.push(r);
    ids.push(b);
    if (!ct.districts[city.blocks.district[b] as number]?.frontage) continue;
    for (const side of [0, 1] as Side[]) {
      if (b === h.block && side === 1) continue;
      const p = planFace(ct, city, b, side);
      const face: NearFace = { block: b, side, plan: p, lotDepth: p.street.lotFront };
      faces.push(face);
      for (const building of face.plan.buildings) solids.push(faceRect(city, h, face, building));
    }
  }
  return { around: { area, blocks, sidewalk: s.curb - s.lotFront, solids }, faces, ids };
}
