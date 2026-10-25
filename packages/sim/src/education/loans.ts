/**
 * Federal Direct loans after they are paid out (M2.8 step 4, D113). Interest runs on what you owe
 * from the day it is borrowed, simple and daily, as on an unsubsidized loan; every loan here is
 * one (open question 101). While you are enrolled at half time or more nothing is due. After your
 * last term the grace runs, then the unpaid interest joins what you owe and the standard plan's
 * payment is set: what pays it off over its months at the rate, at least the record's least. It
 * comes due on the 1st with the rent, and is taken if the cash is there; if not it falls behind.
 * At your death the loans are discharged, as federal loans are: the estate owes nothing (D113,
 * amended 2026-10-25).
 */
import type { ModuleContext } from '@eb/core';
import { aidOf } from './aid.ts';
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

const interestTo = (l: Readonly<Loan>, a: Aid, day: number): number =>
  l.interest + Math.floor((l.owed * a.loans.rate * Math.max(0, day - l.since)) / 3_650_000);

/** All that is owed on the loans today, interest to date included. */
export function owedNow(l: Readonly<Loan>, a: Aid | null, day: number): number {
  return a ? l.owed + interestTo(l, a, day) : l.owed + l.interest;
}

/** The standard plan's payment on `principal`: an annuity at the monthly rate, by multiplying. */
export function monthlyFor(a: Aid, principal: number): number {
  const n = a.loans.months;
  const r = a.loans.rate / 10000 / 12;
  if (r === 0) return Math.max(a.loans.leastMonth, Math.ceil(principal / n));
  let grown = 1;
  for (let i = 0; i < n; i++) grown *= 1 + r;
  return Math.max(a.loans.leastMonth, Math.ceil((principal * r * grown) / (grown - 1)));
}

/** Interest run to today. */
function accrue(ctx: Ctx, a: Aid, day: number): void {
  const l = ctx.read().loan;
  if (l.since === day) return;
  const w = ctx.write().loan;
  w.interest = interestTo(l, a, day);
  w.since = day;
}

/** Borrowed for a term: added to what is owed, with the interest run to today. */
export function borrow(ctx: Ctx, cents: number): void {
  const a = aidOf(ctx);
  if (!a || cents <= 0) return;
  const day = ctx.fact('time.day') as number;
  if (ctx.read().loan.owed + ctx.read().loan.interest === 0) ctx.write().loan.since = day;
  accrue(ctx, a, day);
  ctx.write().loan.owed += cents;
}

/** In school at half time or more: nothing is due. */
export function defer(ctx: Ctx): void {
  if (ctx.read().loan.repay >= 0) ctx.write().loan.repay = -1;
}

/** A term over: if not enrolled for the next at half time, the grace runs from its end. */
export function leftSchool(ctx: Ctx, end: number): void {
  const a = aidOf(ctx);
  const l = ctx.read().loan;
  if (!a || l.owed + l.interest === 0) return;
  Object.assign(ctx.write().loan, { repay: end + a.loans.grace, monthly: 0 });
}

/** Paid off what is paid, interest first. */
function payDown(ctx: Ctx, cents: number): void {
  const w = ctx.write().loan;
  const toInterest = Math.min(w.interest, cents);
  w.interest -= toInterest;
  w.owed -= cents - toInterest;
}

/** The 1st of the month: a payment due, once repayment has started. */
export function month(ctx: Ctx): void {
  const a = aidOf(ctx);
  const day = ctx.fact('time.day') as number;
  const l0 = ctx.read().loan;
  if (!a || l0.owed + l0.interest === 0) return;
  accrue(ctx, a, day);
  if (l0.repay < 0 || day < l0.repay) return;
  if (ctx.read().loan.monthly === 0) {
    const w = ctx.write().loan;
    w.owed += w.interest;
    w.interest = 0;
    w.monthly = monthlyFor(a, w.owed);
  }
  const l = ctx.read().loan;
  const total = l.owed + l.interest;
  const due = Math.min(l.monthly + l.behind, total);
  const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: due } }));
  if (paid.ok) {
    payDown(ctx, due);
    ctx.write().loan.behind = 0;
    if (due === total) Object.assign(ctx.write().loan, NO_LOAN());
  } else ctx.write().loan.behind = Math.min(total, l.behind + l.monthly);
  ctx.emit('loan-due', { cents: due, paid: paid.ok });
}

/** What is behind, paid now from cash. */
export function payBehind(ctx: Ctx): void {
  const behind = ctx.read().loan.behind;
  if (behind <= 0) ctx.refuse('nothing-behind');
  const a = aidOf(ctx);
  if (a) accrue(ctx, a, ctx.fact('time.day') as number);
  ctx.apply({ effect: 'pay-cost', cost: { cash: behind } });
  payDown(ctx, behind);
  ctx.write().loan.behind = 0;
  ctx.emit('loan-paid', { cents: behind });
}
