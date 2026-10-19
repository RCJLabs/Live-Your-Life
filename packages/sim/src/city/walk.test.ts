import { contentStore } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { planBlock } from './block.ts';
import { blockTemplates } from './records.ts';
import { WALL } from './rooms.ts';
import { CELL, cellAt, GROUND_COST, groundAt, useCell, type WalkGrid, walkGrid } from './walk.ts';

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

  it('has no step inside a shut building, and an open one on the sidewalk at every front door', () => {
    for (const b of plan.buildings) {
      if (!b.interior) expect(costAt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).toBe(Number.POSITIVE_INFINITY);
      expect(costAt(b.door, b.y1 + CELL / 2)).toBe(GROUND_COST.sidewalk);
    }
  });

  it('opens a floor inside a building with an interior, its walls no step but at their doors', () => {
    const open = plan.buildings.filter((b) => b.interior);
    expect(open.map((b) => b.template).sort()).toEqual(['apartment', 'corner-shop', 'diner']);
    for (const b of open) {
      expect(costAt(b.door, b.y1 - WALL / 2)).toBe(GROUND_COST.floor);
      expect(costAt(b.door, b.y1 - 0.6)).toBe(GROUND_COST.floor);
      expect(costAt(b.door - 2, b.y1 - WALL / 2)).toBe(Number.POSITIVE_INFINITY);
      expect(costAt(b.x0 + WALL / 2, (b.y0 + b.y1) / 2)).toBe(Number.POSITIVE_INFINITY);
      for (const d of b.interior?.doors ?? []) expect(costAt(d.x, d.y)).toBe(GROUND_COST.floor);
      for (const w of b.interior?.walls ?? []) {
        if (Math.max(w.x1 - w.x0, w.y1 - w.y0) < 1) continue;
        expect(costAt((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2)).toBe(Number.POSITIVE_INFINITY);
      }
      for (const f of b.interior?.fixtures ?? []) if (f.blocks) expect(costAt(f.x, f.y)).toBe(Number.POSITIVE_INFINITY);
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

  it('ends a walk to a fixture only on the side it is used from, or nowhere', () => {
    // A 3 × 3 grid of 0.5 m cells, the floor of one room; a seat in the middle, used from its north.
    const small: WalkGrid = { x0: 0, y0: 0, width: 3, height: 3, cost: new Float64Array(9).fill(1), minCost: 1 };
    const room = {
      id: 'r',
      template: 'r',
      floor: 'wood' as const,
      wall: '#fff',
      mirror: false,
      x0: 0,
      y0: 0,
      x1: 1.5,
      y1: 1.5,
    };
    const inside = { template: 't', rooms: [{ ...room, inner: room }], walls: [], doors: [], fixtures: [], units: [] };
    const seat = {
      id: 's',
      template: 's',
      draw: 'chair' as const,
      room: 'r',
      x: 0.75,
      y: 0.75,
      w: 0.4,
      d: 0.4,
      facing: 'n' as const,
      blocks: true,
      use: { x: 0.75, y: 0.2, from: 'n' as const, serves: ['eat' as const], pose: 'eat' as const },
    };
    small.cost[4] = Number.POSITIVE_INFINITY;
    expect(useCell(small, inside, seat)).toBe(1);
    // Wall off the north row: the seat's south side is open, but it isn't used from there.
    for (const c of [0, 1, 2]) small.cost[c] = Number.POSITIVE_INFINITY;
    expect(useCell(small, inside, seat)).toBe(-1);
  });
});
