import { stateHash } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { type CityRecord, type DistrictRecord, planCity } from './city.ts';

const store = sliceSim().content;
const city = store.get<CityRecord>('city', 'ridgefield') as CityRecord;
const district = (id: string) => store.get<DistrictRecord>('district', id) as DistrictRecord;

describe('the city (M2.1, D63–D66)', () => {
  it('is the same city for the same seed, and another for another', () => {
    const a = planCity(store, 'one');
    expect(stateHash({ lots: [...planCity(store, 'one').lots.width] })).toBe(stateHash({ lots: [...a.lots.width] }));
    expect([...planCity(store, 'two').cellDistrict]).not.toEqual([...a.cellDistrict]);
  });

  it('is Ridgefield, of a size D4 allows, with every district on it', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const plan = planCity(store, seed);
      expect(plan.name).toBe('Ridgefield');
      expect(plan.population, seed).toBeGreaterThanOrEqual(city.population.min);
      expect(plan.population, seed).toBeLessThanOrEqual(city.population.max);
      const seen = new Set(plan.cellDistrict);
      expect(seen.size, seed).toBe(plan.districts.length);
      // Downtown is at the centre, and the inner ring is walkable round it (D63).
      const at = plan.cellDistrict[plan.centre.row * plan.size + plan.centre.col] as number;
      expect(plan.districts[at]).toBe('downtown');
    }
  });

  it('keeps every block inside its cell and every lot inside its block, at its district’s frontage', () => {
    const plan = planCity(store, 'bounds');
    const { blocks, lots } = plan;
    for (let b = 0; b < blocks.count; b++) {
      const col = Math.floor((blocks.x[b] as number) / plan.cell);
      const row = Math.floor((blocks.y[b] as number) / plan.cell);
      expect((blocks.x[b] as number) + (blocks.w[b] as number)).toBeLessThanOrEqual((col + 1) * plan.cell);
      expect((blocks.y[b] as number) + (blocks.d[b] as number)).toBeLessThanOrEqual((row + 1) * plan.cell);
      expect(blocks.district[b]).toBe(plan.cellDistrict[row * plan.size + col]);
    }
    for (let l = 0; l < lots.count; l++) {
      const b = lots.block[l] as number;
      const d = district(plan.districts[blocks.district[b] as number] as string);
      expect(lots.width[l], `lot ${l}`).toBeGreaterThanOrEqual(d.lots.min);
      expect(lots.width[l], `lot ${l}`).toBeLessThanOrEqual(d.lots.max);
      expect((lots.start[l] as number) + (lots.width[l] as number)).toBeLessThanOrEqual(blocks.w[b] as number);
    }
  });

  it('reads its districts from the pack: none is placed in code', () => {
    expect(PACK.records.district).toBeDefined();
    expect(Object.keys(PACK.records.district ?? {}).sort()).toEqual(
      ['downtown', 'inner-ring', 'old-industrial', 'strip', 'suburbs'].sort(),
    );
  });
});
