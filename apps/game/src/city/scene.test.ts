import { GROUND } from '@lyl/stage';
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
});
