/**
 * Law school (M4.2 step 2, D149, D150). With a bachelor's, or most of one, you sit the LSAT: a score
 * drawn about the record's mean, raised by the hours you studied for it, the best of your sittings
 * kept. You apply at odds from that score and the university's average against the school's
 * medians, less for a conviction and more for a felony. Admitted, the terms and grades are the
 * university's (college.ts); the JD comes at the record's credits. With the JD you sit the bar on
 * its days, at the real first-time pass rate with the study it asks done, and the repeaters' rate
 * after; passing makes you a lawyer.
 */
import type { FactView, ModuleContext } from '@eb/core';
import { MONTHS } from '../calendar.ts';
import { type CollegeSlice, gpaOf, NO_COLLEGE } from './college.ts';
import type { EducationSlice } from './module.ts';
import { educationOf, type LawSchool } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export interface LawSlice extends CollegeSlice {
  admitted: boolean;
  /** The day you last applied, or -1. */
  applied: number;
  /** Your best LSAT score, or -1; the day you last sat it, or -1; minutes studied for it. */
  lsat: number;
  sat: number;
  prep: number;
  /** Minutes studied for the bar, its sittings, and whether you passed. */
  barPrep: number;
  tries: number;
  licensed: boolean;
}

export const NO_LAW = (): LawSlice => ({
  ...NO_COLLEGE(),
  admitted: false,
  applied: -1,
  lsat: -1,
  sat: -1,
  prep: 0,
  barPrep: 0,
  tries: 0,
  licensed: false,
});

export const lawOf = (v: { readonly content: View['content'] }): LawSchool | null =>
  educationOf(v.content)?.law ?? null;

const today = (v: View) => v.fact('time.day') as number;
const cash = (v: View) => v.fact('economy.amount', { resource: 'cash' }) as number;

/** A bachelor's, or within a year of one: when the LSAT is taken. */
function nearDegree(v: View): boolean {
  const s = slice(v);
  const u = educationOf(v.content)?.university;
  return s.finished === 'bachelor' || (u !== undefined && s.university.credits >= u.degree - 30);
}

/** The points study adds to the LSAT. */
export const lsatGain = (l: LawSchool, prep: number): number =>
  Math.min(l.lsat.most, Math.floor(prep / 60 / l.lsat.perHour));

/** The score a sitting falls about now: the mean and what study has added. */
export const expectedLsat = (v: View, l: LawSchool): number => l.lsat.mean + lsatGain(l, slice(v).law.prep);

/** Studying for the LSAT, or for the bar, offered when either is ahead. */
export function prepOptions(v: View): { subject: string; minutes: number }[] {
  const l = lawOf(v);
  const s = slice(v);
  if (!l) return [];
  const out: { subject: string; minutes: number }[] = [];
  if (!s.law.admitted && nearDegree(v)) out.push({ subject: 'lsat', minutes: 60 });
  if (barAhead(v)) out.push({ subject: 'bar', minutes: 60 });
  return out;
}

/** The JD earned or a year from it, and the bar not yet passed. */
function barAhead(v: View): boolean {
  const l = lawOf(v);
  const s = slice(v);
  return l !== null && !s.law.licensed && (s.finished === 'jd' || (s.law.admitted && s.law.credits >= l.degree - 30));
}

/** Study for the LSAT or the bar; false for any other subject. */
export function prep(ctx: Ctx, subject: string, minutes: number): boolean {
  if (!prepOptions(ctx).some((o) => o.subject === subject)) return false;
  const w = ctx.write().law;
  if (subject === 'lsat') w.prep += minutes;
  else w.barPrep += minutes;
  return true;
}

export function lsatOptions(v: View): Record<string, never>[] {
  const l = lawOf(v);
  const s = slice(v);
  if (!l || s.law.admitted || !nearDegree(v) || cash(v) < l.lsat.price) return [];
  if (s.law.sat >= 0 && today(v) - s.law.sat < l.lsat.wait) return [];
  return [{}];
}

/**
 * The LSAT sat: a score about the mean plus study, its spread a standard normal summed from twelve
 * draws (Irwin–Hall), within 120 and 180. The best score is kept, as schools see the highest.
 */
export function sitLsat(ctx: Ctx): void {
  const l = lawOf(ctx);
  if (!l || lsatOptions(ctx).length === 0) ctx.refuse('no-lsat');
  const law = l as LawSchool;
  ctx.apply({ effect: 'pay-cost', cost: { cash: law.lsat.price } });
  ctx.apply({ effect: 'wait', minutes: law.lsat.minutes });
  const rng = ctx.rng('education');
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += rng.int(0, 999);
  // sum − 5,994 is a standard normal in thousandths, near enough.
  const off = Math.floor(((sum - 5994) * law.lsat.spread) / 10000);
  const score = Math.max(120, Math.min(180, expectedLsat(ctx, law) + off));
  const w = ctx.write().law;
  w.lsat = Math.max(w.lsat, score);
  w.sat = today(ctx);
  ctx.emit('lsat', { score });
}

