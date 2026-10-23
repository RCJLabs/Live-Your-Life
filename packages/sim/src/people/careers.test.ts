import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { WEEKDAYS } from '../calendar.ts';
import { careerOf } from '../job/records.ts';
import { employersOf } from '../market/employers.ts';
import { careerRoster } from './careers.ts';
import { planAt } from './gather.ts';
import { rosterOf } from './roster.ts';

const store = sliceSim().content;
const SEED = 2468;
const base = rosterOf(SEED, 1000);
const roster = careerRoster(store, SEED, 1000);
const careerAt = new Map(
  employersOf(store, SEED, base, 'inner-ring')
    .filter((e) => e.place >= 0)
    .map((e) => [e.place, e.career]),
);

describe('the tier-1 people on their careers’ shifts (M2.3)', () => {
  it('puts every worker on a shift of their workplace’s career, on as many of its open days as it allows', () => {
    let workers = 0;
    roster.people.forEach((p, i) => {
      const was = base.people[i];
      expect(p.home).toBe(was?.home);
      expect(p.work).toBe(was?.work);
      if (!p.shift || p.work < 0) {
        expect(p.shift).toEqual(was?.shift ?? null);
        return;
      }
      workers++;
      const career = careerOf(store, careerAt.get(p.work) as string);
      const kinds = career.shifts.map((k) => ({ start: k.hour * 60 + k.minute, minutes: k.minutes }));
      expect(kinds).toContainEqual({ start: p.shift.start, minutes: p.shift.minutes });
      expect(p.shift.days.length).toBe(Math.min(career.perWeek, career.open.length));
      for (const d of p.shift.days) expect(career.open).toContain(WEEKDAYS[d]);
    });
    expect(workers).toBeGreaterThan(500);
  });

  it('is the same from the same seed, and its hour plans are its own, not the harness’s', () => {
    expect(careerRoster(store, SEED, 1000)).toBe(roster);
    const kinds = (r: typeof roster) => planAt(r, SEED, 8, 0).kinds.map((k) => k.at);
    expect(kinds(roster)).not.toEqual(kinds(base));
  });
});
