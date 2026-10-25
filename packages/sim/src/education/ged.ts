/**
 * The GED (M2.8 step 2, D111): four subject tests at a test centre, each at its price, each
 * passed at its chance: the share of those who sit it who pass, raised by the hours you studied
 * for it, up to the record's most (tune). The chance shown is the chance rolled, from `gedChance`.
 * Passing all four is the GED, a diploma's equal to most employers.
 */
import type { FactView, ModuleContext } from '@eb/core';
import type { EducationSlice } from './module.ts';
import { type EducationRecord, educationOf, type GedSubject } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export const subjectOf = (r: EducationRecord, id: string): GedSubject | undefined =>
  r.ged.subjects.find((s) => s.id === id);

/** The chance of passing a subject now, in whole percent. */
export function gedChance(v: View, r: EducationRecord, s: GedSubject): number {
  const minutes = slice(v).ged.prep[s.id] ?? 0;
  return Math.min(r.ged.most, s.pass + Math.floor(((minutes / 60) | 0) * r.ged.perHour));
}

/** Whether the GED is yours to work for, and this subject still to pass. */
const open = (v: View, id: string): boolean => slice(v).finished === 'none' && !slice(v).ged.passed.includes(id);

/** A weekday in the test centre's hours. */
function centreOpen(v: View, r: EducationRecord): boolean {
  const hour = Math.floor((v.fact('time.of-day') as number) / 60);
  const day = v.fact('time.weekday') as string;
  return day !== 'saturday' && day !== 'sunday' && hour >= r.ged.opens && hour < r.ged.closes;
}

/** The subjects you could study for now. */
export function studyOptions(v: View): { subject: string; minutes: number }[] {
  const r = educationOf(v.content);
  if (!r) return [];
  return r.ged.subjects.filter((s) => open(v, s.id)).map((s) => ({ subject: s.id, minutes: 60 }));
}

/** The tests you could sit now: the centre open, the price in hand. */
export function testOptions(v: View): { subject: string }[] {
  const r = educationOf(v.content);
  if (!r || !centreOpen(v, r)) return [];
  const cash = v.fact('economy.amount', { resource: 'cash' }) as number;
  if (cash < r.ged.price) return [];
  return r.ged.subjects.filter((s) => open(v, s.id)).map((s) => ({ subject: s.id }));
}

export function study(ctx: Ctx, subject: unknown, minutes: unknown): void {
  const r = educationOf(ctx.content);
  if (!r || typeof subject !== 'string' || !subjectOf(r, subject) || !open(ctx, subject)) ctx.refuse('no-subject');
  if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes < 15 || minutes > 480)
    ctx.refuse('bad-minutes');
  const w = ctx.write();
  w.ged.prep = { ...w.ged.prep, [subject]: (w.ged.prep[subject] ?? 0) + minutes };
  ctx.apply({ effect: 'wait', minutes });
  ctx.emit('studied', { subject, minutes });
}

export function sit(ctx: Ctx, subject: unknown): void {
  const r = educationOf(ctx.content);
  const s = r && typeof subject === 'string' ? subjectOf(r, subject) : undefined;
  if (!r || !s || !testOptions(ctx).some((o) => o.subject === s.id)) ctx.refuse('no-test');
  const chance = gedChance(ctx, r, s);
  ctx.apply({ effect: 'pay-cost', cost: { cash: r.ged.price } });
  ctx.apply({ effect: 'wait', minutes: s.minutes });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [{ effect: 'ged-result', subject: s.id, passed: true, chance }] },
      { chance: 100 - chance, effects: [{ effect: 'ged-result', subject: s.id, passed: false, chance }] },
    ],
  });
}

/** A test's result: a subject passed, and the GED once all of them are. */
export function result(ctx: Ctx, subject: string, passed: boolean, chance: number): void {
  const r = educationOf(ctx.content) as EducationRecord;
  ctx.emit('sat', { subject, passed, chance });
  if (!passed) return;
  const w = ctx.write();
  w.ged.passed = [...w.ged.passed, subject];
  if (r.ged.subjects.every((s) => w.ged.passed.includes(s.id))) {
    w.finished = 'ged';
    ctx.emit('earned', { credential: 'ged' });
  }
}