/** In 100, your chance of admission now: 0 without a bachelor's and an LSAT score. */
export function lawChance(v: View, l: LawSchool): number {
  const s = slice(v);
  if (s.finished !== 'bachelor' || s.law.lsat < 0) return 0;
  const tenths = Math.trunc((gpaOf(s.university) - l.admit.gpa) / 10);
  const convicted = ((v.fact('law.convictions') as number | undefined) ?? 0) > 0;
  const felon = ((v.fact('law.felonies') as number | undefined) ?? 0) > 0;
  const raw =
    l.admit.at +
    (s.law.lsat - l.admit.lsat) * l.admit.perPoint +
    tenths * l.admit.perTenth -
    (convicted ? l.admit.conviction : 0) -
    (felon ? l.admit.felony : 0);
  return Math.max(0, Math.min(l.admit.most, raw));
}

export function applyOptions(v: View): Record<string, never>[] {
  const l = lawOf(v);
  const s = slice(v);
  if (!l || s.law.admitted) return [];
  if (s.law.applied >= 0 && today(v) - s.law.applied < l.admit.wait) return [];
  return lawChance(v, l) > 0 ? [{}] : [];
}

export function apply(ctx: Ctx): void {
  const l = lawOf(ctx);
  if (!l || applyOptions(ctx).length === 0) ctx.refuse('no-applying');
  const chance = lawChance(ctx, l as LawSchool);
  ctx.write().law.applied = today(ctx);
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [{ effect: 'law-result', admitted: true, chance }] },
      { chance: 100 - chance, effects: [{ effect: 'law-result', admitted: false, chance }] },
    ],
  });
}

export function result(ctx: Ctx, admitted: boolean, chance: number): void {
  if (admitted) ctx.write().law.admitted = true;
  ctx.emit('law-admitted', { admitted, chance });
}

/** Whether today is a bar exam day, by the calendar. */
function barDay(v: View, l: LawSchool): boolean {
  const month = MONTHS.findIndex((m) => m.id === v.fact('time.month')) + 1;
  const day = v.fact('time.day-of-month') as number;
  return l.bar.days.some((d) => d.month === month && d.day === day);
}

/** The fee for your next sitting. */
export const barFee = (l: LawSchool, s: { readonly tries: number }): number =>
  s.tries === 0 ? l.bar.price : l.bar.again;

/** In 100, your chance of passing the bar: the real rate with the study asked, less in proportion short of it. */
export function barChance(v: View, l: LawSchool): number {
  const s = slice(v).law;
  const rate = s.tries === 0 ? l.bar.first : l.bar.repeat;
  const asked = l.bar.hours * 60;
  const done = asked > 0 ? Math.min(asked, s.barPrep) : 0;
  return asked > 0 ? l.bar.least + Math.floor(((rate - l.bar.least) * done) / asked) : rate;
}

/** The hours a bar day's sitting can begin: from when the doors open to when the exam starts (tune). */
const BAR_OPENS = 7 * 60;
const BAR_CLOSES = 9 * 60;

/** The JD, not yet admitted, the fee in hand, and today a bar day. */
function barToday(v: View): boolean {
  const l = lawOf(v);
  const s = slice(v);
  return l !== null && s.finished === 'jd' && !s.law.licensed && barDay(v, l) && cash(v) >= barFee(l, s.law);
}

/** The bar, offered on its days from 07:00 to 09:00, with the JD and the fee in hand. */
export function barOptions(v: View): Record<string, never>[] {
  const minute = v.fact('time.of-day') as number;
  return barToday(v) && minute >= BAR_OPENS && minute < BAR_CLOSES ? [{}] : [];
}

/**
 * Minutes until the bar's doors open on its day, or undefined: what you do ends then, as it does
 * for a class (life.ts), so the exam isn't slept through.
 */
export function barIn(v: View): number | undefined {
  const minute = v.fact('time.of-day') as number;
  return barToday(v) && minute < BAR_OPENS ? BAR_OPENS - minute : undefined;
}

export function sitBar(ctx: Ctx): void {
  const l = lawOf(ctx);
  if (!l || barOptions(ctx).length === 0) ctx.refuse('no-bar');
  const law = l as LawSchool;
  const chance = barChance(ctx, law);
  ctx.apply({ effect: 'pay-cost', cost: { cash: barFee(law, ctx.read().law) } });
  ctx.apply({ effect: 'wait', minutes: law.bar.minutes });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [{ effect: 'bar-result', passed: true, chance }] },
      { chance: 100 - chance, effects: [{ effect: 'bar-result', passed: false, chance }] },
    ],
  });
}

export function barResult(ctx: Ctx, passed: boolean, chance: number): void {
  const w = ctx.write().law;
  w.tries += 1;
  // A new sitting is studied for anew: the review course again, as repeaters do.
  w.barPrep = 0;
  if (passed) w.licensed = true;
  ctx.emit('bar', { passed, chance });
}
