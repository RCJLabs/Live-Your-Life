/**
 * Nursing (M4.4 step 2, D163). The college's associate's in nursing admits selectively once its
 * prerequisite credits are earned at the college at its average; the university's bachelor's in
 * nursing once two years' university credits are. Each admits at a chance from your average,
 * shown first and rolled as shown; refused, you apply again after the record's days. A program's
 * courses are taken as any school's (college.ts), and finishing one lets you sit the licensing
 * exam, at the first sitting's chance for your program, then a later sitting's; passing it
 * licenses you as a registered nurse.
 */
import type { FactView, ModuleContext } from '@eb/core';
import { gpaOf, NURSING, type Program, programOf } from './college.ts';
import type { ExamSlice } from './emt.ts';
import type { EducationSlice } from './module.ts';
import { educationOf, type Nclex, type NursingProgram } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());
const today = (v: View) => v.fact('time.day') as number;

/** A program's admission so far: admitted, and the day it last refused you (-1 before). */
export interface Admission {
  admitted: boolean;
  applied: number;
}

export const nclexOf = (v: { readonly content: View['content'] }): Nclex | null =>
  educationOf(v.content)?.nclex ?? null;

/** The school a program builds on, as the slice keeps it: the college's record, or the university's. */
const before = (v: View, which: Program) => (which === 'adn' ? slice(v).college : slice(v).university);

/** In 100, the chance a program admits you now: 0 short of its credits or average, more for each tenth above. */
export function nursingChance(v: View, which: Program, p: NursingProgram): number {
  const s = before(v, which);
  if (which === 'bsn' && !slice(v).university.admitted) return 0;
  const gpa = gpaOf(s);
  if (s.credits < p.admit.credits || gpa < p.admit.gpa) return 0;
  return Math.min(p.admit.most, p.admit.chance + Math.floor((gpa - p.admit.gpa) / 10) * p.admit.perTenth);
}

/** The programs open to apply to: with a chance, not admitted or finished, and its days past a refusal. */
export function applyOptions(v: View): { program: Program }[] {
  const s = slice(v);
  return NURSING.filter((which) => {
    const p = programOf(v, which);
    const a = s[which];
    if (!p || a.admitted || s.nursing === which) return false;
    const waited = a.applied === -1 || today(v) - a.applied >= p.admit.wait;
    return waited && nursingChance(v, which, p) > 0;
  }).map((program) => ({ program }));
}

export function apply(ctx: Ctx, program: unknown): void {
  if (!applyOptions(ctx).some((o) => o.program === program)) return void ctx.refuse('no-applying');
  const which = program as Program;
  const chance = nursingChance(ctx, which, programOf(ctx, which) as NursingProgram);
  const effect = (admitted: boolean) => ({ effect: 'nursing-result', program: which, admitted, chance });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [effect(true)] },
      { chance: 100 - chance, effects: [effect(false)] },
    ],
  });
}

export function result(ctx: Ctx, program: Program, admitted: boolean, chance: number): void {
  const a = ctx.write()[program];
  if (admitted) a.admitted = true;
  else a.applied = today(ctx);
  ctx.emit('nursing-admitted', { program, name: (programOf(ctx, program) as NursingProgram).name, admitted, chance });
}

/** In 100, the chance a sitting of the licensing exam passes now: your program's at first, a later sitting's after. */
export function nclexChance(v: View, n: Nclex): number {
  const s = slice(v);
  if (s.nursing === 'none') return 0;
  return s.nclex.tries === 0 ? n[s.nursing] : n.repeat;
}

/** Sitting it: a program finished, not yet licensed, its days past the last sitting, 08:00 to 17:00, its fee in hand. */
export function nclexOptions(v: View): Record<string, never>[] {
  const n = nclexOf(v);
  const s = slice(v);
  if (!n || s.nursing === 'none' || s.nclex.licensed) return [];
  const minute = v.fact('time.of-day') as number;
  const cash = v.fact('economy.amount', { resource: 'cash' }) as number;
  const waited = s.nclex.tries === 0 || today(v) - s.nclex.last >= n.wait;
  return waited && minute >= 8 * 60 && minute < 17 * 60 && cash >= n.price ? [{}] : [];
}

export function sitNclex(ctx: Ctx): void {
  const n = nclexOf(ctx);
  if (!n || nclexOptions(ctx).length === 0) return void ctx.refuse('no-exam');
  const chance = nclexChance(ctx, n);
  ctx.apply({ effect: 'pay-cost', cost: { cash: n.price } });
  const w: ExamSlice = ctx.write().nclex;
  w.tries += 1;
  w.last = today(ctx);
  ctx.apply({ effect: 'wait', minutes: n.minutes });
  const effect = (passed: boolean) => ({ effect: 'nclex-result', passed, chance });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [effect(true)] },
      { chance: 100 - chance, effects: [effect(false)] },
    ],
  });
}

export function nclexResult(ctx: Ctx, passed: boolean, chance: number): void {
  if (passed) ctx.write().nclex.licensed = true;
  ctx.emit('nclex', { passed, chance });
}
