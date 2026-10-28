/**
 * The community college (M2.8 step 3, D111), and the university the same way (M4.2, D149). You enroll in the weeks before a term starts, in up
 * to as many courses as there are slots, taken in the catalog's order. Each meets at its slot
 * through the term's weeks; you go to class (`attend`) and study for it. At the term's end each
 * course is graded on a score, half the share of classes attended and half the study a full grade
 * asks (the record's hours a week a credit), and earns its credits at a D or better. The
 * associate's comes at the record's credits with the grade point average it asks. A term is paid
 * for when you enroll (aid.ts), and a loan's grace runs from the end of a term (loans.ts). The
 * university's bachelor's comes at its record's credits; you are enrolled at one school at a time.
 */
import type { DeepReadonly, FactView, ModuleContext } from '@eb/core';
import { MONTHS, type WEEKDAYS } from '../calendar.ts';
import { aidOf, type Borrow, billFor, payOptions } from './aid.ts';
import { lawOf } from './law.ts';
import { borrow, defer, leftSchool } from './loans.ts';
import type { EducationSlice } from './module.ts';
import {
  type College,
  type EmtCourse,
  educationOf,
  type LawSchool,
  type NursingProgram,
  type University,
} from './records.ts';
import { transferIn, universityOf } from './university.ts';

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
  /** Taken by evening (M4.2, D152): its courses meet at the school's evening slots. */
  readonly evening: boolean;
}

/** The slots a term's courses meet at: the school's evening ones for an evening term. */
export const slotsOf = (c: Catalog, t: { readonly evening?: boolean }): Catalog['slots'] =>
  t.evening && 'evening' in c && c.evening ? c.evening : c.slots;

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

/**
 * The schools, by their slice's key: the EMT course (M4.4, D163) is the college's, kept apart; the
 * nursing programs (M4.4 step 2) the college's associate's and the university's bachelor's.
 */
export type Which = 'college' | 'university' | 'law' | 'emt' | 'adn' | 'bsn';
export const SCHOOLS: readonly Which[] = ['college', 'university', 'law', 'emt', 'adn', 'bsn'];
/** The nursing programs among them. */
export const NURSING = ['adn', 'bsn'] as const;
export type Program = (typeof NURSING)[number];
export type Catalog = College | University | LawSchool | EmtCourse | NursingProgram;

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
export function nextCourses(c: Catalog, s: DeepReadonly<CollegeSlice>): Catalog['courses'][number][] {
  const fresh = c.courses.filter((x) => !s.passed.includes(x.id));
  const again = c.courses
    .filter((x) => s.passed.includes(x.id) && (s.grades[x.id] ?? 4) <= (c.retake ?? -1))
    .sort((a, b) => (s.grades[a.id] ?? 0) - (s.grades[b.id] ?? 0));
  return [...fresh, ...again];
}

export const collegeOf = (v: { readonly content: View['content'] }): College | null =>
  educationOf(v.content)?.college ?? null;

export const emtOf = (v: { readonly content: View['content'] }): EmtCourse | null =>
  educationOf(v.content)?.emt ?? null;

export const programOf = (v: { readonly content: View['content'] }, which: Program): NursingProgram | null =>
  educationOf(v.content)?.[which] ?? null;

export function schoolOf(v: { readonly content: View['content'] }, which: Which): Catalog | null {
  if (which === 'college') return collegeOf(v);
  if (which === 'university') return universityOf(v);
  if (which === 'adn' || which === 'bsn') return programOf(v, which);
  return which === 'law' ? lawOf(v) : emtOf(v);
}

/** The school you are enrolled at and its term, if either. */
export function enrolledAt(v: View): { which: Which; c: Catalog; term: DeepReadonly<Term> } | null {
  for (const which of SCHOOLS) {
    const term = slice(v)[which].term;
    const c = schoolOf(v, which);
    if (term && c) return { which, c, term };
  }
  return null;
}

