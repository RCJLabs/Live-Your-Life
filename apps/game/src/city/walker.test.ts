import { CELL, cellAt } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { castLooks } from '../spike/actors.ts';
import { generatedBlock } from './scene.ts';
import { cutFor, legAt, WALK_SPEED, walkerAt } from './walker.ts';

const seeds = Array.from({ length: 60 }, (_, i) => `walker-${i}`);
const look = castLooks('walker').cook;
const middle = (from: number, to: number) => (from + to) / 2;

describe('the walker', () => {
  it('has a round in every block: asleep, to the griddle, cooking, home, on open cells', () => {
    for (const seed of seeds) {
      const { commute, grid, plan } = generatedBlock(seed);
      if (!commute) throw new Error(`${seed}: no round`);
      expect(commute.legs.map((l) => l.doing)).toEqual(['walk', 'cook', 'walk', 'sleep']);
      const flat = plan.buildings.find((b) => b.id === 'apartment')?.interior?.units.find((u) => u.id === commute.unit);
      expect(flat?.rooms, `${seed}: the bed is in the walker's own flat`).toContain(commute.bed.room);
      const [out, , home] = commute.legs;
      expect(out?.path?.[0]).toEqual(commute.bed.use);
      expect(out?.path?.at(-1)).toEqual(commute.griddle.use);
      expect(home?.path?.[0]).toEqual(commute.griddle.use);
      for (const leg of [out, home]) {
        const cells = (leg?.path ?? []).slice(1, -1);
        for (const p of cells)
          expect(grid.cost[cellAt(grid, p.x, p.y)], `${seed} at ${p.x}, ${p.y}`).toBeLessThan(Infinity);
        // A step is a cell, or a cell and the move across to a doorway's middle.
        cells.slice(1).forEach((p, i) => {
          const q = cells[i] as { x: number; y: number };
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThanOrEqual(Math.SQRT2 * CELL + 0.5);
        });
      }
      expect(commute.metres).toBeGreaterThan(10);
    }
  });

  it('goes through every doorway by its middle, clear of the jambs', () => {
    for (const seed of seeds) {
      const { commute, plan } = generatedBlock(seed);
      const doors = plan.buildings.flatMap((b) => b.interior?.doors ?? []);
      for (const leg of commute?.legs ?? []) {
        for (const p of (leg.path ?? []).slice(1, -1)) {
          for (const d of doors) {
            const [along, across] = d.along === 'x' ? [p.x - d.x, p.y - d.y] : [p.y - d.y, p.x - d.x];
            if (Math.abs(across) < 0.1 && Math.abs(along) <= d.width / 2)
              expect(Math.abs(along), seed).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

  it('lives in either flat, by the seed', () => {
    expect(new Set(seeds.map((seed) => generatedBlock(seed).commute?.unit))).toEqual(new Set(['west', 'east']));
  });

  it('lies in bed, walks and cooks when its legs say, at a walking pace', () => {
    const { commute } = generatedBlock('pace');
    if (!commute) throw new Error('no round');
    const [out, cook, , sleep] = commute.legs;
    if (!sleep || !out || !cook) throw new Error('legs missing');
    expect(walkerAt(commute, look, middle(sleep.from, sleep.to))).toMatchObject({
      bed: commute.bed.id,
      bubble: 'sleep',
    });
    expect(walkerAt(commute, look, middle(cook.from, cook.to)).pose.kind).toBe('cook');
    const t = middle(out.from, out.to);
    const [a, b] = [walkerAt(commute, look, t), walkerAt(commute, look, t + 0.1)];
    expect(a.pose.kind).toBe('walk');
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(WALK_SPEED * 0.1 + 1e-9);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(WALK_SPEED * 0.1 * 0.7);
    // Round and round: a round later is the same moment.
    const later = walkerAt(commute, look, t + commute.round);
    expect(later.x).toBeCloseTo(a.x, 6);
    expect(later.y).toBeCloseTo(a.y, 6);
    expect(later.yaw).toBeCloseTo(a.yaw, 6);
    expect(legAt(commute, t + 3 * commute.round)).toBe(out);
  });

  it('cuts away the building it is in with the walls up, never one behind it, and every interior with them down', () => {
    let checkedBehind = 0;
    for (const seed of seeds) {
      const { commute, plan, scene } = generatedBlock(seed);
      if (!commute) throw new Error(`${seed}: no round`);
      const [, cook, , sleep] = commute.legs;
      const at = (leg: typeof sleep) => walkerAt(commute, look, middle(leg?.from ?? 0, leg?.to ?? 0));
      const home = plan.buildings.find((b) => b.id === 'apartment');
      const work = plan.buildings.find((b) => b.id === 'diner');
      if (!home || !work) throw new Error(`${seed}: no flat or diner`);
      const asleep = cutFor(plan, scene.buildings, at(sleep), false);
      const cooking = cutFor(plan, scene.buildings, at(cook), false);
      expect(asleep.has('apartment'), seed).toBe(true);
      expect(cooking.has('diner'), seed).toBe(true);
      // The camera looks from the south-east: a building wholly west of someone is behind them.
      if (work.x1 <= home.x0) {
        expect(asleep.has('diner'), seed).toBe(false);
        checkedBehind++;
      }
      if (home.x1 <= work.x0) {
        expect(cooking.has('apartment'), seed).toBe(false);
        checkedBehind++;
      }
      expect([...cutFor(plan, scene.buildings, at(cook), true)].sort()).toEqual(['apartment', 'corner-shop', 'diner']);
      expect(cutFor(plan, scene.buildings, undefined, false).size).toBe(0);
    }
    expect(checkedBehind).toBeGreaterThan(20);
  });

  it('is the same round for the same seed', () => {
    expect(generatedBlock('same').commute).toEqual(generatedBlock('same').commute);
  });
});
