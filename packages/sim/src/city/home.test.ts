import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { planBlock } from './block.ts';
import { planCity } from './city.ts';
import { cityTemplates } from './face.ts';
import { aroundHome, faceRect, homeOf } from './home.ts';
import { route } from './path.ts';
import { blockTemplates } from './records.ts';
import { cellAt, doorStep, walkGrid, walkGridAround } from './walk.ts';

const store = sliceSim().content;
const slice = blockTemplates(store, 'slice');
const SEEDS = Array.from({ length: 20 }, (_, i) => `block-${i * 7919}`);
const overlaps = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) =>
  a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.y0 < b.y1 - 1e-9 && b.y0 < a.y1 - 1e-9;

describe('your block in the city (D67)', () => {
  it('stands on the south face of an inner-ring block long enough to hold it, its fronts on the lot line', () => {
    for (const seed of SEEDS) {
      const plan = planBlock(slice, seed);
      const city = planCity(store, seed);
      const h = homeOf(city, 'inner-ring', plan);
      expect(city.districts[city.blocks.district[h.block] as number]).toBe('inner-ring');
      const x = city.blocks.x[h.block] as number;
      const front = (city.blocks.y[h.block] as number) + (city.blocks.d[h.block] as number);
      for (const b of plan.buildings) {
        expect(b.y1 + h.oy).toBeCloseTo(front, 9);
        expect(b.x0 + h.ox).toBeGreaterThanOrEqual(x - 1e-9);
        expect(b.x1 + h.ox).toBeLessThanOrEqual(x + (city.blocks.w[h.block] as number) + 1e-9);
      }
    }
  });

  it('shares no ground with the buildings round it', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const plan = planBlock(slice, seed);
      const city = planCity(store, seed);
      const h = homeOf(city, 'inner-ring', plan);
      const { faces } = aroundHome(cityTemplates(store, city), city, h, plan, 60);
      expect(faces.length).toBeGreaterThan(0);
      const theirs = faces.flatMap((f) => f.plan.buildings.map((b) => faceRect(city, h, f, b)));
      for (const mine of plan.buildings) for (const r of theirs) expect(overlaps(mine, r), seed).toBe(false);
    }
  });

  it('keeps the walk from your door the same on the wider grid, and reaches the doors across the street', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const plan = planBlock(slice, seed);
      const city = planCity(store, seed);
      const h = homeOf(city, 'inner-ring', plan);
      const { around, faces } = aroundHome(cityTemplates(store, city), city, h, plan, 60);
      const old = walkGrid(plan);
      const wide = walkGridAround(plan, around);
      const [one, two] = [plan.buildings[0], plan.buildings[plan.buildings.length - 1]];
      if (!one || !two) continue;
      const leg = (g: typeof old) =>
        route(g, cellAt(g, doorStep(one).x, doorStep(one).y), cellAt(g, doorStep(two).x, doorStep(two).y));
      expect(leg(wide)?.cost).toBeCloseTo(leg(old)?.cost as number, 9);
      // A door of a face across the street, reached from yours.
      const across = faces.find((f) => f.block !== h.block && f.side === 0 && f.plan.buildings.length > 0);
      const theirs = across?.plan.buildings[0];
      if (!across || !theirs) continue;
      const r = faceRect(city, h, across, { x0: theirs.door, y0: theirs.y1, x1: theirs.door, y1: theirs.y1 });
      // A north face's front is its rectangle's north edge in the city: the step out is just north of it.
      const goal = cellAt(wide, r.x0, r.y0 - 0.25);
      expect(goal, seed).toBeGreaterThanOrEqual(0);
      expect(route(wide, cellAt(wide, doorStep(one).x, doorStep(one).y), goal), seed).not.toBeNull();
    }
  });
});