const dayOfYear = (month: number, day: number): number =>
  MONTHS.slice(0, month - 1).reduce((n, m) => n + m.days, 0) + day - 1;

/** The next term to start, and the day it does, counted from the life's first day. */
export function nextTerm(v: View, c: Catalog): { id: string; start: number; weeks: number } | null {
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

export type Enrolling = {
  readonly courses: number;
  readonly borrow: Borrow;
  /** Only the university's, law school's and the EMT course's: a college option keeps the shape it had before (D149). */
  readonly school?: 'university' | 'law' | 'emt' | Program;
  /** By evening (D152), where the school has evening sections; absent, by day. */
  readonly evening?: true;
};

/**
 * Whether you could enroll at a school at all: a diploma or GED for the college; any schooling
 * past high school, and the certificate not yet earned, for the EMT course; admitted, and not
 * through it, for the others.
 */
function open(v: View, which: Which): boolean {
  const s = slice(v);
  if (which === 'college') return s.finished === 'diploma' || s.finished === 'ged';
  if (which === 'emt') return s.finished !== 'none' && !certified(v);
  // A nursing program: admitted, and not yet finished (nursing.ts).
  if (which === 'adn' || which === 'bsn') return s[which].admitted && s.nursing !== which;
  if (which === 'university') return s.university.admitted && s.finished !== 'bachelor' && s.finished !== 'jd';
  return s.law.admitted && s.finished !== 'jd';
}

/**
 * How many courses you could enroll in now, and how you could pay: none outside the window,
 * enrolled already at either school, or without a diploma; and only the ways the cash you have covers.
 */
export function enrollOptions(v: View): Enrolling[] {
  const s = slice(v);
  if (SCHOOLS.some((which) => s[which].term)) return [];
  return SCHOOLS.flatMap((which) => {
    const c = schoolOf(v, which);
    if (!c || !open(v, which)) return [];
    const t = nextTerm(v, c);
    if (!t || t.start - (v.fact('time.day') as number) > c.enroll) return [];
    const left = nextCourses(c, s[which]).length;
    const school = which === 'college' ? {} : { school: which };
    const sections: { evening?: true; slots: number }[] = [{ slots: c.slots.length }];
    if ('evening' in c && c.evening) sections.push({ evening: true, slots: c.evening.length });
    return sections.flatMap(({ slots, ...evening }) =>
      Array.from({ length: Math.min(slots, left) }, (_, i) => i + 1).flatMap((courses) =>
        payOptions(v, which, courses).map((borrow) => ({ courses, borrow, ...school, ...evening })),
      ),
    );
  });
}

export function enroll(ctx: Ctx, courses: unknown, how: unknown, school: unknown, evening: unknown): void {
  const which: Which = SCHOOLS.includes(school as Which) ? (school as Which) : 'college';
  const offered = enrollOptions(ctx).some(
    (o) =>
      o.courses === courses &&
      o.borrow === how &&
      o.school === (school as string | undefined) &&
      o.evening === (evening as true | undefined),
  );
  const c = schoolOf(ctx, which);
  if (!c || !offered) ctx.refuse('no-enrolling');
  const catalog = c as Catalog;
  if (which === 'university') transferIn(ctx);
  const t = nextTerm(ctx, catalog) as { id: string; start: number; weeks: number };
  const picked = nextCourses(catalog, ctx.read()[which]).slice(0, courses as number);
  const bill = billFor(ctx, which, courses as number, how as Borrow);
  if (bill.cash > 0) ctx.apply({ effect: 'pay-cost', cost: { cash: bill.cash } });
  if (bill.refund > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: bill.refund });
  borrow(ctx, bill.borrowed, which === 'law' ? 'grad' : 'loan');
  // At half time or more, in school: nothing is due on the loans.
  if (bill.credits >= (aidOf(ctx)?.loans.half ?? Number.POSITIVE_INFINITY)) defer(ctx);
  ctx.write()[which].term = {
    id: t.id,
    start: t.start,
    end: t.start + t.weeks * 7,
    courses: picked.map((x, slot) => ({ id: x.id, slot, attended: 0, study: 0 })),
    evening: evening === true,
  };
  ctx.emit('enrolled', { term: t.id, courses: picked.length, start: t.start, school: which });
  const { credits: _c, ...paid } = bill;
  ctx.emit('billed', paid);
}

