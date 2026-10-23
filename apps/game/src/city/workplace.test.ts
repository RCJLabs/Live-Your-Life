import { homeEmployer } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { townScene } from './town.ts';
import { WALK_PACE, workOf } from './workplace.ts';

const town = townScene('block-77');
const work = workOf(town, 4242, 1000);
const districtOfLot = (lot: number) =>
  town.city.districts[town.city.blocks.district[town.city.lots.block[lot] as number] as number];

describe('where the employers stand, and the walk to them (M2.3, D73)', () => {
  it('puts every employer but your block’s on a lot of its own district', () => {
    for (const e of work.employers) {
      const lot = work.lotOf(e.id);
      if (e.home) {
        expect(lot).toBe(-1);
        continue;
      }
      expect(lot, e.id).toBeGreaterThanOrEqual(0);
      expect(districtOfLot(lot), e.id).toBe(e.district);
    }
  });

  it('walks you there along the streets, at a walking pace, and not to your own block’s diner', () => {
    expect(work.walkTo(homeEmployer('line-cook'))).toBeNull();
    for (const e of work.employers.filter((x) => !x.home)) {
      const w = work.walkTo(e.id);
      expect(w, e.id).not.toBeNull();
      if (!w) continue;
      expect(w.minutes).toBe(Math.max(1, Math.ceil(w.metres / WALK_PACE)));
      // Ridgefield is 14 km across: no walk is longer than its two sides.
      expect(w.metres).toBeLessThan(28_000);
    }
  });

  it('puts the tier-1 people’s workplaces where their employers are', () => {
    for (const e of work.employers.filter((x) => x.place >= 0)) {
      expect(work.lotOf(e.id)).toBe(work.placed.lot[e.place]);
    }
  });
});
