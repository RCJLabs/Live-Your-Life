/**
 * The community college (M2.8 step 3, D111). You enroll in the weeks before a term starts, in up
 * to as many courses as there are slots, taken in the catalog's order. Each meets at its slot
 * through the term's weeks; you go to class (`attend`) and study for it. At the term's end each
 * course is graded on a score, half the share of classes attended and half the study a full grade
 * asks (the record's hours a week a credit), and earns its credits at a D or better. The
 * associate's comes at the record's credits with the grade point average it asks. A term is paid
 * for when you enroll (aid.ts), and a loan's grace runs from the end of a term (loans.ts).
 */
import type { DeepReadonly, FactView, ModuleContext } from '@eb/core';
import { MONTHS, type WEEKDAYS } from '../calendar.ts';
import { aidOf, type Borrow, billFor, payOptions } from './aid.ts';
import { borrow, defer, leftSchool } from './loans.ts';
import type { EducationSlice } from './module.ts';
import { type College, educationOf } from './records.ts';

type Ctx = ModuleContext<EducationSlice>;
type View = FactView<EducationSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

export interface Course {
  readonly id: string;
  /** The slot it meets at. */
  readonly slot: number;
  attended: number;
  /** Minutes studied for it this term. */
  study: number;
}

export interface Term {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly courses: Course[];
}

export interface CollegeSlice {
  term: Term | null;
  /** Credits earned, grade points earned (points × credits), and credits graded. */
  credits: number;
  points: number;
  graded: number;
  /** Courses passed, by id. */
  passed: string[];
  /** The grade points each course was last graded at (step 8): what a retake replaces. */
  grades: Record<string, number>;
}

export const NO_COLLEGE = (): CollegeSlice => ({
  term: null,
  credits: 0,
  points: 0,
  graded: 0,
  passed: [],
  grades: {},
});

/**
 * The courses a term would take, in order: those not yet passed, in the catalog's order, then
 * those passed at a grade the record lets be retaken, the lowest first (step 8).
 */
export function nextCourses(c: College, s: DeepReadonly<CollegeSlice>): College['courses'][number][] {
  const fresh = c.courses.filter((x) => !s.passed.includes(x.id));
  const again = c.courses
    .filter((x) => s.passed.includes(x.id) && (s.grades[x.id] ?? 4) <= (c.retake ?? -1))
    .sort((a, b) => (s.grades[a.id] ?? 0) - (s.grades[b.id] ?? 0));
  return [...fresh, ...again];
}

export const collegeOf = (v: { readonly content: View['content'] }): College | null =>
  educationOf(v.content)?.college ?? null;

const dayOfYear = (month: number, day: number): number =>
  MONTHS.slice(0, month - 1).reduce((n, m) => n + m.days, 0) + day - 1;

/** The next term to start, and the day it does, counted from the life's first day. */
export function nextTerm(v: View, c: College): { id: string; start: number; weeks: number } | null {
  const month = MONTHS.findIndex((m) => m.id === v.fact('time.month')) + 1;
  const today = dayOfYear(month, v.fact('time.day-of-month') as number);
  const day = v.fact('time.day') as number;
  let best: { id: string; start: number; weeks: number } | null = null;
  for (const t of c.terms) {
    const ahead = (((dayOfYear(t.month, t.day) - today) % 365) + 365) % 365;
    const start = day + ahead;
    if (!best || start < best.start) best = { id: t.id, start, weeks: t.weeks };
  }
  return best;
}

/**
 * How many courses you could enroll in now, and how you could pay: none outside the window,
 * enrolled already, or without a diploma; and only the ways the cash you have covers.
 */
export function enrollOptions(v: View): { courses: number; borrow: Borrow }[] {
  const c = collegeOf(v);
  const s = slice(v);
  if (!c || s.college.term || s.finished === 'none' || s.finished === 'associate') return [];
  const t = nextTerm(v, c);
  if (!t || t.start - (v.fact('time.day') as number) > c.enroll) return [];
  const left = nextCourses(c, s.college).length;
  return Array.from({ length: Math.min(c.slots.length, left) }, (_, i) => i + 1).flatMap((courses) =>
    payOptions(v, c, courses).map((borrow) => ({ courses, borrow })),
  );
}

export function enroll(ctx: Ctx, courses: unknown, how: unknown): void {
  const c = collegeOf(ctx);
  if (!c || !enrollOptions(ctx).some((o) => o.courses === courses && o.borrow === how)) ctx.refuse('no-enrolling');
  const college = c as College;
  const t = nextTerm(ctx, college) as { id: string; start: number; weeks: number };
  const s = ctx.read().college;
  const picked = nextCourses(college, s).slice(0, courses as number);
  const bill = billFor(ctx, college, courses as number, how as Borrow);
  if (bill.cash > 0) ctx.apply({ effect: 'pay-cost', cost: { cash: bill.cash } });
  if (bill.refund > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: bill.refund });
  borrow(ctx, bill.borrowed);
  // At half time or more, in school: nothing is due on the loans.
  if (bill.credits >= (aidOf(ctx)?.loans.half ?? Number.POSITIVE_INFINITY)) defer(ctx);
  ctx.write().college.term = {
    id: t.id,
    start: t.start,
    end: t.start + t.weeks * 7,
    courses: picked.map((x, slot) => ({ id: x.id, slot, attended: 0, study: 0 })),
  };
  ctx.emit('enrolled', { term: t.id, courses: picked.length, start: t.start });
  const { credits: _c, ...paid } = bill;
  ctx.emit('billed', paid);
}

