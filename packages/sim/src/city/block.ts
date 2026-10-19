/**
 * One block (M1.1, D32): one side of one street, laid out from the seed and the templates in
 * packages/content. Nothing is placed by hand. The lots run west to east, the slice's
 * buildings among them and the ones that stand on a corner at an end; each building's front is
 * picked within its facade's rules; the street, its open side and its furniture follow. The same
 * seed always gives the same block (the engine's `Rng`).
 *
 * North is −y. Lots run from the alley at y = 0 south to their front at the street's lot depth;
 * the street and its open side lie south of them, nearest the camera.
 */
import { Rng } from '@eb/core';
import type {
  Awning,
  BlockTemplates,
  BuildingRecord,
  CorniceKind,
  FacadeRecord,
  GroundKind,
  OpenKind,
  Paint,
  Range,
  Use,
  WindowKind,
} from './records.ts';
import { type PropPlan, streetProps } from './street.ts';

/** A building's front, every choice its facade's rules left open now made. */
export interface FacadePlan {
  readonly ground: GroundKind;
  readonly wall: string;
  readonly trim: string;
  readonly bays: number;
  readonly window: WindowKind;
  readonly cornice: CorniceKind;
  readonly sills: boolean;
  readonly sides: 'party' | 'windows';
  readonly sign?: Paint;
  readonly awning?: Awning;
  /** 0 kept up, 1 streaked and patched, 2 upper windows boarded. */
  readonly wear: number;
  /** Which windows are lit at night: bits from the seed. */
  readonly lit: number;
}

export interface BuildingPlan {
  /** The template's id, numbered when it stands twice: `storefront`, `storefront-2`. */
  readonly id: string;
  readonly template: string;
  readonly use: Use;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  /** Its front, on the lot line. */
  readonly y1: number;
  readonly storeys: number;
  readonly storeyHeight: number;
  /** The x of the front door's middle. */
  readonly door: number;
  readonly facade: FacadePlan;
  readonly poleSign?: Paint;
}

export interface LotPlan {
  readonly x0: number;
  readonly x1: number;
  /** None on a vacant lot. */
  readonly building?: BuildingPlan;
}

/** A building of the next street, across the alley, seen from the back. */
export interface BackPlan {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly storeys: number;
  readonly storeyHeight: number;
  readonly wall: string;
  readonly trim: string;
  readonly bays: number;
  readonly lit: number;
}

/** The street's lines, north to south, and its two ends. */
export interface StreetPlan {
  readonly xa: number;
  readonly xb: number;
  /** The alley's north edge; the lots' backs are at 0. */
  readonly alley: number;
  readonly lotFront: number;
  readonly curb: number;
  readonly farCurb: number;
  readonly openFront: number;
  readonly openBack: number;
  readonly curbWidth: number;
  readonly open: OpenKind;
}

export interface BlockPlan {
  readonly seed: string;
  readonly template: string;
  readonly street: StreetPlan;
  readonly lots: readonly LotPlan[];
  readonly buildings: readonly BuildingPlan[];
  readonly backRow: readonly BackPlan[];
  readonly props: readonly PropPlan[];
}

/**
 * A number in a range, in steps of `per` of a unit, as the Rng deals in integers: a tenth for
 * metres, a hundredth for a share. (The spike drew door shares in tenths, so its 0.66 to 0.78
 * came out only as 0.7 or 0.8.)
 */
export const between = (rng: Rng, { min, max }: Range, per = 10): number =>
  rng.int(Math.round(min * per), Math.round(max * per)) / per;

/** Which template stands on each lot, west to east: `null` for a vacant one. */
function lotOrder(t: BlockTemplates, rng: Rng): (string | null)[] {
  const { block } = t;
  const count = rng.int(block.lots.min, block.lots.max);
  const fills = Object.entries(block.fill);
  const weights = [...fills.map(([, w]) => w), block.vacant?.weight ?? 0];
  const others: (string | null)[] = [];
  for (let i = block.needs.length; i < count; i++) {
    const k = rng.weightedIndex(weights);
    others.push(k < fills.length ? (fills[k] as [string, number])[0] : null);
  }
  // A row has two ends: the first two buildings that want one get them, any more stand between.
  const ends = rng.shuffle(block.needs.filter((id) => block.ends?.includes(id)));
  const atEnds = ends.slice(0, 2);
  const middle = rng.shuffle([...block.needs.filter((id) => !atEnds.includes(id)), ...others]);
  const [first, second] = atEnds;
  if (first === undefined) return middle;
  if (second === undefined) return rng.chance(1, 2) ? [first, ...middle] : [...middle, first];
  return [first, ...middle, second];
}

