/**
 * The national EMT exam (M4.4 step 1, D163). With the college's EMT certificate (college.ts), you
 * sit it on a weekday's working hours for its fee, at the first sitting's chance and then the
 * repeat's, the record's days apart; passing it licenses you to work as an EMT. Every chance is
 * shown first and rolled as shown.
 */
import type { FactView, ModuleContext } from '@eb/core';
import { certified, emtOf } from './college.ts';
import type { EducationSlice } from './module.ts';
import type { EmtCourse } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export interface ExamSlice {
  /** Sittings so far, and the day of the last; -1 before any. */
  tries: number;
  last: number;
  licensed: boolean;
}

export const NO_EXAM = (): ExamSlice => ({ tries: 0, last: -1, licensed: false });

/** In 100, the chance a sitting now passes: the first's, then the repeat's. */
export const examChance = (v: View, c: EmtCourse): number =>
  slice(v).nremt.tries === 0 ? c.exam.first : c.exam.repeat;

/** Sitting the exam: certified, not yet licensed, its days past the last sitting, 08:00 to 17:00, its fee in hand. */
export function examOptions(v: View): Record<string, never>[] {
  const c = emtOf(v);
  const s = slice(v).nremt;
  if (!c || s.licensed || !certified(v)) return [];
  const today = v.fact('time.day') as number;
  const minute = v.fact('time.of-day') as number;
  const cash = v.fact('economy.amount', { resource: 'cash' }) as number;
  const waited = s.tries === 0 || today - s.last >= c.exam.wait;
  return waited && minute >= 8 * 60 && minute < 17 * 60 && cash >= c.exam.price ? [{}] : [];
}

export function sitExam(ctx: Ctx): void {
  const c = emtOf(ctx);
  if (!c || examOptions(ctx).length === 0) return void ctx.refuse('no-exam');
  const chance = examChance(ctx, c);
  ctx.apply({ effect: 'pay-cost', cost: { cash: c.exam.price } });
  const w = ctx.write().nremt;
  w.tries += 1;
  w.last = ctx.fact('time.day') as number;
  ctx.apply({ effect: 'wait', minutes: c.exam.minutes });
  const effect = (passed: boolean) => ({ effect: 'nremt-result', passed, chance });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [effect(true)] },
      { chance: 100 - chance, effects: [effect(false)] },
    ],
  });
}

export function examResult(ctx: Ctx, passed: boolean, chance: number): void {
  if (passed) ctx.write().nremt.licensed = true;
  ctx.emit('nremt', { passed, chance });
}
