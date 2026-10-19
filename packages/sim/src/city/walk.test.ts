import { contentStore } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { planBlock } from './block.ts';
import { blockTemplates } from './records.ts';
import { CELL, cellAt, GROUND_COST, groundAt, walkGrid } from './walk.ts';

const plan = planBlock(blockTemplates(contentStore(), 'slice'), 'walk');
const grid = walkGrid(plan);
const costAt = (x: number, y: number) => grid.cost[cellAt(grid, x, y)];

describe('the walk grid', () => {
  it('lays the ground in bands across the street, north to south', () => {
    const s = plan.street;
    expect([-1, 1, s.lotFront + 1, s.curb + 1, s.farCurb + 1, s.openBack - 1].map((y) => groundAt(s, y))).toEqual([
      'alley',
      'lot',
      'sidewalk',
      'roadway',
      'sidewalk',
      s.open,
    ]);
    expect(costAt(s.xa + 1, s.curb + 2)).toBe(GROUND_COST.roadway);
  });

  it('has no step inside a building, and an open one on the sidewalk at its front', () => {
    for (const b of plan.buildings) {
      expect(costAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).toBe(Number.POSITIVE_INFINITY);
      expect(costAt(b.door, b.y1 + CELL / 2)).toBe(GROUND_COST.sidewalk);
    }
  });

  it('has no step on a lamp, a hydrant or a sign post', () => {
    const posts = plan.props.filter((p) => p.kind === 'lamp' || p.kind === 'hydrant' || p.kind === 'pole-sign');
    expect(posts.length).toBeGreaterThan(5);
    for (const p of posts) expect(costAt(p.x, p.y)).toBe(Number.POSITIVE_INFINITY);
  });

  it('covers the street from end to end and from the alley to the open side', () => {
    expect(grid.width * CELL).toBeGreaterThanOrEqual(plan.street.xb - plan.street.xa);
    expect(grid.height * CELL).toBeGreaterThanOrEqual(plan.street.openBack - plan.street.alley);
    expect(cellAt(grid, plan.street.xa - 1, 0)).toBe(-1);
  });
});
