/**
 * Federal Direct loans after they are paid out (M2.8 step 4, D113). Interest runs on what you owe
 * from the day it is borrowed, simple and daily, as on an unsubsidized loan; every loan here is
 * one (open question 101). While you are enrolled at half time or more nothing is due. After your
 * last term the grace runs, then the unpaid interest joins what you owe and the standard plan's
 * payment is set: what pays it off over its months at the rate, at least the record's least. It
 * comes due on the 1st with the rent, and is taken if the cash is there; if not it falls behind.
 * At your death the loans are discharged, as federal loans are: the estate owes nothing (D113,
 * amended 2026-10-25). Law school's loans (M4.2 step 2) are kept apart, at their own rate and fee,
 * with the same grace and plan: a professional student's, under the limits from July 2026.
 */
import type { ModuleContext } from '@eb/core';
import { aidOf } from './aid.ts';
import { lawOf } from './law.ts';
import type { EducationSlice } from './module.ts';
import type { Aid } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;

export interface Loan {
  /** What is owed on which interest runs, and the interest unpaid, in cents. */
  owed: number;
  interest: number;
  /** The day interest has run to. */
  since: number;
  /** The day repayment starts, or -1 while in school or with nothing owed. */
  repay: number;
  /** The standard plan's payment, set when repayment starts; 0 before. */
  monthly: number;
  /** Payments due and not made. */
  behind: number;
}

export const NO_LOAN = (): Loan => ({ owed: 0, interest: 0, since: 0, repay: -1, monthly: 0, behind: 0 });

/** The undergraduate loans, and law school's. */
export type LoanKey = 'loan' | 'grad';
export const LOANS: readonly LoanKey[] = ['loan', 'grad'];

/** A loan's terms: the college's, with law school's rate for its own. */
export interface Terms {
  readonly rate: number;
  readonly grace: number;
  readonly months: number;
  readonly leastMonth: number;
}

export function termsOf(v: { readonly content: Ctx['content'] }, key: LoanKey): Terms | null {
  const a = aidOf(v);
  if (!a) return null;
  const law = key === 'grad' ? lawOf(v) : null;
  return { ...a.loans, rate: law ? law.loans.rate : a.loans.rate };
}

const interestTo = (l: Readonly<Loan>, t: Terms, day: number): number =>
  l.interest + Math.floor((l.owed * t.rate * Math.max(0, day - l.since)) / 3_650_000);

/** All that is owed on a loan today, interest to date included. */
export function owedNow(l: Readonly<Loan>, t: Terms | null, day: number): number {
  return t ? l.owed + interestTo(l, t, day) : l.owed + l.interest;
}

/** The standard plan's payment on `principal`: an annuity at the monthly rate, by multiplying. */
export function monthlyFor(a: Pick<Aid, 'loans'> | { loans: Terms }, principal: number): number {
  const n = a.loans.months;
  const r = a.loans.rate / 10000 / 12;
  if (r === 0) return Math.max(a.loans.leastMonth, Math.ceil(principal / n));
  let grown = 1;
  for (let i = 0; i < n; i++) grown *= 1 + r;
  return Math.max(a.loans.leastMonth, Math.ceil((principal * r * grown) / (grown - 1)));
}

/** Interest run to today. */
function accrue(ctx: Ctx, key: LoanKey, t: Terms, day: number): void {
  const l = ctx.read()[key];
  if (l.since === day) return;
  const w = ctx.write()[key];
  w.interest = interestTo(l, t, day);
  w.since = day;
}

/** Borrowed for a term: added to what is owed, with the interest run to today. */
export function borrow(ctx: Ctx, cents: number, key: LoanKey = 'loan'): void {
  const t = termsOf(ctx, key);
  if (!t || cents <= 0) return;
  const day = ctx.fact('time.day') as number;
  if (ctx.read()[key].owed + ctx.read()[key].interest === 0) ctx.write()[key].since = day;
  accrue(ctx, key, t, day);
  ctx.write()[key].owed += cents;
}

/** In school at half time or more: nothing is due, on either. */
export function defer(ctx: Ctx): void {
  for (const key of LOANS) if (ctx.read()[key].repay >= 0) ctx.write()[key].repay = -1;
}

/** A term over: if not enrolled for the next at half time, the grace runs from its end. */
export function leftSchool(ctx: Ctx, end: number): void {
  for (const key of LOANS) {
    const t = termsOf(ctx, key);
    const l = ctx.read()[key];
    if (!t || l.owed + l.interest === 0) continue;
    Object.assign(ctx.write()[key], { repay: end + t.grace, monthly: 0 });
  }
}

/** Paid off what is paid, interest first. */
function payDown(ctx: Ctx, key: LoanKey, cents: number): void {
  const w = ctx.write()[key];
  const toInterest = Math.min(w.interest, cents);
  w.interest -= toInterest;
  w.owed -= cents - toInterest;
}

/** The 1st of the month: a payment due on each loan, once its repayment has started. */
export function month(ctx: Ctx): void {
  for (const key of LOANS) monthOf(ctx, key);
}

function monthOf(ctx: Ctx, key: LoanKey): void {
  const t = termsOf(ctx, key);
  const day = ctx.fact('time.day') as number;
  const l0 = ctx.read()[key];
  if (!t || l0.owed + l0.interest === 0) return;
  accrue(ctx, key, t, day);
  if (l0.repay < 0 || day < l0.repay) return;
  if (ctx.read()[key].monthly === 0) {
    const w = ctx.write()[key];
    w.owed += w.interest;
    w.interest = 0;
    w.monthly = monthlyFor({ loans: t }, w.owed);
  }
  const l = ctx.read()[key];
  const total = l.owed + l.interest;
  const due = Math.min(l.monthly + l.behind, total);
  const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: due } }));
  if (paid.ok) {
    payDown(ctx, key, due);
    ctx.write()[key].behind = 0;
    if (due === total) Object.assign(ctx.write()[key], NO_LOAN());
  } else ctx.write()[key].behind = Math.min(total, l.behind + l.monthly);
  ctx.emit('loan-due', { cents: due, paid: paid.ok });
}

/** All that is behind on either loan. */
export const behindOf = (s: { readonly loan: Readonly<Loan>; readonly grad: Readonly<Loan> }): number =>
  s.loan.behind + s.grad.behind;

/** What is behind, paid now from cash. */
export function payBehind(ctx: Ctx): void {
  const behind = behindOf(ctx.read());
  if (behind <= 0) ctx.refuse('nothing-behind');
  ctx.apply({ effect: 'pay-cost', cost: { cash: behind } });
  for (const key of LOANS) {
    const b = ctx.read()[key].behind;
    if (b <= 0) continue;
    const t = termsOf(ctx, key);
    if (t) accrue(ctx, key, t, ctx.fact('time.day') as number);
    payDown(ctx, key, b);
    ctx.write()[key].behind = 0;
  }
  ctx.emit('loan-paid', { cents: behind });
}
