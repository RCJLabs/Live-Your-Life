import { Rng } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { type CityPlan, type DistrictRecord, districtOf, gridOf, planCity } from './city.ts';
import { cityTemplates, planFace, type Side, toCity } from './face.ts';
import { type Streets, streetsOf } from './streets.ts';
import { inFront, walkBetween } from './walks.ts';

const store = sliceSim().content;
const CITIES = Array.from({ length: 4 }, (_, i) => planCity(store, `streets-${i}`));
const recordsOf = (city: CityPlan): DistrictRecord[] => city.districts.map((_, i) => districtOf(store, city, i));

/** Every node the network reaches from its first. */
function reached(s: Streets): number {
  const seen = new Uint8Array(s.count);
  const stack = [0];
  seen[0] = 1;
  let count = 1;
  while (stack.length > 0) {
    const n = stack.pop() as number;
    for (let e = s.first[n] as number; e < (s.first[n + 1] as number); e++) {
      const m = s.to[e] as number;
      if (seen[m]) continue;
      seen[m] = 1;
      count++;
      stack.push(m);
    }
  }
  return count;
}

/** A door of a walkable face, chosen by the seed: its block, side and x in the face's frame. */
function aDoor(city: CityPlan, rng: Rng) {
  const ct = cityTemplates(store, city);
  for (;;) {
    const block = rng.int(0, city.blocks.count - 1);
    if (!ct.districts[city.blocks.district[block] as number]?.frontage) continue;
    const side = rng.int(0, 1) as Side;
    const b = planFace(ct, city, block, side).buildings;
    if (b.length > 0) return { block, side, x: (b[rng.int(0, b.length - 1)] as { door: number }).door };
  }
}

