/**
 * The rules every face of the city keeps (M2.1's third gate): M1.1's for its buildings and fronts,
 * the city's lots kept as the city fixed them, M1.2's for each interior, and every door joined to
 * the sidewalk. Shared by the tests, which sample faces, and tools/city, which walks them all.
 */
import type { BlockPlan } from './block.ts';
import type { CityPlan } from './city.ts';
import type { CityTemplates, Side } from './face.ts';
import { interiorProblems } from './interiorCheck.ts';
import type { BuildingRecord, FacadeRecord, FrontageTemplates } from './records.ts';
import { frameOf } from './rooms.ts';
import { cellAt, doorStep, reach, walkGrid } from './walk.ts';

const EPS = 1e-9;

function buildingProblems(t: FrontageTemplates, plan: BlockPlan, say: (rule: string) => void): void {
  for (const lot of plan.lots) {
    const b = lot.building;
    if (!b) continue;
    const r = t.buildings.get(b.template) as BuildingRecord | undefined;
    const f = r && (t.facades.get(r.facade) as FacadeRecord | undefined);
    if (!r || !f) {
      say(`${b.id} has no template`);
      continue;
    }
    const width = b.x1 - b.x0;
    if (width < r.width.min - EPS || width > r.width.max + EPS) say(`${b.id} width`);
    if (b.x0 < lot.x0 - EPS || b.x1 > lot.x1 + EPS) say(`${b.id} off its lot`);
    if (b.y1 !== plan.street.lotFront || Math.abs(b.y0 - (b.y1 - r.depth)) > EPS) say(`${b.id} off its lot line`);
    if (b.storeys < r.storeys.min || b.storeys > r.storeys.max) say(`${b.id} storeys`);
    const share = (b.door - b.x0) / width;
    if (share < r.door.min - 0.01 || share > r.door.max + 0.01) say(`${b.id} door`);
    const p = b.facade;
    if (p.bays < f.bays.min || p.bays > f.bays.max || p.wear < f.wear.min || p.wear > f.wear.max)
      say(`${b.id} facade range`);
    if (!f.windows.includes(p.window) || !f.cornices.includes(p.cornice) || !r.walls.includes(p.wall))
      say(`${b.id} facade pick`);
    if (b.interior) for (const q of interiorProblems(b.interior, frameOf(b))) say(`${b.id}: ${q}`);
  }
  const built = plan.buildings;
  built.forEach((b, i) => {
    const next = built[i + 1];
    if (next && next.x0 - b.x1 < t.frontage.gap.min - EPS) say(`gap after ${b.id}`);
  });
}

/** The city's lots on this face, each kept: as many, as wide, end to end along the block. */
function lotProblems(city: CityPlan, block: number, side: Side, plan: BlockPlan, say: (rule: string) => void) {
  const { lots, blocks } = city;
  const end = block + 1 < blocks.count ? (blocks.firstLot[block + 1] as number) : lots.count;
  const widths: number[] = [];
  for (let l = blocks.firstLot[block] as number; l < end; l++)
    if (lots.side[l] === side) widths.push(lots.width[l] as number);
  const mine = plan.lots.map((l) => l.x1 - l.x0);
  if (side === 0) mine.reverse();
  if (mine.length !== widths.length || mine.some((w, i) => Math.abs(w - (widths[i] as number)) > EPS))
    say("lots not the city's");
}

/** Each door the walk grid can't reach from the sidewalk's west end. */
function cutOff(plan: BlockPlan, say: (rule: string) => void): void {
  const grid = walkGrid(plan);
  const seen = reach(grid, cellAt(grid, plan.street.xa + 0.75, plan.street.lotFront + 1.25));
  for (const b of plan.buildings) {
    const step = doorStep(b);
    if (seen[cellAt(grid, step.x, step.y)] !== 1) say(`${b.id}'s door cut off`);
  }
}

/** Every rule a face breaks, each naming the face. */
export function faceProblems(ct: CityTemplates, city: CityPlan, block: number, side: Side, plan: BlockPlan): string[] {
  const t = ct.districts[city.blocks.district[block] as number]?.frontage as FrontageTemplates;
  const out: string[] = [];
  const say = (rule: string) => out.push(`${plan.seed}: ${rule}`);
  buildingProblems(t, plan, say);
  lotProblems(city, block, side, plan, say);
  cutOff(plan, say);
  return out;
}