/** The course meeting now, if a class of yours starts within the quarter hour. */
function meetingNow(v: View): DeepReadonly<Course> | undefined {
  const at = enrolledAt(v);
  const day = v.fact('time.day') as number;
  // The schools are closed on a holiday (D132): no class meets.
  if (!at || day < at.term.start || day >= at.term.end || v.fact('season.holiday') === true) return undefined;
  const weekday = v.fact('time.weekday') as (typeof WEEKDAYS)[number];
  const minute = v.fact('time.of-day') as number;
  return at.term.courses.find((x) => {
    const slot = slotsOf(at.c, at.term)[x.slot];
    return slot?.days.includes(weekday) && minute >= slot.hour * 60 && minute < slot.hour * 60 + 15;
  });
}

/**
 * Minutes until a class of yours starts later today, or undefined: what you do ends then, as it
 * does for a shift (life.ts), so the class isn't slept or idled through.
 */
export function classIn(v: View): number | undefined {
  const at = enrolledAt(v);
  const day = v.fact('time.day') as number;
  if (!at || day < at.term.start || day >= at.term.end || v.fact('season.holiday') === true) return undefined;
  const weekday = v.fact('time.weekday') as (typeof WEEKDAYS)[number];
  const minute = v.fact('time.of-day') as number;
  const starts = at.term.courses
    .map((x) => slotsOf(at.c, at.term)[x.slot])
    .filter((slot) => slot?.days.includes(weekday))
    .map((slot) => (slot?.hour ?? 0) * 60 - minute)
    .filter((m) => m > 0);
  return starts.length > 0 ? Math.min(...starts) : undefined;
}

export function attendOptions(v: View): { course: string }[] {
  const x = meetingNow(v);
  return x ? [{ course: x.id }] : [];
}

export function attend(ctx: Ctx, course: unknown): void {
  const at = enrolledAt(ctx);
  const x = meetingNow(ctx);
  if (!at || !x || x.id !== course) ctx.refuse('no-class');
  const { which, c, term: now } = at as NonNullable<typeof at>;
  const slot = slotsOf(c, now)[(x as Course).slot] as College['slots'][number];
  const minutes = slot.hour * 60 + slot.minutes - (ctx.fact('time.of-day') as number);
  const term = ctx.write()[which].term as Term;
  const mine = term.courses.find((y) => y.id === course) as Course;
  mine.attended++;
  ctx.apply({ effect: 'wait', minutes });
  ctx.emit('attended', { course: mine.id });
}

/** Study for a course in the term (the GED's study takes a subject instead, ged.ts). */
export function studyCourse(ctx: Ctx, course: string, minutes: number): boolean {
  const at = enrolledAt(ctx);
  if (!at?.term.courses.some((x) => x.id === course)) return false;
  const w = ctx.write()[at.which].term as Term;
  (w.courses.find((x) => x.id === course) as Course).study += minutes;
  return true;
}

/** Meetings in a term: each slot day, each week. */
export const meetings = (c: Catalog, x: Readonly<Course>, t: DeepReadonly<Term>): number =>
  ((slotsOf(c, t)[x.slot]?.days.length ?? 0) * (t.end - t.start)) / 7;

/** A course's score in 100: half attendance, half the study a full grade asks. */
export function score(c: Catalog, x: Readonly<Course>, t: DeepReadonly<Term>): number {
  const credits = c.courses.find((y) => y.id === x.id)?.credits ?? 0;
  const asked = c.study * credits * ((t.end - t.start) / 7) * 60;
  const met = meetings(c, x, t);
  const a = met > 0 ? Math.min(1, x.attended / met) : 0;
  const s = asked > 0 ? Math.min(1, x.study / asked) : 1;
  return Math.floor(50 * a + 50 * s);
}

