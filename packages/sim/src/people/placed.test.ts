import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { type CityPlan, planCity } from '../city/city.ts';
import { cityTemplates } from '../city/face.ts';
import { placeRoster } from './placed.ts';
import { rosterOf } from './roster.ts';

const store = sliceSim().content;
const CITIES = Array.from({ length: 3 }, (_, i) => planCity(store, `placed-${i}`));
const SEED = 1234;
const roster = rosterOf(SEED, 1000);

/** Each district's share of a weight over its cells. */
function shares(city: CityPlan, of: 'density' | 'jobs'): number[] {
  const records = cityTemplates(store, city).districts.map((d) => d.record);
  const w = city.districts.map(() => 0);
  for (const d of city.cellDistrict) w[d] = (w[d] as number) + (records[d]?.[of] as number);
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

describe("the tier-1 people's places in the city (M2.2, D68)", () => {
  it('puts every home, workplace and third place on a lot, the same way every time', () => {
    for (const city of CITIES) {
      const ct = cityTemplates(store, city);
      const a = placeRoster(roster, ct, city, SEED);
      expect([...a.lot].every((l) => l >= 0 && l < city.lots.count)).toBe(true);
      expect([...placeRoster(roster, cityTemplates(store, city), city, SEED).lot]).toEqual([...a.lot]);
    }
  });

  it('spreads homes by the districts’ people and workplaces by their jobs', () => {
    for (const city of CITIES) {
      const placed = placeRoster(roster, cityTemplates(store, city), city, SEED);
      const count = (from: number, to: number) => {
        const out = city.districts.map(() => 0);
        for (let p = from; p < to; p++) {
          const d = city.blocks.district[city.lots.block[placed.lot[p] as number] as number] as number;
          out[d] = (out[d] as number) + 1;
        }
        return out.map((c) => c / (to - from));
      };
      const homes = count(0, roster.firstShared);
      shares(city, 'density').forEach((want, d) => {
        expect(Math.abs((homes[d] as number) - want), `homes ${d}`).toBeLessThan(0.07);
      });
      // Workplaces are few (about one to twelve workers), so their spread is rougher.
      const work = count(roster.firstShared, roster.firstThird);
      shares(city, 'jobs').forEach((want, d) => {
        expect(Math.abs((work[d] as number) - want), `work ${d}`).toBeLessThan(0.2);
      });
    }
  });

  it('puts homes in houses, work in shops, diners and offices, in the districts that can be walked', () => {
    for (const city of CITIES) {
      const ct = cityTemplates(store, city);
      const placed = placeRoster(roster, ct, city, SEED);
      for (let p = 0; p < roster.places; p++) {
        const d = city.blocks.district[city.lots.block[placed.lot[p] as number] as number] as number;
        if (!ct.districts[d]?.frontage) continue;
        expect(placed.building[p], `${city.seed} place ${p}`).not.toBe('');
      }
    }
  });

  it('leaves your own block’s face to the slice’s block (D67)', () => {
    const city = CITIES[0] as CityPlan;
    const ct = cityTemplates(store, city);
    const free = placeRoster(roster, ct, city, SEED);
    const taken = free.lot[0] as number;
    const skip = { block: city.lots.block[taken] as number, side: city.lots.side[taken] as 0 | 1 };
    const placed = placeRoster(roster, ct, city, SEED, skip);
    for (const l of placed.lot)
      expect(city.lots.block[l] === skip.block && city.lots.side[l] === skip.side).toBe(false);
  });
});
