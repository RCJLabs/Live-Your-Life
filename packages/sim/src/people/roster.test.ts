import { describe, expect, it } from 'vitest';
import { asleep, HOURS, hourOf, working } from './day.ts';
import { rosterOf } from './roster.ts';
import { SHIFTS, SLEEP } from './templates.ts';

const SEED = 20251;

describe('the roster', () => {
  it('is the same for the same seed and head count, and differs for another seed', () => {
    expect(rosterOf(SEED, 300)).toBe(rosterOf(SEED, 300));
    expect(JSON.stringify(rosterOf(SEED + 1, 300))).not.toBe(JSON.stringify(rosterOf(SEED, 300)));
  });

  it('numbers homes first, then workplaces, then third places, and puts each person in their own kind', () => {
    const { people, places, firstShared } = rosterOf(SEED, 1000);
    const thirds = Math.ceil(1000 / 30);
    for (const p of people) {
      expect(p.home).toBeGreaterThanOrEqual(0);
      expect(p.home).toBeLessThan(firstShared);
      if (p.shift) expect(p.work).toBeGreaterThanOrEqual(firstShared);
      else expect(p.work).toBe(-1);
      expect(p.work).toBeLessThan(places - thirds);
      expect(p.third).toBeGreaterThanOrEqual(places - thirds);
      expect(p.third).toBeLessThan(places);
    }
  });

  it('gives the shifts in the shares their weights ask for, within 3 points at 3,000 people', () => {
    const { people } = rosterOf(SEED, 3000);
    const total = SHIFTS.reduce((s, t) => s + t.weight, 0);
    for (const shift of SHIFTS) {
      const share = people.filter((p) => (p.shift?.id ?? 'none') === shift.id).length / people.length;
      expect(Math.abs(share - shift.weight / total)).toBeLessThan(0.03);
    }
  });

  it('keeps sleep and sociability in range', () => {
    for (const p of rosterOf(SEED, 1000).people) {
      expect(p.sleepHours).toBeGreaterThanOrEqual(SLEEP.hours[0]);
      expect(p.sleepHours).toBeLessThanOrEqual(SLEEP.hours[1]);
      expect(p.social).toBeGreaterThanOrEqual(0);
      expect(p.social).toBeLessThan(100);
    }
  });

  it('works each shift as one run of hours from its start, across midnight into the next day', () => {
    for (const p of rosterOf(SEED, 1000).people) {
      if (!p.shift) continue;
      for (const weekday of p.shift.days) {
        for (let k = 0; k < p.shift.minutes / 60; k++) {
          const h = p.shift.start / 60 + k;
          expect(working(p, (weekday + Math.floor(h / 24)) % 7, h % 24)).toBe(true);
        }
      }
    }
  });

  it('puts a shift worker to bed early enough to be up two hours before the shift', () => {
    for (const p of rosterOf(SEED, 1000).people) {
      if (!p.shift) continue;
      const start = p.shift.start / 60;
      for (const weekday of p.shift.days) {
        // The hour of rising and the hour on the way, on every day the shift starts.
        expect(asleep(p, (start + 22) % 24)).toBe(false);
        expect(asleep(p, (start + 23) % 24)).toBe(false);
        expect(working(p, weekday, start)).toBe(true);
      }
    }
  });
});

describe('a day', () => {
  it('has hours of exactly 60 minutes', () => {
    for (const kind of Object.values(HOURS)) expect(kind.segments.reduce((s, [, m]) => s + m, 0)).toBe(60);
  });

  // A week of everyone's hours: who rises, eats and works when.
  const { people } = rosterOf(SEED, 500);
  const week = people.map((p, i) =>
    Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, h) => hourOf(p, SEED, i, day, day % 7, h))),
  );

  it('has everyone up once a day, washed, and fed at least twice', () => {
    for (const days of week) {
      for (const hours of days) {
        expect(hours.filter((k) => k === HOURS.rise)).toHaveLength(1);
        const meals = hours.flatMap((k) => k.segments).filter(([a]) => a === 'eat');
        expect(meals.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("has shift workers work their shift's hours in a week, and nobody else work at all", () => {
    week.forEach((days, i) => {
      const p = people[i] as (typeof people)[number];
      const hours = days.flat().filter((k) => k.at === 'work').length;
      expect(hours).toBe(p.shift ? (p.shift.days.length * p.shift.minutes) / 60 : 0);
      if (!p.shift) expect(days.flat()).not.toContain(HOURS.commute);
    });
  });

  it('has people out on the evenings their sociability gives, a quarter of them on average', () => {
    // At 20:00, everyone free: out with a chance of social / 2 in a hundred, which averages about 25.
    let free = 0;
    let out = 0;
    let expected = 0;
    week.forEach((days, i) => {
      const p = people[i] as (typeof people)[number];
      for (const hours of days) {
        if (hours[20]?.at === 'work' || hours[20] === HOURS.sleep || hours[20] === HOURS.commute) continue;
        free++;
        expected += p.social / 2 / 100;
        if (hours[20] === HOURS.out) out++;
      }
    });
    expect(free).toBeGreaterThan(2000);
    expect(Math.abs(out - expected) / free).toBeLessThan(0.03);
  });
});
