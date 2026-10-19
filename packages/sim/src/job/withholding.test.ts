import { describe, expect, it } from 'vitest';
import { lineCook, sliceSim } from '../../test/slice.ts';
import { taxOf } from './records.ts';
import { paycheck, payFor, withhold } from './withholding.ts';

const store = sliceSim().content;
const tax = (id: string) => taxOf(store, id);
const WEEKLY = 52;

// Worked by hand from IRS Publication 15-T's Worksheet 1A (2025) and Michigan's and the city's
// flat rates, to the cent, the way a payroll clerk would: annualize, take off the deduction, find
// the bracket, divide by 52, round. CALIBRATION.md names the sources.
describe('withholding, in worked examples', () => {
  it('takes $102.65 from a line cook’s full week of $589.20, leaving $486.55', () => {
    const gross = payFor(5 * 480, lineCook().wage);
    expect(gross).toBe(589_20);
    // Federal: $589.20 × 52 = $30,638.40, less $8,600 = $22,038.40, in the 12% row:
    // $1,192.50 + 12% of $3,713.40 = $1,638.108 a year, $31.502 a week.
    expect(withhold(tax('federal-single'), gross, WEEKLY, 0)).toBe(31_50);
    expect(withhold(tax('social-security'), gross, WEEKLY, 0)).toBe(36_53); // 6.2% of $589.20 = $36.5304
    expect(withhold(tax('medicare'), gross, WEEKLY, 0)).toBe(8_54); // 1.45% = $8.5434
    expect(withhold(tax('michigan'), gross, WEEKLY, 0)).toBe(20_30); // 4.25% of ($589.20 − $111.54)
    expect(withhold(tax('city-resident'), gross, WEEKLY, 0)).toBe(5_78); // 1% of ($589.20 − $11.54)
    const check = paycheck(
      lineCook().withholding.map((id) => [id, tax(id)] as const),
      gross,
      WEEKLY,
      0,
    );
    expect(check.net).toBe(486_55);
    expect(Object.keys(check.withheld)).toEqual(lineCook().withholding);
  });

  it('takes the 10% row for three shifts, $353.52', () => {
    const gross = payFor(3 * 480, lineCook().wage);
    expect(gross).toBe(353_52);
    // $18,383.04 − $8,600 − $6,400 = $3,383.04 at 10% = $338.304 a year, $6.5058 a week.
    expect(withhold(tax('federal-single'), gross, WEEKLY, 0)).toBe(6_51);
    expect(withhold(tax('social-security'), gross, WEEKLY, 0)).toBe(21_92);
    expect(withhold(tax('medicare'), gross, WEEKLY, 0)).toBe(5_13);
    expect(withhold(tax('michigan'), gross, WEEKLY, 0)).toBe(10_28);
    expect(withhold(tax('city-resident'), gross, WEEKLY, 0)).toBe(3_42);
  });

  it('takes no federal or Michigan tax from a week under their deductions', () => {
    expect(withhold(tax('federal-single'), 100_00, WEEKLY, 0)).toBe(0);
    expect(withhold(tax('michigan'), 100_00, WEEKLY, 0)).toBe(0);
    expect(withhold(tax('city-resident'), 100_00, WEEKLY, 0)).toBe(88);
    expect(withhold(tax('city-resident'), 11_00, WEEKLY, 0)).toBe(0);
  });

  it('climbs the brackets: $5,000 a week is in the 32% row', () => {
    // $260,000 − $8,600 = $251,400: $40,199 + 32% of ($251,400 − $203,700) = $55,463 a year.
    expect(withhold(tax('federal-single'), 5000_00, WEEKLY, 0)).toBe(1066_60);
  });

  it('holds the federal brackets to Publication 15-T’s amounts at the start of each row', () => {
    // Column C of the 2025 table, Single, standard withholding: the tax at the start of each row.
    const columnC = [0, 0, 1192_50, 5578_50, 17651_00, 40199_00, 57231_00, 188769_75];
    const federal = tax('federal-single');
    federal.brackets.forEach((b, i) => {
      // A year's pay that lands exactly on the row's start after the deduction, as one paycheck.
      expect(withhold(federal, federal.deduction + b.over, 1, 0), `row ${i}`).toBe(columnC[i]);
    });
  });

  it('stops Social Security at the wage base, part of a paycheck when it crosses', () => {
    const ss = tax('social-security');
    expect(ss.cap).toBe(176_100_00);
    expect(withhold(ss, 5000_00, WEEKLY, 176_000_00)).toBe(6_20); // $100 left of the base
    expect(withhold(ss, 5000_00, WEEKLY, 176_100_00)).toBe(0);
    expect(withhold(tax('medicare'), 5000_00, WEEKLY, 176_100_00)).toBe(72_50); // no cap
  });

  it('rounds to the cent, half up', () => {
    expect(withhold(tax('social-security'), 25, WEEKLY, 0)).toBe(2); // 1.55 cents
    expect(withhold(tax('social-security'), 24, WEEKLY, 0)).toBe(1); // 1.488 cents
  });

  it('pays every minute at the wage, rounded down to the cent', () => {
    expect(payFor(480, 1473)).toBe(117_84);
    expect(payFor(1, 1473)).toBe(24); // 24.55 cents
    expect(payFor(0, 1473)).toBe(0);
  });
});
