import { type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { newTie } from '../circle/state.ts';
import { estateNow } from '../lives/heir.ts';
import { type Bill, billFor, pellYear, termLimit } from './aid.ts';
import type { Term } from './college.ts';
import { type Loan, monthlyFor } from './loans.ts';
import type { EducationSlice } from './module.ts';
import { type Aid, type College, type EducationRecord, educationOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const r = educationOf(sim.content) as EducationRecord;
const a = r.aid as Aid;
const c = r.college as College;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string, args: Record<string, unknown> = {}) => game.fact(s, id, args, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((x) => x.type === type);
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const line = (pct: number) => Math.floor((a.pell.line * pct) / 100);

function withMoney(s: GameState, cents: number, change: Partial<EducationSlice> = {}): GameState {
  return {
    ...s,
    education: { ...edu(s), finished: 'diploma', ...change },
    economy: { ...(s.economy as object), amounts: { cash: cents } },
  } as GameState;
}

/** Ten days before the fall term (1 September; the life starts 2 June), with cash and a year's pay. */
function beforeFall(seed: string, cents: number, pay = 0): GameState {
  const s = game.init(seed, sim);
  const day = fact(s, 'time.day') as number;
  const later = play(game, sim, withMoney(s, cents, { pay: [{ day, gross: pay }] }), advance(81 * MINUTES_PER_DAY));
  return withMoney(later.state, cents);
}

const shown = (s: GameState, courses: number, borrow: string) =>
  turnFor(game, sim, s, Rng.create('shown'), 0).preview([
    { effect: 'college-bill', courses, borrow },
  ])[0] as unknown as Bill;

const loanOf = (s: GameState) => edu(s).loan;
const withLoan = (s: GameState, loan: Partial<Loan>) => withMoney(s, cash(s), { loan: { ...loanOf(s), ...loan } });

describe('paying for the college (M2.8 step 4, D113)', () => {
  it('bills tuition and fees by the hour, and pays the Pell grant first, by the year’s pay', () => {
    const s = beforeFall('aid-bill', 10_000_00);
    const bill = shown(s, 4, 'none');
    expect(bill.credits).toBe(12);
    expect(bill.charge).toBe(12 * (a.tuition + a.hourFee) + a.termFee);
    expect(bill.pell).toBe(a.pell.most / 2);
    expect(bill.refund).toBe(bill.pell - bill.charge);
    // Fewer credits than full time: the grant in proportion.
    expect(shown(s, 1, 'none').pell).toBe(Math.floor((a.pell.most * 3) / 12 / 2));
    // More than full time: no more than full time's.
    expect(shown(s, 5, 'none').pell).toBe(a.pell.most / 2);
    // The odds shown are the odds rolled: enrolling charges what the bill said.
    const after = play(game, sim, s, { type: 'education/enroll', courses: 4, borrow: 'none' });
    expect(cash(after.state)).toBe(cash(s) - bill.cash + bill.refund);
    expect(after.of('education/billed')[0]).toMatchObject({
      charge: bill.charge,
      pell: bill.pell,
      refund: bill.refund,
    });
    expect(told(after.of('education/billed')[0])).toMatch(/^The term cost \$[\d,.]+ in tuition and fees\. [^{}]*\.$/);
  });

  it('awards the most to the line’s lower share, falls evenly to the least, and nothing above', () => {
    expect(pellYear(a, line(a.pell.full))).toBe(a.pell.most);
    expect(pellYear(a, line(a.pell.none))).toBe(a.pell.least);
    expect(pellYear(a, line(a.pell.none) + 1)).toBe(0);
    const mid = Math.floor((line(a.pell.full) + line(a.pell.none)) / 2);
    expect(Math.abs(pellYear(a, mid) - (a.pell.most + a.pell.least) / 2)).toBeLessThan(100);
    // The year's pay is the past 365 days': older paychecks don't count.
    const s = beforeFall('aid-pay', 10_000_00, line(a.pell.none) + 1);
    expect(fact(s, 'education.aid-income')).toBe(line(a.pell.none) + 1);
    expect(shown(s, 4, 'none').pell).toBe(0);
    const year = play(game, sim, s, advance(365 * MINUTES_PER_DAY)).state;
    expect(fact(year, 'education.aid-income')).toBe(0);
  });

  it('lends at half time or more, less its fee, the bill or the term’s limit, and only what cash covers', () => {
    const rich = beforeFall('aid-loan', 0, line(a.pell.none) + 1);
    // No grant and no cash: only a loan pays.
    const ways = offered(rich, 'education/enroll');
    expect(ways.filter((w) => w.courses === 1)).toEqual([]);
    expect(ways.filter((w) => w.courses === 2).map((w) => w.borrow)).toEqual(['bill', 'most']);
    const bill = shown(rich, 2, 'bill');
    expect(bill.borrowed - bill.fee).toBeGreaterThanOrEqual(bill.charge);
    expect(bill.cash).toBe(0);
    expect(bill.fee).toBe(Math.floor((bill.borrowed * a.loans.fee) / 100000));
    const most = shown(rich, 2, 'most');
    expect(most.borrowed).toBe(termLimit(a, 0));
    expect(termLimit(a, 30)).toBeGreaterThan(termLimit(a, 29));
    const after = play(game, sim, rich, { type: 'education/enroll', courses: 2, borrow: 'most' }).state;
    expect(fact(after, 'education.owed')).toBe(most.borrowed);
    expect(cash(after)).toBe(most.refund);
    expect(loanOf(after).repay).toBe(-1);
  });

  it('runs interest daily, and sets the standard plan once the grace after a term is over', () => {
    const s0 = withMoney(game.init('aid-interest', sim), 100_000_00);
    const day = fact(s0, 'time.day') as number;
    const s = withLoan(s0, { owed: 1_000_000, since: day, repay: -1 });
    const year = play(game, sim, s, advance(365 * MINUTES_PER_DAY)).state;
    const owed = fact(year, 'education.owed') as number;
    expect(owed).toBeLessThanOrEqual(1_000_000 + 63_900);
    expect(owed).toBeGreaterThan(1_000_000 + 63_880);
    // A term's end starts the grace.
    const term: Term = { evening: false, id: 'fall', start: day - 112, end: day, courses: [] };
    const ended = play(game, sim, withMoney(s, cash(s), { college: { ...edu(s).college, term } }), advance(60)).state;
    expect(loanOf(ended).repay).toBe(day + a.loans.grace);
    // Past the grace, on the 1st: the plan's payment, taken from cash.
    const due = play(game, sim, withLoan(ended, { repay: day }), advance(35 * MINUTES_PER_DAY));
    const [paid] = due.of('education/loan-due');
    expect(paid).toMatchObject({ paid: true });
    // The interest unpaid joined what is owed, and the plan is set on it all.
    const capitalized = loanOf(due.state).owed + (paid?.cents as number);
    expect(capitalized).toBeGreaterThan(1_000_000);
    expect(loanOf(due.state).monthly).toBe(monthlyFor(a, capitalized));
  });

  it('pays the plan off in its months, and at the least payment for a small loan', () => {
    const r12 = a.loans.rate / 10000 / 12;
    const pay = monthlyFor(a, 1_000_000);
    let left = 1_000_000;
    for (let i = 0; i < a.loans.months - 1; i++) left = left * (1 + r12) - pay;
    expect(left).toBeGreaterThan(0);
    expect(left * (1 + r12) - pay).toBeLessThanOrEqual(0);
    expect(pay).toBeGreaterThan(11_280);
    expect(pay).toBeLessThan(11_310);
    expect(monthlyFor(a, 10_000)).toBe(a.loans.leastMonth);
  });

  it('falls behind when the cash isn’t there, and offers paying what is behind once it is', () => {
    const s0 = game.init('aid-behind', sim);
    const day = fact(s0, 'time.day') as number;
    const s = withLoan(withMoney(s0, 0), { owed: 1_000_000, since: day, repay: day });
    const due = play(game, sim, s, advance(35 * MINUTES_PER_DAY)).state;
    const missed = play(game, sim, s, advance(35 * MINUTES_PER_DAY));
    expect(told(missed.of('education/loan-due')[0])).toMatch(
      /^A student loan payment of \$[\d,.]+ came due, and Dana could not pay it\.$/,
    );
    expect(loanOf(due).behind).toBe(loanOf(due).monthly);
    expect(offered(due, 'education/pay-loan')).toEqual([]);
    const flush = withMoney(due, 10_000_00);
    expect(offered(flush, 'education/pay-loan')).toEqual([{ type: 'education/pay-loan' }]);
    const after = play(game, sim, flush, { type: 'education/pay-loan' }).state;
    expect(loanOf(after).behind).toBe(0);
    expect(fact(after, 'education.owed')).toBe((fact(flush, 'education.owed') as number) - loanOf(due).behind);
    expect(told({ type: 'education/loan-paid', cents: 11_300 })).toBe(
      'Dana paid the $113.00 that was behind on the student loans.',
    );
    expect(cash(after)).toBe(10_000_00 - loanOf(due).behind);
  });

  it('discharges the loans at death: the estate owes nothing for them, and the heir starts clear', () => {
    const s0 = game.init('aid-death', sim);
    const day = fact(s0, 'time.day') as number;
    const s = withLoan(withMoney(s0, 500_00), { owed: 2_000_000, since: day });
    const view = (x: GameState) => ({
      fact: (id: string, args?: object) => fact(x, id, args as never),
      content: sim.content,
    });
    expect(estateNow(view(s) as never).debts).toBe(estateNow(view(s0) as never).debts);
    const dead = {
      ...s,
      lives: { ...(s.lives as object), died: 0 },
      circle: { ...(s.circle as object), ties: [{ ...newTie(40, 600, 0), regard: 100 }] },
      kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'dead', data: {} }] },
    } as GameState;
    const heir = game.reduce(dead, { type: 'lives/succeed' }, sim);
    expect(heir.accepted).toBe(true);
    expect(fact(heir.state, 'education.owed')).toBe(0);
    expect(edu(heir.state).pay).toEqual([]);
  });

  it('bills a retake as any course, for its credits (step 8)', () => {
    const s = beforeFall('aid-retake', 10_000_00);
    const all = c.courses.map((x) => x.id);
    const grades = { ...Object.fromEntries(all.map((id) => [id, 3])), c02: 1 };
    const again = withMoney(s, 10_000_00, { college: { ...edu(s).college, passed: all, grades } });
    expect(shown(again, 1, 'none').credits).toBe(3);
    expect(offered(again, 'education/enroll').map((a) => a.courses)).toEqual([1]);
  });

  it('charges nothing in a pack without aid', () => {
    const s = beforeFall('aid-free', 0);
    const free = { ...sim.content, get: () => undefined };
    expect(
      billFor({ ...game, fact: () => 0, state: edu(s), content: free } as never, 'college', 4, 'none').charge,
    ).toBe(0);
  });
});
