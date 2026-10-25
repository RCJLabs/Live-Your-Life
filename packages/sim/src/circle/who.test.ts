import { createRecordStore } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { ADULT, chemistry, drawnBy, whoIs } from '../people/who.ts';
import { namePoolOf } from '../ties/records.ts';
import { populationOf } from './records.ts';

const store = createRecordStore(PACK.records);
const pop = populationOf(store);
const pool = namePoolOf(store, pop.names);
const N = 20_000;

describe('who the tier-1 people are (M2.6, D89, D91)', () => {
  it('is the same person for the same seed and number, on every call', () => {
    for (let i = 0; i < 50; i++) expect(whoIs(pop, pool, 7, i)).toEqual(whoIs(pop, pool, 7, i));
    expect(whoIs(pop, pool, 7, 3)).not.toEqual(whoIs(pop, pool, 8, 3));
  });

  it('draws nobody under 18, over many seeds', () => {
    for (let seed = 0; seed < 40; seed++)
      for (let i = 0; i < 1000; i++) expect(whoIs(pop, pool, seed, i).age).toBeGreaterThanOrEqual(ADULT);
  });

  it('draws ages by the bands’ shares, within a point', () => {
    const people = Array.from({ length: N }, (_, i) => whoIs(pop, pool, 11, i));
    for (const band of pop.ages) {
      const share = people.filter((p) => p.age >= band.from && p.age <= band.to).length / N;
      expect(Math.abs(share - band.share / 1000), `${band.from}–${band.to}`).toBeLessThan(0.01);
    }
  });

  it('draws whom people are drawn to at their age’s shares, within two points', () => {
    const people = Array.from({ length: N * 5 }, (_, i) => whoIs(pop, pool, 12, i));
    for (const band of pop.drawn) {
      const of = people.filter((p) => p.age >= band.from && p.age <= band.to);
      if (of.length < 2000) continue;
      const anyone = of.filter((p) => p.drawnTo === 'anyone').length / of.length;
      expect(Math.abs(anyone - band.both / 1000), `${band.from}–${band.to}`).toBeLessThan(0.02);
      const binary = of.filter((p) => p.pronouns !== 'they' && p.drawnTo !== 'anyone');
      const same = binary.filter((p) => (p.pronouns === 'she') === (p.drawnTo === 'women')).length / of.length;
      expect(Math.abs(same - band.same / 1000), `${band.from}–${band.to}`).toBeLessThan(0.02);
    }
  });

  it('is drawn to you only when they can be, and less across a wide gap of age', () => {
    let gay = 0;
    let gapped = 0;
    for (let i = 0; i < 4000; i++) {
      const them = whoIs(pop, pool, 13, i);
      const you = { pronouns: 'he' as const, age: 18 };
      const c = chemistry(pop, 13, i, them, you, 0);
      if (!drawnBy(them.drawnTo, 'he')) expect(c).toBe(0);
      if (them.drawnTo === 'men' && them.pronouns === 'he') gay++;
      // Past the gap where the record's fall takes all 100 points, nobody is drawn.
      if ((them.age - 18 - pop.chemistry.free) * pop.chemistry.per >= 100) {
        gapped++;
        expect(c).toBe(0);
      }
    }
    expect(gay).toBeGreaterThan(0);
    expect(gapped).toBeGreaterThan(0);
  });
});
