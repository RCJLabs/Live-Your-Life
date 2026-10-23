import { cellAt } from '@lyl/sim';
import type { Look } from '@lyl/stage';
import { describe, expect, it } from 'vitest';
import { passersAt } from './passers.ts';
import { townScene } from './town.ts';

const SEEDS = Array.from({ length: 6 }, (_, i) => `block-${i * 977}`);
const TOWNS = SEEDS.map((s) => townScene(s));
const day = (hour: number, minute = 0) => 24 * 60 * 3 + hour * 60 + minute;

describe('passers-by on the town’s sidewalks (M2.2, D72)', () => {
  it('shows the same people at the same minute, whatever was drawn before', () => {
    const town = TOWNS[0] as (typeof TOWNS)[0];
    const a = passersAt(town.walkways, 77, day(8, 20), 1, new Map());
    const looks = new Map<number, Look>();
    passersAt(town.walkways, 77, day(17, 5), 1, looks);
    const b = passersAt(town.walkways, 77, day(8, 20), 1, looks);
    expect(b.map((p) => [p.id, p.x, p.y, p.look])).toEqual(a.map((p) => [p.id, p.x, p.y, p.look]));
    expect(a.length).toBeGreaterThan(0);
  });

  it('keeps them on ground people walk, inside the town, stepping round what stands in the way', () => {
    let kept = 0;
    let all = 0;
    for (const town of TOWNS) {
      const b = town.scene.bounds;
      const free = (x: number, y: number) => {
        const c = cellAt(town.grid, x, y);
        return c >= 0 && (town.grid.cost[c] as number) < Infinity;
      };
      for (let m = 0; m < 24 * 60; m += 7) {
        const out = passersAt(town.walkways, 5, day(0, m), 0, new Map(), free);
        kept += out.length;
        all += passersAt(town.walkways, 5, day(0, m), 0, new Map()).length;
        for (const p of out) {
          expect(p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1, `${p.id} out of town`).toBe(true);
          const cell = cellAt(town.grid, p.x, p.y);
          expect(cell, `${p.id} off the grid`).toBeGreaterThanOrEqual(0);
          expect(town.grid.cost[cell], `${p.id} at ${p.x},${p.y}`).toBeLessThan(Infinity);
        }
      }
    }
    // Stepping aside, not vanishing: hardly anyone is left out for want of room.
    expect(kept / all).toBeGreaterThan(0.999);
  });

  it('puts more out at the morning rush than in the small hours, and moves them on', () => {
    for (const town of TOWNS) {
      const count = (h: number) =>
        Array.from({ length: 12 }, (_, k) => passersAt(town.walkways, 9, day(h, k * 5), 0, new Map()).length).reduce(
          (a, b) => a + b,
          0,
        );
      expect(count(8)).toBeGreaterThan(3 * Math.max(1, count(3)));
      const now = passersAt(town.walkways, 9, day(8, 10), 0, new Map());
      const later = passersAt(town.walkways, 9, day(8, 11), 0, new Map());
      const moved = now.filter((p) => {
        const q = later.find((x) => x.id === p.id);
        return q && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 1;
      });
      expect(moved.length).toBeGreaterThan(0);
    }
  });
});
