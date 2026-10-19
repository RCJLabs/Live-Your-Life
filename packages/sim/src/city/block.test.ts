import { createRecordStore } from '@eb/core';
import { contentStore, PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { type BlockPlan, planBlock } from './block.ts';
import { blockTemplates } from './records.ts';
import { DOORWAY, FOOTPRINT } from './street.ts';
import { cellAt, doorStep, reach, walkGrid } from './walk.ts';

const templates = blockTemplates(contentStore(), 'slice');
const SEEDS = Array.from({ length: 1000 }, (_, i) => `block-${i}`);

/** Each failed rule for one block, so a sweep's failures name the seed and the rule. */
function broken(plan: BlockPlan): string[] {
  const { block, street } = templates;
  const out: string[] = [];
  const say = (rule: string) => out.push(`${plan.seed}: ${rule}`);
  if (plan.lots.length < block.lots.min || plan.lots.length > block.lots.max) say('lot count');
  for (const need of block.needs) {
    if (plan.buildings.filter((b) => b.template === need).length !== 1) say(`${need} not there once`);
  }
  for (const end of block.ends ?? []) {
    const at = plan.lots.findIndex((l) => l.building?.template === end);
    if (at !== 0 && at !== plan.lots.length - 1) say(`${end} not at an end`);
  }
  plan.lots.forEach((lot, i) => {
    const next = plan.lots[i + 1];
    if (next && (next.x0 - lot.x1 < block.gap.min - 1e-9 || next.x0 - lot.x1 > block.gap.max + 1e-9)) say(`gap ${i}`);
  });
  for (const b of plan.buildings) {
    const t = templates.buildings.get(b.template);
    const f = t && templates.facades.get(t.facade);
    if (!t || !f) {
      say(`${b.id} has no template`);
      continue;
    }
    const width = b.x1 - b.x0;
    if (width < t.width.min - 1e-9 || width > t.width.max + 1e-9) say(`${b.id} width`);
    if (b.y1 !== street.lotDepth || b.y0 !== street.lotDepth - t.depth) say(`${b.id} off its lot line`);
    if (b.x0 <= plan.street.xa || b.x1 >= plan.street.xb) say(`${b.id} past the street's end`);
    if (b.storeys < t.storeys.min || b.storeys > t.storeys.max) say(`${b.id} storeys`);
    const share = (b.door - b.x0) / width;
    if (share < t.door.min - 0.01 || share > t.door.max + 0.01) say(`${b.id} door`);
    const p = b.facade;
    if (p.bays < f.bays.min || p.bays > f.bays.max || p.wear < f.wear.min || p.wear > f.wear.max)
      say(`${b.id} facade range`);
    if (!f.windows.includes(p.window) || !f.cornices.includes(p.cornice) || !t.walls.includes(p.wall)) {
      say(`${b.id} facade pick`);
    }
  }
  return out;
}

/** Each door the walk grid can't reach from the sidewalk's west end, and the open side if it can't. */
function cutOff(plan: BlockPlan): string[] {
  const grid = walkGrid(plan);
  const seen = reach(grid, cellAt(grid, plan.street.xa + 0.75, plan.street.lotFront + 1.25));
  const out = plan.buildings
    .filter((b) => {
      const step = doorStep(b);
      return seen[cellAt(grid, step.x, step.y)] !== 1;
    })
    .map((b) => `${plan.seed}: ${b.id}'s door cut off`);
  if (seen[cellAt(grid, plan.street.xb - 1, plan.street.openBack - 0.5)] !== 1)
    out.push(`${plan.seed}: open side cut off`);
  return out;
}

describe('the block', () => {
  it('is the same block for the same seed, and another for another', () => {
    expect(planBlock(templates, 'same')).toEqual(planBlock(templates, 'same'));
    expect(JSON.stringify(planBlock(templates, 'one'))).not.toBe(JSON.stringify(planBlock(templates, 'two')));
  });

  it("keeps every template's rules, and the slice's buildings, in 1,000 blocks", () => {
    expect(SEEDS.flatMap((seed) => broken(planBlock(templates, seed)))).toEqual([]);
  });

  it('has every door joined to the street, and the street to its open side, in 1,000 blocks', {
    timeout: 60_000,
  }, () => {
    expect(SEEDS.flatMap((seed) => cutOff(planBlock(templates, seed)))).toEqual([]);
  });

  it("keeps the near sidewalk's doorways clear of lamps, hydrants and signs", () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const plan = planBlock(templates, seed);
      for (const p of plan.props.filter((q) => q.y < plan.street.curb)) {
        for (const b of plan.buildings)
          expect(Math.abs(p.x - b.door)).toBeGreaterThanOrEqual(DOORWAY + FOOTPRINT[p.kind].w / 2);
      }
    }
  });

  it('draws on every lot count, both open sides, vacant lots and every facade kind across 1,000 blocks', () => {
    const plans = SEEDS.map((seed) => planBlock(templates, seed));
    expect(new Set(plans.map((p) => p.lots.length))).toEqual(new Set([6, 7, 8]));
    expect(new Set(plans.map((p) => p.street.open))).toEqual(new Set(['verge', 'car-park']));
    expect(plans.some((p) => p.lots.some((l) => !l.building))).toBe(true);
    const fronts = plans.flatMap((p) => p.buildings.map((b) => b.facade));
    expect(new Set(fronts.map((f) => f.cornice))).toEqual(new Set(['band', 'bracketed', 'parapet']));
    expect(new Set(fronts.map((f) => f.wear))).toEqual(new Set([0, 1, 2]));
  });
});

describe('the templates', () => {
  const tweaked = (path: (records: Record<string, Record<string, unknown>>) => void) => {
    const records = JSON.parse(JSON.stringify(PACK.records)) as Record<string, Record<string, unknown>>;
    path(records);
    return createRecordStore(records);
  };

  it('refuse a range whose min is above its max, naming it', () => {
    const store = tweaked((r) => {
      (r.building?.diner as { width: unknown }).width = { min: 12, max: 10 };
    });
    expect(() => blockTemplates(store, 'slice')).toThrow(/building\/diner width: min 12 is above max 10/);
  });

  it('refuse a block that needs more buildings than its fewest lots', () => {
    const store = tweaked((r) => {
      (r.block?.slice as { lots: unknown }).lots = { min: 2, max: 8 };
    });
    expect(() => blockTemplates(store, 'slice')).toThrow(/needs 3 buildings but may have only 2 lots/);
  });
});
