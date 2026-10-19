import { type Building, type Fixture, WALL } from '@lyl/stage';
import { describe, expect, it } from 'vitest';
import { makeBlock } from './block.ts';
import { STREET } from './templates.ts';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed-${i}`);

const inside = (f: Fixture, b: Building) =>
  f.x - f.w / 2 >= b.x0 + WALL - 1e-9 &&
  f.x + f.w / 2 <= b.x1 - WALL + 1e-9 &&
  f.y - f.d / 2 >= b.y0 + WALL - 1e-9 &&
  f.y + f.d / 2 <= b.y1 - WALL + 1e-9;

const overlap = (a: Fixture, b: Fixture) =>
  a.x - a.w / 2 < b.x + b.w / 2 - 1e-9 &&
  b.x - b.w / 2 < a.x + a.w / 2 - 1e-9 &&
  a.y - a.d / 2 < b.y + b.d / 2 - 1e-9 &&
  b.y - b.d / 2 < a.y + a.d / 2 - 1e-9;

describe('the block, from the seed', () => {
  it('is the same block every time for a seed, and differs between seeds', () => {
    expect(makeBlock('rust-belt-1')).toEqual(makeBlock('rust-belt-1'));
    const shapes = new Set(
      SEEDS.map((s) => JSON.stringify(makeBlock(s).scene.buildings.map((b) => [b.id, b.x0, b.x1]))),
    );
    expect(shapes.size).toBeGreaterThan(30);
  });

  it('always puts the diner and the apartment house side by side, so one frame holds both', () => {
    for (const seed of SEEDS) {
      const main = makeBlock(seed).scene.buildings.filter((b) => !b.id.startsWith('back-'));
      const order = [...main].sort((a, b) => a.x0 - b.x0).map((b) => b.kind);
      expect(Math.abs(order.indexOf('diner') - order.indexOf('apartment')), `${seed}: ${order}`).toBe(1);
    }
  });

  it('furnishes each interior inside its walls, nothing on top of anything else, the doorway clear', () => {
    for (const seed of SEEDS) {
      const block = makeBlock(seed);
      for (const b of [block.byKind.diner, block.byKind.apartment]) {
        const fixtures = b.interior?.fixtures ?? [];
        expect(fixtures.length).toBeGreaterThan(5);
        for (const f of fixtures) expect(inside(f, b), `${seed}: ${f.id} inside ${b.id}`).toBe(true);
        const solid = fixtures.filter((f) => f.kind !== 'rug');
        for (let i = 0; i < solid.length; i++) {
          for (let j = i + 1; j < solid.length; j++) {
            expect(
              overlap(solid[i] as Fixture, solid[j] as Fixture),
              `${seed}: ${solid[i]?.id} and ${solid[j]?.id}`,
            ).toBe(false);
          }
        }
        // A metre in from the door is kept clear.
        const door = b.x0 + (b.interior?.door ?? 0);
        const doorway: Fixture = { id: 'doorway', kind: 'rug', x: door, y: b.y1 - WALL - 0.5, w: 1, d: 1, facing: 's' };
        for (const f of solid) expect(overlap(f, doorway), `${seed}: ${f.id} in the doorway of ${b.id}`).toBe(false);
      }
    }
  });

  it('puts each of the six where their role is', () => {
    for (const seed of SEEDS) {
      const block = makeBlock(seed);
      const at = Object.fromEntries(block.people.map((p) => [p.role, p]));
      expect(Object.keys(at).sort()).toEqual(['answerer', 'arguer', 'cook', 'sitter', 'sleeper', 'walker']);
      const { diner, apartment } = block.byKind;
      const griddle = diner.interior?.fixtures.find((f) => f.id === 'griddle') as Fixture;
      // The cook is in the diner, behind the griddle, between it and the back wall.
      expect(at.cook?.x).toBeCloseTo(griddle.x, 9);
      expect(at.cook?.y).toBeLessThan(griddle.y - griddle.d / 2);
      expect(at.cook?.y).toBeGreaterThan(diner.y0 + WALL);
      expect(apartment.interior?.fixtures.some((f) => f.id === at.sleeper?.bed && f.kind === 'bed')).toBe(true);
      // The two arguing face each other, on the sidewalk.
      for (const role of ['arguer', 'answerer']) {
        expect(at[role]?.y).toBeGreaterThan(STREET.lotDepth);
        expect(at[role]?.y).toBeLessThan(block.curb);
      }
      expect(Math.abs((at.arguer?.yaw ?? 0) - (at.answerer?.yaw ?? 0))).toBeCloseTo(Math.PI, 9);
      // The walker keeps clear of the lamp posts.
      for (const lamp of block.scene.props.filter((p) => p.kind === 'lamp' && p.y < block.curb)) {
        expect(Math.abs(lamp.y - (at.walker?.y ?? 0))).toBeGreaterThan(0.45);
      }
    }
  });
});