/** The course meeting now, if a class of yours starts within the quarter hour. */
function meetingNow(v: View, c: College): Course | undefined {
  const term = slice(v).college.term;
  const day = v.fact('time.day') as number;
  // The college is closed on a holiday (D132): no class meets.
  if (!term || day < term.start || day >= term.end || v.fact('season.holiday') === true) return undefined;
  const weekday = v.fact('time.weekday') as (typeof WEEKDAYS)[number];
  const minute = v.fact('time.of-day') as number;
  return term.courses.find((x) => {
    const slot = c.slots[x.slot];
    return slot?.days.includes(weekday) && minute >= slot.hour * 60 && minute < slot.hour * 60 + 15;
  });
}

/**
 * Minutes until a class of yours starts later today, or undefined: what you do ends then, as it
 * does for a shift (life.ts), so the class isn't slept or idled through.
 */
export function classIn(v: View): number | undefined {
  const c = collegeOf(v);
  const term = slice(v).college.term;
  const day = v.fact('time.day') as number;
  if (!c || !term || day < term.start || day >= term.end || v.fact('season.holiday') === true) return undefined;
  const weekday = v.fact('time.weekday') as (typeof WEEKDAYS)[number];
  const minute = v.fact('time.of-day') as number;
  const starts = term.courses
    .map((x) => c.slots[x.slot])
    .filter((slot) => slot?.days.includes(weekday))
    .map((slot) => (slot?.hour ?? 0) * 60 - minute)
    .filter((m) => m > 0);
  return starts.length > 0 ? Math.min(...starts) : undefined;
}

export function attendOptions(v: View): { course: string }[] {
  const c = collegeOf(v);
  const x = c ? meetingNow(v, c) : undefined;
  return x ? [{ course: x.id }] : [];
}

export function attend(ctx: Ctx, course: unknown): void {
  const c = collegeOf(ctx);
  const x = c ? meetingNow(ctx, c) : undefined;
  if (!c || !x || x.id !== course) ctx.refuse('no-class');
  const slot = (c as College).slots[(x as Course).slot] as College['slots'][number];
  const minutes = slot.hour * 60 + slot.minutes - (ctx.fact('time.of-day') as number);
  const term = ctx.write().college.term as Term;
  const mine = term.courses.find((y) => y.id === course) as Course;
  mine.attended++;
  ctx.apply({ effect: 'wait', minutes });
  ctx.emit('attended', { course: mine.id });
}

/** Study for a course in the term (the GED's study takes a subject instead, ged.ts). */
export function studyCourse(ctx: Ctx, course: string, minutes: number): boolean {
  const term = ctx.read().college.term;
  if (!term?.courses.some((x) => x.id === course)) return false;
  const w = ctx.write().college.term as Term;
  (w.courses.find((x) => x.id === course) as Course).study += minutes;
  return true;
}

/** Meetings in a term: each slot day, each week. */
export const meetings = (c: College, x: Readonly<Course>, t: DeepReadonly<Term>): number =>
  ((c.slots[x.slot]?.days.length ?? 0) * (t.end - t.start)) / 7;

/** A course's score in 100: half attendance, half the study a full grade asks. */
export function score(c: College, x: Readonly<Course>, t: DeepReadonly<Term>): number {
  const credits = c.courses.find((y) => y.id === x.id)?.credits ?? 0;
  const asked = c.study * credits * ((t.end - t.start) / 7) * 60;
  const met = meetings(c, x, t);
  const a = met > 0 ? Math.min(1, x.attended / met) : 0;
  const s = asked > 0 ? Math.min(1, x.study / asked) : 1;
  return Math.floor(50 * a + 50 * s);
}

/** The term's end: each course graded, credits earned, and the associate's at the record's mark. */
export function endTerm(ctx: Ctx): void {
  const c = collegeOf(ctx);
  const term = ctx.read().college.term;
  if (!c || !term || (ctx.fact('time.day') as number) < term.end) return;
  const w = ctx.write();
  for (const x of term.courses) {
    const credits = c.courses.find((y) => y.id === x.id)?.credits ?? 0;
    const sc = score(c, x, term);
    const grade = c.grades.find((g) => sc >= g.least) ?? (c.grades[c.grades.length - 1] as College['grades'][number]);
    // A retake (step 8): the better of the two grades counts, as at Macomb; the other leaves the
    // average, and its credits with it.
    const before = w.college.grades[x.id];
    if (before !== undefined) {
      w.college.graded -= credits;
      w.college.points -= before * credits;
      if (before > 0) w.college.credits -= credits;
    }
    const kept = Math.max(before ?? 0, grade.points);
    w.college.passed = w.college.passed.filter((id) => id !== x.id);
    w.college.graded += credits;
    w.college.points += kept * credits;
    w.college.grades = { ...w.college.grades, [x.id]: kept };
    if (kept > 0) {
      w.college.credits += credits;
      w.college.passed = [...w.college.passed, x.id];
    }
    ctx.emit('graded', { course: x.id, grade: grade.letter, score: sc });
  }
  w.college.term = null;
  leftSchool(ctx, term.end);
  const gpa = w.college.graded > 0 ? Math.floor((w.college.points * 100) / w.college.graded) : 0;
  if (w.college.credits >= c.associate && gpa >= c.gpa) {
    w.finished = 'associate';
    ctx.emit('earned', { credential: 'associate' });
  }
}
