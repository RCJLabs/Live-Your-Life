import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { lifeSim } from '../content.ts';
import { climateOf, clocksOn, gasBill, holidayOn, snowOn } from './climate.ts';

const c = climateOf(lifeSim(PACK.records).content);

/** The holidays kept in a year, as "month-day". */
function holidays(year: number): string[] {
  const out: string[] = [];
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let m = 1; m <= 12; m++)
    for (let d = 1; d <= (days[m - 1] as number); d++) if (holidayOn(c, year, m, d)) out.push(`${m}-${d}`);
  return out;
}

describe('the calendar (M2.10 step 3)', () => {
  it('keeps the federal holidays on the days the government kept them in 2025 and 2026 (D132)', () => {
    // OPM's tables: 2025's, and 2026's with Independence Day kept on Friday 3 July.
    expect(holidays(2025)).toEqual([
      '1-1',
      '1-20',
      '2-17',
      '5-26',
      '6-19',
      '7-4',
      '9-1',
      '10-13',
      '11-11',
      '11-27',
      '12-25',
    ]);
    expect(holidays(2026)).toEqual([
      '1-1',
      '1-19',
      '2-16',
      '5-25',
      '6-19',
      '7-3',
      '9-7',
      '10-12',
      '11-11',
      '11-26',
      '12-25',
    ]);
    // 1 January 2028 is a Saturday: kept on Friday 31 December 2027.
    expect(holidayOn(c, 2027, 12, 31)).toBe("New Year's Day");
  });

  it('changes the clocks on the second Sunday of March and the first of November (D133)', () => {
    expect(clocksOn(c, 2025, 3, 9)).toBe('forward');
    expect(clocksOn(c, 2025, 11, 2)).toBe('back');
    expect(clocksOn(c, 2026, 3, 8)).toBe('forward');
    expect(clocksOn(c, 2026, 11, 1)).toBe('back');
    expect(clocksOn(c, 2025, 3, 16)).toBeNull();
  });

  it('snows on as many days a month as the normals, across 2,000 seeds (D131)', () => {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const seeds = 2000;
    for (let m = 1; m <= 12; m++) {
      let n = 0;
      for (let seed = 0; seed < seeds; seed++)
        for (let d = 1; d <= (days[m - 1] as number); d++) if (snowOn(c, seed, 2025, m, d)) n++;
      const mean = n / seeds;
      const expected = (c.snowDays[m - 1] as number) / 100;
      // A month's mean over 2,000 seeds sits within 0.1 day of the normal.
      expect(Math.abs(mean - expected)).toBeLessThan(0.1);
    }
  });

  it('bills the gas by the month’s cold: most in January, least in July (D130)', () => {
    const bills = Array.from({ length: 12 }, (_, i) => gasBill(c, i + 1));
    expect(Math.max(...bills)).toBe(bills[0]);
    expect(Math.min(...bills)).toBe(bills[6]);
    // About $89 in January, $26 in July, about $640 a year (CALIBRATION.md).
    expect(bills[0]).toBe(1500 + 109 * (10 + 58));
    expect(bills[6]).toBe(1500 + 109 * 10);
    expect(bills.reduce((a, b) => a + b, 0)).toBeGreaterThan(60_000);
    expect(bills.reduce((a, b) => a + b, 0)).toBeLessThan(67_000);
  });
});
