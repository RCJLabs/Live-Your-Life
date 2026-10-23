import { contentStore } from '@lyl/content';
import { cellAt, centreOf, route, walkGrid } from '@lyl/sim';
import type { Actor } from '@lyl/stage';
import { describe, expect, it } from 'vitest';
import { placesOf } from '../life/places.ts';
import { townScene } from './town.ts';
import { cutFor } from './walker.ts';

const SEEDS = Array.from({ length: 12 }, (_, i) => `block-${i * 977}`);

describe('your block in the town (M2.1, D67)', () => {
  it('puts every place on the cell you stand in to use it, on the town’s wider grid', () => {
    for (const seed of SEEDS) {
      const town = townScene(seed);
      const places = placesOf(contentStore(), town.plan, town.grid, seed);
      for (const p of places.all) {
        expect(p.cell, `${seed} ${p.id}`).toBe(cellAt(town.grid, p.stand.x, p.stand.y));
        const c = centreOf(town.grid, p.cell);
        expect(Math.abs(c.x - p.stand.x) + Math.abs(c.y - p.stand.y), `${seed} ${p.id}`).toBeLessThan(0.5);
      }
    }
  });

  it('walks you from your bed to every place exactly as the block alone did', () => {
    for (const seed of SEEDS) {
      const town = townScene(seed);
      const own = walkGrid(town.plan);
      const wide = placesOf(contentStore(), town.plan, town.grid, seed);
      const alone = placesOf(contentStore(), town.plan, own, seed);
      for (const p of wide.all) {
        const q = alone.all.find((x) => x.id === p.id);
        const there = route(town.grid, wide.bed.cell, p.cell);
        const before = q ? route(own, alone.bed.cell, q.cell) : null;
        if (!before) continue;
        // Your block's ground is as it was, cell for cell, so every walk on it costs what it did.
        expect(there?.cost, `${seed} ${p.id}`).toBeCloseTo(before.cost, 6);
      }
    }
  });

  it('draws the blocks round yours, and keeps your own buildings as the block planned them', () => {
    const town = townScene('block-1');
    for (const b of town.plan.buildings) expect(town.scene.buildings.some((d) => d.id === b.id)).toBe(true);
    expect(town.scene.buildings.length).toBeGreaterThan(town.plan.buildings.length + 10);
  });

  it('cuts what stands between the camera and you to its sills, and leaves the rest whole (D64)', () => {
    const town = townScene('block-1');
    const mine = new Set(town.plan.buildings.map((b) => b.id));
    // A tall building of the block across the street, and you just behind it on its north side.
    const across = town.scene.buildings
      .filter((b) => !mine.has(b.id) && b.y0 > town.plan.street.farCurb)
      .sort((a, b) => b.storeys - a.storeys)[0];
    expect(across).toBeDefined();
    if (!across) return;
    const you = { x: (across.x0 + across.x1) / 2, y: across.y0 - 1, look: { height: 1.75 } } as unknown as Actor;
    const cut = cutFor(town.plan, town.scene.buildings, you, false);
    expect(cut.has(across.id)).toBe(true);
    expect(across.interior).toBeUndefined();
    // On your own sidewalk, nothing across the street hides you.
    const home = { x: you.x, y: town.plan.street.lotFront + 1, look: { height: 1.75 } } as unknown as Actor;
    expect(cutFor(town.plan, town.scene.buildings, home, false).has(across.id)).toBe(false);
  });
});
