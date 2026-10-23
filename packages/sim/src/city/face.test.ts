import { Rng } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { type CityPlan, lotFront, planCity } from './city.ts';
import { cityTemplates, planFace, type Side, toCity } from './face.ts';
import { faceProblems } from './faceCheck.ts';

const store = sliceSim().content;
const CITIES = Array.from({ length: 10 }, (_, i) => planCity(store, `face-${i}`));

/** The walkable blocks of a city: downtown's and the inner ring's (D63). */
function walkable(city: CityPlan): number[] {
  const ct = cityTemplates(store, city);
  const out: number[] = [];
  for (let b = 0; b < city.blocks.count; b++)
    if (ct.districts[city.blocks.district[b] as number]?.frontage) out.push(b);
  return out;
}

describe('a face of a city block (M2.1)', () => {
  it('is the same face for the same city every time, and another for another', () => {
    const city = CITIES[0] as CityPlan;
    const ct = cityTemplates(store, city);
    const [a, b] = walkable(city);
    expect(planFace(ct, city, a as number, 1)).toEqual(planFace(cityTemplates(store, city), city, a as number, 1));
    expect(JSON.stringify(planFace(ct, city, a as number, 0))).not.toBe(
      JSON.stringify(planFace(ct, city, a as number, 1)),
    );
    expect(JSON.stringify(planFace(ct, city, b as number, 1))).not.toBe(
      JSON.stringify(planFace(ct, city, a as number, 1)),
    );
  });

  it("keeps M1.1's and M1.2's rules and the city's lots, with every door joined to the street, in 1,000 faces", {
    timeout: 120_000,
  }, () => {
    const rng = Rng.create('faces');
    const out: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const city = CITIES[i % CITIES.length] as CityPlan;
      const ct = cityTemplates(store, city);
      const block = rng.pick(walkable(city));
      const side = (i % 2) as Side;
      out.push(...faceProblems(ct, city, block, side, planFace(ct, city, block, side)));
    }
    expect(out).toEqual([]);
  });

  it('puts one courthouse and one precinct downtown, on the lots nearest the centre that fit them', () => {
    for (const city of CITIES) {
      const ct = cityTemplates(store, city);
      expect(city.institutions.map((i) => i.building)).toEqual(['courthouse', 'precinct']);
      for (const { building, lot } of city.institutions) {
        const block = city.lots.block[lot] as number;
        expect(city.districts[city.blocks.district[block] as number]).toBe('downtown');
        const side = city.lots.side[lot] as Side;
        const there = planFace(ct, city, block, side).buildings.filter((b) => b.template === building);
        expect(there.length, `${city.seed} ${building}`).toBe(1);
        // No lot it fits is nearer the centre, the precinct's excepting the courthouse's.
        const c = { x: (city.centre.col + 0.5) * city.cell, y: (city.centre.row + 0.5) * city.cell };
        const dist = (l: number) => {
          const p = lotFront(city.blocks, city.lots, l);
          return (p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y);
        };
        const min = (store.get<{ width: { min: number } }>('building', building) as { width: { min: number } }).width
          .min;
        for (let l = 0; l < city.lots.count; l++) {
          if (city.institutions.some((i) => i.lot === l) || (city.lots.width[l] as number) < min) continue;
          if (city.districts[city.blocks.district[city.lots.block[l] as number] as number] !== 'downtown') continue;
          expect(dist(l)).toBeGreaterThanOrEqual(dist(lot));
        }
      }
    }
  });

  it('draws every building of both frontages, and empty lots, across the faces sampled', () => {
    const seen = new Set<string>();
    let empty = 0;
    for (const city of CITIES.slice(0, 3)) {
      const ct = cityTemplates(store, city);
      const blocks = walkable(city);
      const downtown = blocks.filter((b) => city.districts[city.blocks.district[b] as number] === 'downtown');
      for (const block of [...blocks.slice(0, 60), ...downtown.slice(0, 60)]) {
        const face = planFace(ct, city, block, 1);
        for (const lot of face.lots) {
          if (lot.building) seen.add(lot.building.template);
          else empty++;
        }
      }
    }
    for (const id of ['rowhouse', 'apartment', 'storefront', 'corner-shop', 'diner', 'office'])
      expect(seen).toContain(id);
    expect(empty).toBeGreaterThan(0);
  });

  it("sets each front on its block's street edge in the city, turning a north face half round", () => {
    const city = CITIES[1] as CityPlan;
    const ct = cityTemplates(store, city);
    for (const block of walkable(city).slice(0, 50)) {
      const x0 = city.blocks.x[block] as number;
      const y0 = city.blocks.y[block] as number;
      for (const side of [0, 1] as Side[]) {
        const face = planFace(ct, city, block, side);
        for (const b of face.buildings) {
          const at = toCity(city, block, side, face.street.lotFront, b.door, b.y1);
          expect(at.y).toBeCloseTo(side === 1 ? y0 + (city.blocks.d[block] as number) : y0, 9);
          expect(at.x).toBeGreaterThan(x0);
          expect(at.x).toBeLessThan(x0 + (city.blocks.w[block] as number));
        }
      }
    }
  });

  it('refuses a block nobody can walk yet', () => {
    const city = CITIES[0] as CityPlan;
    const ct = cityTemplates(store, city);
    const far = Array.from({ length: city.blocks.count }, (_, b) => b).find(
      (b) => !ct.districts[city.blocks.district[b] as number]?.frontage,
    );
    expect(() => planFace(ct, city, far as number, 1)).toThrow(/not in a district that can be walked/);
  });
});