/** A school's grade point average in hundredths; 0 before anything is graded. */
export const gpaOf = (s: DeepReadonly<CollegeSlice>): number =>
  s.graded > 0 ? Math.floor((s.points * 100) / s.graded) : 0;

/** Each course of a term graded, and its credits earned at a D or better. */
function grade(ctx: Ctx, which: Which, c: Catalog, term: DeepReadonly<Term>): void {
  const w = ctx.write()[which];
  for (const x of term.courses) {
    const credits = c.courses.find((y) => y.id === x.id)?.credits ?? 0;
    const sc = score(c, x, term);
    const grade = c.grades.find((g) => sc >= g.least) ?? (c.grades[c.grades.length - 1] as College['grades'][number]);
    // A retake (step 8): the better of the two grades counts, as at Macomb; the other leaves the
    // average, and its credits with it.
    const before = w.grades[x.id];
    if (before !== undefined) {
      w.graded -= credits;
      w.points -= before * credits;
      if (before > 0) w.credits -= credits;
    }
    const kept = Math.max(before ?? 0, grade.points);
    w.passed = w.passed.filter((id) => id !== x.id);
    w.graded += credits;
    w.points += kept * credits;
    w.grades = { ...w.grades, [x.id]: kept };
    if (kept > 0) {
      w.credits += credits;
      w.passed = [...w.passed, x.id];
    }
    ctx.emit('graded', { course: x.id, grade: grade.letter, score: sc });
  }
  w.term = null;
}

/** The EMT certificate earned (M4.4): its credits at its average. */
export function certified(v: View): boolean {
  const c = emtOf(v);
  const s = slice(v).emt;
  return c !== null && s.credits >= c.certificate && gpaOf(s) >= c.gpa;
}

/** The credential each degree school's last credit gives, and the ones it does not replace. */
const EARNS: Record<
  Exclude<Which, 'emt'>,
  { credential: 'associate' | 'bachelor' | 'jd'; above: readonly string[] }
> = {
  college: { credential: 'associate', above: ['associate', 'bachelor', 'jd'] },
  adn: { credential: 'associate', above: ['associate', 'bachelor', 'jd'] },
  bsn: { credential: 'bachelor', above: ['bachelor', 'jd'] },
  university: { credential: 'bachelor', above: ['bachelor', 'jd'] },
  law: { credential: 'jd', above: ['jd'] },
};

/** The term's end: graded, and the associate's, the bachelor's or the JD at the record's mark. */
export function endTerm(ctx: Ctx): void {
  const at = enrolledAt(ctx);
  if (!at || (ctx.fact('time.day') as number) < at.term.end) return;
  const { which, c, term } = at;
  grade(ctx, which, c, term);
  leftSchool(ctx, term.end);
  // The EMT certificate changes no schooling: it lets you sit the national exam (emt.ts).
  if (which === 'emt') {
    if (certified(ctx)) ctx.emit('certified', {});
    return;
  }
  const done = ctx.read()[which];
  const needs = 'associate' in c ? c.associate : 'degree' in c ? c.degree : Number.POSITIVE_INFINITY;
  const through = done.credits >= needs && gpaOf(done) >= c.gpa;
  // A nursing program finished lets you sit the licensing exam, whatever schooling it adds (nursing.ts).
  if ((which === 'adn' || which === 'bsn') && through && ctx.read().nursing !== which) {
    ctx.write().nursing = which;
    ctx.emit('nursed', { program: which, name: c.name });
  }
  const { credential, above } = EARNS[which];
  if (!above.includes(ctx.read().finished) && through) {
    ctx.write().finished = credential;
    ctx.emit('earned', { credential });
  }
}
