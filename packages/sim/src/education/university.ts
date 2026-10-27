/**
 * The state university (M4.2 step 1, D149, D150). You apply, and are admitted at odds from your
 * record: a diploma, a GED, or in transfer the college average you carry, less for a conviction
 * and a felony; turned down, you can apply again after the record's days. Admitted, the college
 * credits you have earned come with you, up to the record's most, as the first courses passed and
 * with no grade: a transfer course counts toward the degree, not the average, as at Western. The
 * terms, classes and grades are the college's (college.ts), and the bill is the university's own
 * (aid.ts).
 */
import type { FactView, ModuleContext } from '@eb/core';
import { type CollegeSlice, gpaOf, NO_COLLEGE } from './college.ts';
import type { EducationSlice } from './module.ts';
import { educationOf, type University } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export interface UniversitySlice extends CollegeSlice {
  admitted: boolean;
  /** The day you last applied, or -1. */
  applied: number;
  /** College credits taken in transfer. */
  transferred: number;
}

export const NO_UNIVERSITY = (): UniversitySlice => ({ ...NO_COLLEGE(), admitted: false, applied: -1, transferred: 0 });

export const universityOf = (v: { readonly content: View['content'] }): University | null =>
  educationOf(v.content)?.university ?? null;

/** In 100, your chance of being admitted now: 0 without a diploma or GED, or under the transfer average. */
export function admitChance(v: View, u: University): number {
  const s = slice(v);
  const fromHighSchool = s.finished === 'none' ? 0 : s.finished === 'ged' ? u.admit.ged : u.admit.diploma;
  const transfer = gpaOf(s.college) >= u.admit.gpa ? u.admit.transfer : 0;
  const base = s.college.graded > 0 ? transfer : fromHighSchool;
  if (base === 0) return 0;
  const convicted = ((v.fact('law.convictions') as number | undefined) ?? 0) > 0;
  const felon = ((v.fact('law.felonies') as number | undefined) ?? 0) > 0;
  return Math.max(0, base - (convicted ? u.admit.conviction : 0) - (felon ? u.admit.felony : 0));
}

/** Applying, offered with a chance to be had and the wait since a refusal run. */
export function applyOptions(v: View): Record<string, never>[] {
  const u = universityOf(v);
  const s = slice(v);
  if (!u || s.university.admitted || s.finished === 'bachelor') return [];
  const today = v.fact('time.day') as number;
  if (s.university.applied >= 0 && today - s.university.applied < u.admit.wait) return [];
  return admitChance(v, u) > 0 ? [{}] : [];
}

export function apply(ctx: Ctx): void {
  const u = universityOf(ctx);
  if (!u || applyOptions(ctx).length === 0) ctx.refuse('no-applying');
  const chance = admitChance(ctx, u as University);
  ctx.write().university.applied = ctx.fact('time.day') as number;
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [{ effect: 'admit-result', admitted: true, chance }] },
      { chance: 100 - chance, effects: [{ effect: 'admit-result', admitted: false, chance }] },
    ],
  });
}

/**
 * The college's credits brought over, up to the record's most, as whole courses passed in the
 * catalog's order. Run when admitted and again on enrolling, so credits earned since come too.
 */
export function transferIn(ctx: Ctx): void {
  const u = universityOf(ctx);
  const s = ctx.read();
  if (!u || !s.university.admitted) return;
  const target = Math.min(u.transfer, s.college.credits);
  let moved = s.university.transferred;
  const taken: string[] = [];
  for (const x of u.courses) {
    if (s.university.passed.includes(x.id)) continue;
    if (moved + x.credits > target) break;
    moved += x.credits;
    taken.push(x.id);
  }
  if (taken.length === 0) return;
  const w = ctx.write().university;
  w.passed = [...w.passed, ...taken];
  w.credits += moved - w.transferred;
  w.transferred = moved;
}

/** The answer: admitted or not, and the credits that came with you. */
export function result(ctx: Ctx, admitted: boolean, chance: number): void {
  if (admitted) {
    ctx.write().university.admitted = true;
    transferIn(ctx);
  }
  ctx.emit('admitted', { admitted, chance, transfer: ctx.read().university.transferred });
}
