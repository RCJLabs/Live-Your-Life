/**
 * Withholding (D38), the way the IRS's percentage method for automated payroll works it out
 * (Publication 15-T, Worksheet 1A): a paycheck's pay as a year's, less the yearly deduction,
 * taxed in brackets, and that year's tax shared out over the year's paychecks. A flat tax with
 * an exemption, as Michigan's and the city's are, is the same sum with one bracket. A tax with a
 * cap, as Social Security has, stops at its wage base for the calendar year.
 *
 * Whole cents throughout, and rates in hundredths of a percent, so the sums are exact until the
 * one rounding to the cent at the end, half up.
 */
import type { TaxRecord } from './records.ts';

/** Hundredths of a percent in a whole. */
const BASIS = 10_000;

/** a ÷ b to the nearest whole number, half up, for b > 0 and a ≥ 0. */
const nearest = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

/** A year's tax on a year's pay after the deduction, in cents times BASIS: exact. */
function yearly(tax: TaxRecord, taxable: number): number {
  let owed = 0;
  tax.brackets.forEach((b, i) => {
    const next = tax.brackets[i + 1]?.over ?? Number.POSITIVE_INFINITY;
    if (taxable > b.over) owed += (Math.min(taxable, next) - b.over) * b.rate;
  });
  return owed;
}

/**
 * What one tax takes from a paycheck of `gross` cents, one of `periods` in a year, with `earned`
 * cents already paid this calendar year.
 */
export function withhold(tax: TaxRecord, gross: number, periods: number, earned: number): number {
  if (tax.cap !== undefined) {
    // A wage base: the rate on what is left of it this year (Social Security).
    const left = Math.max(0, Math.min(gross, tax.cap - earned));
    return nearest(yearly(tax, left), BASIS);
  }
  const taxable = Math.max(0, gross * periods - tax.deduction);
  return nearest(yearly(tax, taxable), BASIS * periods);
}

export interface Paycheck {
  readonly gross: number;
  /** Cents withheld, by tax record id, in the career's order. */
  readonly withheld: Readonly<Record<string, number>>;
  readonly net: number;
}

/** A paycheck: the gross, each tax, and what is left. */
export function paycheck(
  taxes: readonly (readonly [string, TaxRecord])[],
  gross: number,
  periods: number,
  earned: number,
): Paycheck {
  const withheld: Record<string, number> = {};
  let net = gross;
  for (const [id, tax] of taxes) {
    const cents = withhold(tax, gross, periods, earned);
    withheld[id] = cents;
    net -= cents;
  }
  return { gross, withheld, net };
}

/** Whole cents for minutes of work at an hourly wage, rounded down. */
export const payFor = (minutes: number, wage: number): number => Math.floor((minutes * wage) / 60);