describe("the city's streets (M2.1)", () => {
  it('fill every cell with whole blocks, a street’s middle on each edge of the cell', () => {
    for (const city of CITIES) {
      const records = recordsOf(city);
      for (let b = 0; b < city.blocks.count; b++) {
        const street = (records[city.blocks.district[b] as number] as DistrictRecord).block.street;
        const east = (city.blocks.x[b] as number) + (city.blocks.w[b] as number) + street / 2;
        const south = (city.blocks.y[b] as number) + (city.blocks.d[b] as number) + street / 2;
        // Each block's east and south streets fall on a whole share of its cell: no land left over.
        const d = records[city.blocks.district[b] as number] as DistrictRecord;
        const { across, down } = gridOf(city.cell, d);
        const col = Math.floor((city.blocks.x[b] as number) / city.cell);
        const row = Math.floor((city.blocks.y[b] as number) / city.cell);
        const shareX = ((east - col * city.cell) * across) / city.cell;
        const shareY = ((south - row * city.cell) * down) / city.cell;
        expect(Math.abs(shareX - Math.round(shareX)), `block ${b}`).toBeLessThan(1e-9);
        expect(Math.abs(shareY - Math.round(shareY)), `block ${b}`).toBeLessThan(1e-9);
      }
    }
  });

  it('are one network: every corner reaches every other', () => {
    for (const city of CITIES) {
      const s = streetsOf(city, recordsOf(city));
      expect(reached(s), city.seed).toBe(s.count);
    }
  });

  it('take you from any walkable door to any other, along streets, no shorter than the corners allow', () => {
    const rng = Rng.create('walks');
    for (const city of CITIES) {
      const records = recordsOf(city);
      const s = streetsOf(city, records);
      for (let i = 0; i < 100; i++) {
        const a = aDoor(city, rng);
        const b = aDoor(city, rng);
        const from = inFront(city, records, s, a.block, a.side, a.x);
        const to = inFront(city, records, s, b.block, b.side, b.x);
        // The street in front: half a street's width out from the face's lot line.
        const street = (records[city.blocks.district[a.block] as number] as DistrictRecord).block.street;
        const door = toCity(city, a.block, a.side, 0, a.x, 0);
        expect(Math.abs(from.y - door.y)).toBeCloseTo(street / 2, 9);
        expect(from.x).toBeCloseTo(door.x, 9);
        expect(from.da + from.db).toBeCloseTo(Math.abs((s.x[from.b] as number) - (s.x[from.a] as number)), 6);
        const walk = walkBetween(s, from, to);
        expect(walk, `${city.seed} ${i}`).not.toBeNull();
        if (!walk) continue;
        // Streets run north–south and east–west, so no walk beats the corner-to-corner distance.
        expect(walk.metres).toBeGreaterThanOrEqual(Math.abs(to.x - from.x) + Math.abs(to.y - from.y) - 1e-6);
        let length = 0;
        for (let k = 1; k < walk.path.length; k++) {
          const p = walk.path[k - 1] as { x: number; y: number };
          const q = walk.path[k] as { x: number; y: number };
          expect(Math.min(Math.abs(q.x - p.x), Math.abs(q.y - p.y)), 'a straight leg').toBeLessThan(1e-6);
          length += Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
        }
        expect(length).toBeCloseTo(walk.metres, 6);
      }
    }
  });

  it('run unbroken along every cell edge, so two corners on one edge are a straight walk apart', () => {
    const rng = Rng.create('edges');
    for (const city of CITIES) {
      const s = streetsOf(city, recordsOf(city));
      const at = (n: number) => ({ x: s.x[n] as number, y: s.y[n] as number, a: n, b: n, da: 0, db: 0 });
      const onEdge = (v: number) => Math.abs(v / city.cell - Math.round(v / city.cell)) < 1e-9;
      for (const axis of ['x', 'y'] as const) {
        const nodes = Array.from({ length: s.count }, (_, n) => n).filter((n) => onEdge(s[axis][n] as number));
        for (let i = 0; i < 50; i++) {
          const one = rng.pick(nodes);
          const line = nodes.filter((n) => s[axis][n] === s[axis][one]);
          const two = rng.pick(line);
          const other = axis === 'x' ? 'y' : 'x';
          const want = Math.abs((s[other][two] as number) - (s[other][one] as number));
          expect(walkBetween(s, at(one), at(two))?.metres, `${city.seed} ${axis}`).toBeCloseTo(want, 6);
        }
      }
    }
  });

  it('run an arterial along every fourth cell edge, the whole city across, both ways', () => {
    for (const city of CITIES) {
      const s = streetsOf(city, recordsOf(city));
      const every = city.cell * city.arterialEvery;
      const side = city.cell * city.size;
      let metres = 0;
      for (let n = 0; n < s.count; n++) {
        for (let e = s.first[n] as number; e < (s.first[n + 1] as number); e++) {
          if (!s.arterial[e]) continue;
          metres += s.len[e] as number;
          const m = s.to[e] as number;
          // Both ends on one arterial line: the same x or the same y, a whole number of `every` from the edge.
          const x = s.x[n] === s.x[m] ? (s.x[n] as number) : (s.y[n] as number);
          expect(Math.abs(x / every - Math.round(x / every))).toBeLessThan(1e-9);
        }
      }
      const lines = Math.floor(side / every) + 1;
      // Each edge is held from both of its ends.
      expect(metres / 2).toBeCloseTo(lines * side * 2, 6);
    }
  });

  it('walk straight along the street to a door on the same stretch of it', () => {
    const city = CITIES[0] as CityPlan;
    const records = recordsOf(city);
    const s = streetsOf(city, records);
    const ct = cityTemplates(store, city);
    const block = Array.from({ length: city.blocks.count }, (_, b) => b).find(
      (b) =>
        (ct.districts[city.blocks.district[b] as number]?.frontage ? planFace(ct, city, b, 1).buildings.length : 0) > 1,
    ) as number;
    const [one, two] = planFace(ct, city, block, 1).buildings;
    const from = inFront(city, records, s, block, 1, (one as { door: number }).door);
    const to = inFront(city, records, s, block, 1, (two as { door: number }).door);
    expect(walkBetween(s, from, to)?.metres).toBeCloseTo(Math.abs(to.x - from.x), 9);
  });
});
