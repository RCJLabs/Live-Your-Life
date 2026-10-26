/**
 * Paying for a term (M2.8 step 4, D113). The bill is tuition and fees for each contact hour, a
 * course's hours taken as its credits, and the term's own fees. A Pell grant pays first, by your
 * gross pay over the past year against the poverty line: the most at or under the record's
 * share of it, falling evenly to the least at its upper share, nothing above (tune; the real
 * award runs on the Student Aid Index). You count as an independent student whatever your age
 * (D115): the game has no parents' income. At half time or more a federal
 * Direct loan can pay the rest, or the year's limit, less its fee; what is left you pay in cash,
 * and what aid pays past the bill is paid out to you, as a college's refund is.
 */
import type { FactView, ModuleContext } from '@eb/core';
import { nextCourses } from './college.ts';
import type { EducationSlice } from './module.ts';
import { type Aid, type College, educationOf } from './records.ts';

type View = FactView<EducationSlice> | ModuleContext<EducationSlice>;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export interface Paycheck {
  readonly day: number;
  readonly gross: number;
}

export const BORROWING = ['none', 'bill', 'most'] as const;
export type Borrow = (typeof BORROWING)[number];

export const aidOf = (v: { readonly content: View['content'] }): Aid | null => educationOf(v.content)?.aid ?? null;

/** Gross pay over the past 365 days: the income the game counts for aid. */
export function aidIncome(v: View): number {
  const today = v.fact('time.day') as number;
  return slice(v).pay.reduce((n, p) => (p.day > today - 365 ? n + p.gross : n), 0);
}

/** A year's Pell at full time, by income. */
export function pellYear(a: Aid, income: number): number {
  const full = Math.floor((a.pell.line * a.pell.full) / 100);
  const none = Math.floor((a.pell.line * a.pell.none) / 100);
  if (income <= full) return a.pell.most;
  if (income > none) return 0;
  return a.pell.most - Math.floor(((a.pell.most - a.pell.least) * (income - full)) / (none - full));
}

/** The most a loan can be this term: half the year's limit for the credits you have earned. */
export function termLimit(a: Aid, earned: number): number {
  let year = 0;
  for (const l of a.loans.limits) if (earned >= l.credits) year = l.year;
  return Math.floor(year / 2);
}

/** The credits of the next `courses` courses a term would take (college.ts). */
export function creditsOf(v: View, c: College, courses: number): number {
  return nextCourses(c, slice(v).college)
    .slice(0, courses)
    .reduce((n, x) => n + x.credits, 0);
}

export interface Bill {
  readonly credits: number;
  /** Tuition and fees. */
  readonly charge: number;
  readonly pell: number;
  /** What is borrowed, and its fee, taken before it is paid out. */
  readonly borrowed: number;
  readonly fee: number;
  /** What you pay in cash, and what is paid out to you past the bill. */
  readonly cash: number;
  readonly refund: number;
}

const FREE = (credits: number): Bill => ({ credits, charge: 0, pell: 0, borrowed: 0, fee: 0, cash: 0, refund: 0 });

/** A term's bill for `courses` courses, borrowing as asked. A pack without aid charges nothing. */
export function billFor(v: View, c: College, courses: number, borrow: Borrow): Bill {
  const credits = creditsOf(v, c, courses);
  const a = aidOf(v);
  if (!a) return FREE(credits);
  const charge = credits * (a.tuition + a.hourFee) + a.termFee;
  const share = Math.min(credits, a.pell.fullTime);
  const pell = Math.floor((pellYear(a, aidIncome(v)) * share) / a.pell.fullTime / 2);
  const limit = credits >= a.loans.half ? termLimit(a, slice(v).college.credits) : 0;
  const need = Math.max(0, charge - pell);
  const kept = 100000 - a.loans.fee;
  const borrowed =
    borrow === 'most' ? limit : borrow === 'bill' ? Math.min(limit, Math.ceil((need * 100000) / kept)) : 0;
  const fee = Math.floor((borrowed * a.loans.fee) / 100000);
  const net = borrowed - fee;
  return {
    credits,
    charge,
    pell,
    borrowed,
    fee,
    cash: Math.max(0, charge - pell - net),
    refund: Math.max(0, pell + net - charge),
  };
}

/** The ways to pay for `courses` courses that differ, and that the cash you have covers. */
export function payOptions(v: View, c: College, courses: number): Borrow[] {
  const cash = v.fact('economy.amount', { resource: 'cash' }) as number;
  const bills = BORROWING.map((b) => [b, billFor(v, c, courses, b)] as const);
  const seen = new Set<number>();
  const out: Borrow[] = [];
  for (const [b, bill] of bills) {
    if (b !== 'none' && (bill.borrowed === 0 || seen.has(bill.borrowed))) continue;
    seen.add(bill.borrowed);
    if (bill.cash <= cash) out.push(b);
  }
  return out;
}