function facadeOf(rng: Rng, b: BuildingRecord, f: FacadeRecord): FacadePlan {
  const awning = f.awnings && f.awnings.length > 0 ? rng.pick(f.awnings) : undefined;
  return {
    ground: f.ground,
    wall: rng.pick(b.walls),
    trim: b.trim,
    bays: rng.int(f.bays.min, f.bays.max),
    window: rng.pick(f.windows),
    cornice: rng.pick(f.cornices),
    sills: f.sills,
    sides: f.sides,
    ...(f.sign ? { sign: f.sign } : {}),
    ...(awning ? { awning } : {}),
    wear: rng.int(f.wear.min, f.wear.max),
    lit: rng.int(0, 0x7fffffff),
  };
}

function buildingOf(t: BlockTemplates, rng: Rng, template: string, id: string, x0: number): BuildingPlan {
  const b = t.buildings.get(template) as BuildingRecord;
  const width = between(rng, b.width);
  const front = t.street.lotDepth;
  return {
    id,
    template,
    use: b.use,
    x0,
    y0: front - b.depth,
    x1: x0 + width,
    y1: front,
    storeys: rng.int(b.storeys.min, b.storeys.max),
    storeyHeight: b.storeyHeight,
    door: x0 + width * between(rng, b.door, 100),
    facade: facadeOf(rng.fork('facade'), b, t.facades.get(b.facade) as FacadeRecord),
    ...(b.poleSign ? { poleSign: b.poleSign } : {}),
  };
}

function lotsOf(t: BlockTemplates, rng: Rng): LotPlan[] {
  const seen = new Map<string, number>();
  const lots: LotPlan[] = [];
  let x = 0;
  lotOrder(t, rng.fork('order')).forEach((template, i) => {
    if (template === null) {
      const width = between(rng.fork(`vacant-${i}`), (t.block.vacant as { width: Range }).width);
      lots.push({ x0: x, x1: x + width });
      x += width + between(rng, t.block.gap);
      return;
    }
    const n = (seen.get(template) ?? 0) + 1;
    seen.set(template, n);
    const building = buildingOf(t, rng.fork(`lot-${i}`), template, n === 1 ? template : `${template}-${n}`, x);
    lots.push({ x0: x, x1: building.x1, building });
    x = building.x1 + between(rng, t.block.gap);
  });
  return lots;
}

function backRowOf(t: BlockTemplates, rng: Rng, street: StreetPlan): BackPlan[] {
  const r = t.block.backRow;
  const row: BackPlan[] = [];
  const y1 = street.alley;
  for (let x = street.xa + between(rng, { min: 0, max: 3 }); x < street.xb; ) {
    const width = between(rng, r.width);
    row.push({
      x0: x,
      y0: y1 - r.depth,
      x1: x + width,
      y1,
      storeys: rng.int(r.storeys.min, r.storeys.max),
      storeyHeight: r.storeyHeight,
      wall: rng.pick(r.walls),
      trim: r.trim,
      bays: Math.max(2, Math.round(width / 2.6)),
      lit: rng.int(0, 0x7fffffff),
    });
    x += width + between(rng, r.gap);
  }
  return row;
}

function streetOf(t: BlockTemplates, rng: Rng, lots: readonly LotPlan[]): StreetPlan {
  const s = t.street;
  const last = lots[lots.length - 1] as LotPlan;
  const curb = s.lotDepth + s.sidewalk;
  const farCurb = curb + s.curb * 2 + s.roadway;
  return {
    xa: -s.run,
    xb: last.x1 + s.run,
    alley: -s.alley,
    lotFront: s.lotDepth,
    curb,
    farCurb,
    openFront: farCurb + s.open.sidewalk,
    openBack: farCurb + s.open.sidewalk + s.open.depth,
    curbWidth: s.curb,
    open: rng.pick(s.open.kinds),
  };
}

/** The block for a seed: the same seed, the same block. */
export function planBlock(t: BlockTemplates, seed: string): BlockPlan {
  const rng = Rng.create(`block:${t.id}:${seed}`);
  const lots = lotsOf(t, rng.fork('lots'));
  const street = streetOf(t, rng.fork('street'), lots);
  const buildings = lots.flatMap((lot) => (lot.building ? [lot.building] : []));
  return {
    seed,
    template: t.id,
    street,
    lots,
    buildings,
    backRow: backRowOf(t, rng.fork('back-row'), street),
    props: streetProps(t.street, street, buildings, rng.fork('props')),
  };
}
