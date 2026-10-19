import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  type Activity,
  FULL,
  HEALTH_PENALTY,
  HEALTH_RECOVERY,
  type Levels,
  lowest,
  NEEDS,
  PERCENT,
  RATES,
  settle,
  unitsPerMinute,
} from './needs.ts';

const at = (percent: number): Levels => Object.fromEntries(NEEDS.map((n) => [n, percent * PERCENT])) as Levels;
const percent = (level: number) => level / PERCENT;
const MOVING = ['rest', 'food', 'hygiene', 'company', 'calm'] as const;

describe('the needs table', () => {
  // M0.2's gate: every need moves at its table rate. The arithmetic is whole units, so the
  // tolerance is none: from 50%, after h hours, a need is at 50 + rate × h percent, within 0 and 100.
  const rows = ACTIVITIES.flatMap((activity) =>
    MOVING.map((need) => ({ activity, need, rate: RATES[activity][need] })),
  );
  it.each(rows)('$activity moves $need $rate% an hour', ({ activity, need, rate }) => {
    for (const hours of [1, 3, 8]) {
      const expected = Math.min(100, Math.max(0, 50 + rate * hours));
      expect(percent(settle(at(50), activity, hours * 60)[need])).toBe(expected);
    }
  });

  it("is the table in docs/DESIGN.md, row for row: the code can't drift from the design", () => {
    const design = readFileSync(resolve(import.meta.dirname, '../../../docs/DESIGN.md'), 'utf8');
    const rows = Object.fromEntries(
      [...design.matchAll(/^\| (\w+) \| (-?[\d.]+) \| (-?[\d.]+) \| (-?[\d.]+) \| (-?[\d.]+) \| (-?[\d.]+) \|$/gm)].map(
        ([, activity, ...rates]) => [activity, Object.fromEntries(MOVING.map((need, i) => [need, Number(rates[i])]))],
      ),
    );
    expect(rows).toEqual(RATES);
    expect(design).toContain(`Health recovers ${HEALTH_RECOVERY}% an hour`);
    expect(design).toContain(`falls ${HEALTH_PENALTY}% an hour for each of them`);
  });

  it('stops every need at empty and at full', () => {
    expect(settle(at(50), 'awake', 24 * 60)).toMatchObject({ rest: 0, food: 0, hygiene: 0, company: 2 * PERCENT });
    expect(settle(at(50), 'sleep', 24 * 60).rest).toBe(FULL);
  });

  it('turns a rate in percent an hour into whole units a minute, and refuses one finer than a unit', () => {
    expect(unitsPerMinute(1)).toBe(1000);
    expect(unitsPerMinute(6.25)).toBe(6250);
    expect(unitsPerMinute(-0.5)).toBe(-500);
    expect(() => unitsPerMinute(0.0001)).toThrow(/finer/);
  });

  it('balances a working day as the table promises', () => {
    const day = settle(settle(settle(at(100), 'awake', 8 * 60), 'work', 8 * 60), 'sleep', 8 * 60);
    const shiftEnd = settle(settle(at(100), 'awake', 8 * 60), 'work', 8 * 60);
    expect(percent(shiftEnd.rest)).toBe(8);
    expect(percent(day.rest)).toBe(100);
    expect(percent(day.company)).toBe(100);
    expect(percent(day.calm)).toBe(100);
    // With no meals and no wash, food runs out during the shift and hygiene ends the day at 12%.
    expect(percent(day.food)).toBe(0);
    expect(percent(day.hygiene)).toBe(12);
  });
});

describe('health', () => {
  it(`recovers ${HEALTH_RECOVERY}% an hour while food and rest last`, () => {
    expect(percent(settle(at(50), 'awake', 120).health)).toBe(51);
  });

  it(`falls ${HEALTH_PENALTY}% an hour from the minute food runs out`, () => {
    // Food at 1% falls 6.25% an hour, so it is out after 9.6 minutes: from the 10th minute on.
    const levels = { ...at(50), food: PERCENT };
    expect(settle(levels, 'awake', 70).health).toBe(50 * PERCENT + 10 * 500 - 60 * 4000);
  });

  it('falls twice as fast with food and rest both out', () => {
    expect(percent(settle({ ...at(50), food: 0, rest: 0 }, 'awake', 60).health)).toBe(42);
  });

  it('counts a need that is recovering as not out, even from empty', () => {
    expect(percent(settle({ ...at(50), rest: 0 }, 'sleep', 60).health)).toBe(50.5);
  });

  it('stops at empty', () => {
    expect(settle({ ...at(2), food: 0, rest: 0 }, 'awake', 60).health).toBe(0);
  });
});

describe('settling', () => {
  // Levels are settled whenever an activity changes, so a day settled once and a day settled at
  // every change must agree, to the unit, health included.
  const cases: { levels: Levels; activity: Activity }[] = [
    { levels: at(50), activity: 'awake' },
    { levels: { ...at(50), food: PERCENT }, activity: 'awake' },
    { levels: { ...at(40), rest: 2 * PERCENT, food: 3 * PERCENT }, activity: 'work' },
    { levels: { ...at(0), health: 70 * PERCENT }, activity: 'sleep' },
    { levels: { ...at(99), health: FULL }, activity: 'wash' },
  ];
  it.each(cases)('gives the same levels at once or in pieces: $activity', ({ levels, activity }) => {
    const total = 600;
    const once = settle(levels, activity, total);
    for (const first of [0, 1, 7, 9, 10, 11, 59, 60, 61, 299, 599, 600]) {
      expect(settle(settle(levels, activity, first), activity, total - first)).toEqual(once);
    }
  });

  it('changes nothing in no time, and refuses minutes that are not whole', () => {
    expect(settle(at(50), 'work', 0)).toEqual(at(50));
    expect(() => settle(at(50), 'work', -1)).toThrow();
    expect(() => settle(at(50), 'work', 1.5)).toThrow();
  });

  it('names the lowest need, and the first of those tied', () => {
    expect(lowest({ ...at(50), calm: 10 * PERCENT })).toBe('calm');
    expect(lowest(at(50))).toBe('rest');
  });
});
