import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WALL as PLANNED_WALL } from '@lyl/sim';
import { fixturePiece, GROUND, WALL } from '@lyl/stage';
import { fakeCanvas } from '@lyl/stage/testing';
import { describe, expect, it } from 'vitest';
import { generatedBlock } from './scene.ts';

describe('the generated block, as the stage gets it', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => `scene-${i}`);

  it('draws every building the plan has, its door where the plan put it', () => {
    for (const seed of seeds) {
      const { plan, scene } = generatedBlock(seed);
      for (const b of plan.buildings) {
        const drawn = scene.buildings.find((d) => d.id === b.id);
        expect(drawn, `${seed}: ${b.id}`).toBeDefined();
        expect((drawn?.x0 ?? 0) + (drawn?.door ?? Number.NaN)).toBeCloseTo(b.door, 9);
        expect(drawn?.facade.window).toBe(b.facade.window);
        expect(drawn?.facade.cornice).toBe(b.facade.cornice);
        expect(drawn?.facade.wear).toBe(b.facade.wear);
      }
      expect(scene.buildings.length).toBe(plan.buildings.length + plan.backRow.length);
      expect(scene.props.map((p) => p.id)).toEqual(plan.props.map((p) => p.id));
    }
  });

  it('paints the open side as the plan chose it, a verge or a car park', () => {
    for (const seed of seeds) {
      const { plan, scene } = generatedBlock(seed);
      const open = scene.ground.patches.find((p) => p.y0 === plan.street.openFront);
      expect(open?.color).toBe(plan.street.open === 'verge' ? GROUND.grass : GROUND.asphalt);
    }
  });

  it('frames the diner and the apartment house the plan stood up, and the shop', () => {
    const { byKind, plan } = generatedBlock('frame');
    expect(byKind.diner.kind).toBe('diner');
    expect(byKind.apartment.kind).toBe('apartment');
    expect(byKind.storefront.kind).toBe('corner-shop');
    expect(plan.buildings.map((b) => b.template)).toEqual(
      expect.arrayContaining(['diner', 'apartment', 'corner-shop']),
    );
  });

  it('draws each interior the plan has: its rooms, inside walls, ways out and fixtures', () => {
    for (const seed of seeds.slice(0, 20)) {
      const { plan, scene } = generatedBlock(seed);
      for (const b of plan.buildings) {
        const drawn = scene.buildings.find((d) => d.id === b.id)?.interior;
        if (!b.interior) {
          expect(drawn, `${seed}: ${b.id}`).toBeUndefined();
          continue;
        }
        expect(drawn?.rooms?.map((r) => r.wall)).toEqual(b.interior.rooms.map((r) => r.wall));
        expect(drawn?.partitions?.length).toBe(b.interior.walls.length);
        expect(drawn?.fixtures.map((f) => [f.id, f.kind])).toEqual(b.interior.fixtures.map((f) => [f.id, f.draw]));
        expect(drawn?.doors).toEqual(
          b.interior.doors
            .filter((d, i) => i > 0 && d.wall)
            .map((d) => expect.objectContaining({ x: d.x, wall: d.wall })),
        );
        expect((scene.buildings.find((d) => d.id === b.id)?.x0 ?? 0) + (drawn?.door ?? Number.NaN)).toBeCloseTo(
          b.door,
          9,
        );
      }
    }
  });

  it("plans walls as thick as the stage draws them, so the walk grid's walls are the ones seen", () => {
    expect(PLANNED_WALL).toBe(WALL);
  });

  it('can draw every fixture the content can name', () => {
    const type = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../../packages/content/types/fixture.json'), 'utf8'),
    );
    for (const kind of type.fields.draw.values) {
      const { ctx } = fakeCanvas();
      const piece = fixturePiece({ id: kind, kind, x: 2, y: 2, w: 1, d: 1, facing: 's' });
      expect(
        () =>
          piece.draw(
            ctx,
            { ox: 300, oy: 300, u: 20, width: 600, height: 600 },
            {
              dark: 0,
              warm: 0,
              time: 0,
              lights: [],
              sleepers: new Map(),
              heads: new Map(),
              ink: 1,
            },
          ),
        kind,
      ).not.toThrow();
    }
  });
});
