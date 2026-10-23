import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { rosterOf } from '../people/roster.ts';
import { employersOf, homeEmployer, SITES } from './employers.ts';
import { FILL, openingOf, openingsOn, postedIn } from './openings.ts';

const store = sliceSim().content;
const SEED = 4321;
const roster = rosterOf(SEED, 1000);
const employers = employersOf(store, SEED, roster, 'inner-ring');
const careers = store.ids('career');

describe('the employers and their openings (M2.3, D74)', () => {
  it('gives every tier-1 workplace a career, and each career its sites and, worked on your block, the home', () => {
    const workplaces = employers.filter((e) => e.place >= 0);
    expect(workplaces.length).toBe(roster.firstThird - roster.firstShared);
    for (const c of careers) {
      expect(employers.filter((e) => e.career === c && e.place < 0 && !e.home).length).toBe(SITES);
    }
    expect(employers.find((e) => e.id === homeEmployer('line-cook'))?.home).toBe(true);
    expect(new Set(employers.map((e) => e.id)).size).toBe(employers.length);
    // The same from the same seed, kept or not.
    expect(employersOf(store, SEED, rosterOf(SEED, 1000), 'inner-ring')).toEqual(employers);
  });

  it('posts openings across the city as often as staff leave', () => {
    // Summed over every employer, so one employer's luck doesn't decide it.
    // A year is 52 weeks; the records count separations a month per thousand staff.
    const years = 8;
    let posted = 0;
    let expected = 0;
    for (const e of employers) {
      expected += ((e.staff * e.turnover) / 1000) * 12 * years;
      for (let w = 0; w < 52 * years; w++) posted += postedIn(SEED, e, w).length;
    }
    expect(posted / expected).toBeGreaterThan(0.97);
    expect(posted / expected).toBeLessThan(1.03);
  });

  it('keeps each opening up from its posting until someone else takes it, and finds it by its id', () => {
    for (let day = 0; day < 120; day += 3) {
      const open = openingsOn(SEED, employers, day);
      expect(new Set(open.map((o) => o.id)).size).toBe(open.length);
      for (const o of open) {
        expect(o.posted).toBeLessThanOrEqual(day);
        expect(o.closes).toBeGreaterThan(day);
        expect(o.closes - o.posted).toBeGreaterThanOrEqual(FILL.fewest);
        expect(o.closes - o.posted).toBeLessThanOrEqual(FILL.most);
        expect(openingOf(SEED, employers, o.id, day)).toEqual(o);
      }
    }
    // A life's first day already has jobs going, posted before it began.
    expect(openingsOn(SEED, employers, 0).some((o) => o.posted < 0)).toBe(true);
    const gone = openingsOn(SEED, employers, 10)[0];
    if (gone) expect(openingOf(SEED, employers, gone.id, gone.closes)).toBeNull();
  });
});
