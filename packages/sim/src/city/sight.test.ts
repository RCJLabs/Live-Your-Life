import { contentStore } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { planBlock } from './block.ts';
import { blockTemplates } from './records.ts';
import { roomAt } from './rooms.ts';
import { clear, inField, opaqueOf, type ShopSight, shopSight, type Watcher } from './sight.ts';
import { cellAt, centreOf, reach, type WalkGrid, walkGrid } from './walk.ts';

const templates = blockTemplates(contentStore(), 'slice');
const SEEDS = Array.from({ length: 1000 }, (_, i) => `sight-${i}`);

/**
 * The reference: the same line worked out in floating point, each step's position rounded with
 * Math.round, and the field by the angle's size against a quarter turn's half.
 */
function seesByReference(grid: WalkGrid, opaque: Uint8Array, w: Watcher, cell: number): boolean {
  const [c0, r0] = [w.cell % grid.width, Math.floor(w.cell / grid.width)];
  const [dc, dr] = [(cell % grid.width) - c0, Math.floor(cell / grid.width) - r0];
  if (Math.hypot(dc, dr) > Math.sqrt(w.reach2) + 1e-9) return false;
  if (w.field === 'ahead' && (dc !== 0 || dr !== 0)) {
    const [fx, fy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[w.facing] as [number, number];
    const cos = (dc * fx + dr * fy) / Math.hypot(dc, dr);
    if (cos < Math.SQRT1_2 - 1e-9) return false;
  }
  const n = Math.max(Math.abs(dc), Math.abs(dr));
  for (let i = 1; i < n; i++) {
    const c = c0 + Math.round((i * dc) / n);
    const r = r0 + Math.round((i * dr) / n);
    if (opaque[r * grid.width + c]) return false;
  }
  return true;
}

function eachShop(fn: (sight: ShopSight, grid: WalkGrid, seed: string, plan: ReturnType<typeof planBlock>) => void) {
  for (const seed of SEEDS) {
    const plan = planBlock(templates, seed);
    const grid = walkGrid(plan);
    const sight = shopSight(templates, plan, grid);
    if (!sight) throw new Error(`${seed}: no shop`);
    fn(sight, grid, seed, plan);
  }
}

describe('sight in the corner shop (D45)', () => {
  it('matches the reference for every watcher and every cell of the shop, in 1,000 shops', { timeout: 120_000 }, () => {
    let compared = 0;
    eachShop((sight, grid, seed, plan) => {
      const opaque = opaqueOf(templates, plan, grid) as Uint8Array;
      const b = plan.buildings.find((x) => x.id === sight.building);
      if (!b) throw new Error(seed);
      for (let y = b.y0 + 0.25; y < b.y1; y += 0.5)
        for (let x = b.x0 + 0.25; x < b.x1; x += 0.5) {
          const cell = cellAt(grid, x, y);
          for (const w of sight.watchers) {
            const ours = inField(grid, w, cell) && clear(grid, opaque, w.cell, cell);
            if (ours !== seesByReference(grid, opaque, w, cell)) throw new Error(`${seed}: ${w.id} at cell ${cell}`);
            compared++;
          }
        }
      for (const spot of sight.spots)
        for (const w of sight.watchers)
          expect(spot.seenBy.includes(w.id), `${seed} ${spot.id}`).toBe(seesByReference(grid, opaque, w, spot.cell));
    });
    expect(compared).toBeGreaterThan(500_000);
  });

  it('has a clerk and a camera, every shelf reachable from the street, and some seen and some not', {
    timeout: 60_000,
  }, () => {
    eachShop((sight, grid, seed, plan) => {
      expect(sight.watchers.map((w) => w.who).sort(), seed).toEqual(['camera', 'clerk']);
      const walked = reach(grid, cellAt(grid, plan.street.xa + 0.75, plan.street.lotFront + 1.25));
      expect(sight.spots.length).toBe(9);
      const b = plan.buildings.find((x) => x.id === sight.building);
      for (const spot of sight.spots) {
        expect(walked[spot.cell], `${seed} ${spot.id}`).toBe(1);
        const c = centreOf(grid, spot.cell);
        expect(roomAt(b?.interior?.rooms ?? [], c.x, c.y)?.id).toBe('floor');
      }
      expect(
        sight.spots.some((s) => s.seenBy.length === 0),
        seed,
      ).toBe(true);
      expect(
        sight.spots.some((s) => s.seenBy.length > 0),
        seed,
      ).toBe(true);
    });
  });

  it('sees within its range only, and a camera only a quarter turn either side of the way it faces', () => {
    const grid = walkGrid(planBlock(templates, 'sight-0'));
    const at = 20 * grid.width + 20;
    const w = { id: 'w', cell: at, who: 'camera', field: 'ahead', facing: 's', reach2: 16 } as const;
    const cell = (dc: number, dr: number) => at + dr * grid.width + dc;
    expect([inField(grid, w, cell(0, 4)), inField(grid, w, cell(0, 5)), inField(grid, w, cell(3, 3))]).toEqual([
      true,
      false,
      false,
    ]);
    expect([inField(grid, w, cell(2, 2)), inField(grid, w, cell(3, 2)), inField(grid, w, cell(0, -1))]).toEqual([
      true,
      false,
      false,
    ]);
    const round = { ...w, field: 'around' } as const;
    expect([inField(grid, round, cell(0, -4)), inField(grid, round, cell(-4, 0))]).toEqual([true, true]);
  });

  it('is blocked by a wall or shelves, not by a counter', () => {
    const plan = planBlock(templates, 'sight-0');
    const grid = walkGrid(plan);
    const opaque = opaqueOf(templates, plan, grid) as Uint8Array;
    const b = plan.buildings.find((x) => x.interior?.template === 'corner-shop');
    const at = (id: string) => b?.interior?.fixtures.find((f) => f.id.endsWith(id));
    const till = at('till');
    const shelf = at('shop-shelves-4');
    if (!till || !shelf) throw new Error('no till or shelf');
    expect(opaque[cellAt(grid, till.x, till.y)]).toBe(0);
    expect(opaque[cellAt(grid, shelf.x, shelf.y)]).toBe(1);
    expect(opaque[cellAt(grid, b?.x0 ?? 0, (b?.y0 ?? 0) + 3)]).toBe(1);
  });
});
