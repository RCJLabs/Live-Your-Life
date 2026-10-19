/**
 * M1.1's generated block on the page (`?block=generated`, D33): the sim's plan from the seed and
 * packages/content, turned into what the stage draws. The plan decides; this only paints it:
 * ground patches and marks from the street's lines, buildings and props as the stage's pieces.
 * Nobody stands in it yet: the six people are the spike's.
 */
import { contentStore } from '@lyl/content';
import {
  type BlockPlan,
  type BuildingPlan,
  blockTemplates,
  type PropPlan,
  planBlock,
  type WalkGrid,
  walkGrid,
} from '@lyl/sim';
import {
  BUILDING,
  type Building,
  type Curb,
  GROUND,
  type Ground,
  type Mark,
  type Patch,
  type Prop,
  type Scene,
} from '@lyl/stage';
import type { Block } from '../spike/block.ts';

const TEMPLATES = blockTemplates(contentStore(), 'slice');

function buildingOf(b: BuildingPlan): Building {
  const f = b.facade;
  return {
    id: b.id,
    kind: b.template,
    x0: b.x0,
    y0: b.y0,
    x1: b.x1,
    y1: b.y1,
    storeys: b.storeys,
    storeyHeight: b.storeyHeight,
    door: b.door - b.x0,
    facade: {
      wall: f.wall,
      trim: f.trim,
      roof: BUILDING.roof,
      bays: f.bays,
      ground: f.ground,
      litBits: f.lit,
      window: f.window,
      cornice: f.cornice,
      sills: f.sills,
      sides: f.sides,
      wear: f.wear,
      ...(f.sign ? { sign: { text: f.sign.text, color: f.sign.colour, ink: f.sign.ink } } : {}),
      ...(f.awning ? { awning: { color: f.awning.colour, stripe: f.awning.stripe } } : {}),
    },
  };
}

function backRowOf(plan: BlockPlan): Building[] {
  return plan.backRow.map((b, i) => ({
    id: `back-${i}`,
    kind: 'back',
    x0: b.x0,
    y0: b.y0,
    x1: b.x1,
    y1: b.y1,
    storeys: b.storeys,
    storeyHeight: b.storeyHeight,
    facade: { wall: b.wall, trim: b.trim, roof: BUILDING.roof, bays: b.bays, ground: 'back', litBits: b.lit },
  }));
}

const propOf = (p: PropPlan): Prop => ({
  id: p.id,
  kind: p.kind,
  x: p.x,
  y: p.y,
  facing: p.facing,
  ...(p.size !== undefined ? { size: p.size } : {}),
  ...(p.sign ? { sign: { text: p.sign.text, color: p.sign.colour, ink: p.sign.ink } } : {}),
});

/** Lane lines, sidewalk joints, and a car park's bays when the open side is one. */
function marksOf(plan: BlockPlan): Mark[] {
  const s = plan.street;
  const marks: Mark[] = [];
  const mid = (s.curb + s.farCurb) / 2;
  marks.push({ x0: s.xa, y0: mid, x1: s.xb, y1: mid, width: 0.14, color: GROUND.laneYellow, dash: [3, 3] });
  for (const y of [s.curb + 0.35, s.farCurb - 0.35])
    marks.push({ x0: s.xa, y0: y, x1: s.xb, y1: y, width: 0.1, color: GROUND.laneWhite });
  for (let x = Math.ceil(s.xa / 1.5) * 1.5; x < s.xb; x += 1.5) {
    marks.push({ x0: x, y0: s.lotFront + 0.05, x1: x, y1: s.curb - 0.05, width: 0.03, color: GROUND.joint });
    marks.push({ x0: x, y0: s.farCurb + 0.05, x1: x, y1: s.openFront - 0.05, width: 0.03, color: GROUND.joint });
  }
  if (s.open === 'car-park') {
    for (let x = Math.ceil(s.xa / 2.6) * 2.6; x < s.xb; x += 2.6) {
      marks.push({ x0: x, y0: s.openFront + 0.4, x1: x, y1: s.openBack - 0.4, width: 0.1, color: GROUND.laneWhite });
    }
  }
  return marks;
}

function groundOf(plan: BlockPlan): Ground {
  const s = plan.street;
  const { xa, xb } = s;
  const patches: Patch[] = [
    { x0: xa, y0: s.alley - 6, x1: xb, y1: s.alley, color: GROUND.grass },
    { x0: xa, y0: s.alley, x1: xb, y1: 0, color: GROUND.alley },
    { x0: xa, y0: 0, x1: xb, y1: s.lotFront, color: GROUND.gravel },
    { x0: xa, y0: s.lotFront, x1: xb, y1: s.curb, color: GROUND.sidewalk },
    { x0: xa, y0: s.curb, x1: xb, y1: s.farCurb, color: GROUND.asphalt },
    { x0: xa, y0: s.farCurb, x1: xb, y1: s.openFront, color: GROUND.sidewalk },
    { x0: xa, y0: s.openFront, x1: xb, y1: s.openBack, color: s.open === 'verge' ? GROUND.grass : GROUND.asphalt },
  ];
  // Yards behind the buildings are dirt; vacant lots and gangways stay gravel.
  for (const b of plan.buildings) patches.push({ x0: b.x0, y0: 0.6, x1: b.x1, y1: b.y0 - 0.4, color: GROUND.dirt });
  const curbs: Curb[] = [
    { x0: xa, y0: s.curb - 0.05, x1: xb, y1: s.curb + s.curbWidth, height: 0.14, color: GROUND.curb },
    { x0: xa, y0: s.farCurb - s.curbWidth, x1: xb, y1: s.farCurb + 0.05, height: 0.14, color: GROUND.curb },
  ];
  return { patches, marks: marksOf(plan), curbs };
}

function needed(buildings: readonly Building[], template: string): Building {
  const found = buildings.find((b) => b.kind === template);
  if (!found) throw new Error(`the generated block has no ${template}, which block/slice needs`);
  return found;
}

export interface GeneratedBlock extends Block {
  readonly plan: BlockPlan;
  readonly grid: WalkGrid;
}

/** The generated block for a seed, shaped as the spike's page expects a block to be. */
export function generatedBlock(seed: string): GeneratedBlock {
  const plan = planBlock(TEMPLATES, seed);
  const fronts = plan.buildings.map(buildingOf);
  const s = plan.street;
  const scene: Scene = {
    ground: groundOf(plan),
    buildings: [...backRowOf(plan), ...fronts],
    props: plan.props.map(propOf),
    bounds: { x0: s.xa + 4, y0: 2, x1: s.xb - 4, y1: s.openFront + 1.5 },
  };
  return {
    scene,
    people: [],
    byKind: {
      diner: needed(fronts, 'diner'),
      apartment: needed(fronts, 'apartment'),
      storefront: needed(fronts, 'corner-shop'),
    },
    curb: s.curb,
    plan,
    grid: walkGrid(plan),
  };
}
