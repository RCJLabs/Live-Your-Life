/**
 * The student bot (M2.8 step 7): a life that works and studies toward an associate's. It lives as
 * the steady bot does; in each enrolling window it takes two courses, six credits, paying cash if
 * it can and borrowing what the bill needs if not; it goes to class when one starts, unless it is
 * on shift (work comes first, as for someone who needs the job); it studies in its free hours in
 * the day; and pays what is behind on its loans. Without a diploma it studies for the GED and sits
 * each test when it has studied a week of evenings for it. It sees only options and facts.
 *
 * Past the associate's (M4.2 step 5): it applies to the university when it can, then with a
 * bachelor's studies for the LSAT and sits it, applies to law school, and with the JD studies the
 * bar's hours and sits it on its day. At each school it takes `courses` a term, the newest school
 * first.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { STAGE_ONLY, seekerFor, steadyFor } from '../bot.ts';

/** Courses a term: half time, as most community college students go (tune). */
export const COURSES = 2;
/** Hours studied for a GED subject before it sits the test (tune). */
const GED_HOURS = 10;
/** Hours a week it studies for each course: two a credit, what a full grade asks (the record's `study`). */
const WEEKLY = 6;
/** Hours it studies for the LSAT before it sits it: ten points' worth (tune), and for the bar, what it asks. */
const LSAT_HOURS = 50;
const BAR_HOURS = 400;
/** What study is for besides courses and the GED (law.ts). */
const AHEAD = new Set(['lsat', 'bar']);

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string) => offered.filter((a) => a.type === type);
const level = (turn: Turn, need: string) => turn.fact('life.need', { need }) as number;

/** Enrolling: the newest school's courses, by cash if it can, else by a loan for the rest. */
function enroll(offered: readonly Action[], courses: number): Action | undefined {
  const all = of(offered, 'education/enroll');
  const school = ['law', 'university', undefined].find((x) => all.some((a) => a.school === x));
  const ways = all.filter((a) => a.school === school);
  const most = Math.max(0, ...ways.map((a) => a.courses as number));
  const n = Math.min(courses, most);
  const mine = ways.filter((a) => a.courses === n);
  // At the university and law school it borrows the most, living on what's paid past the bill, as
  // most there do; at the college, only what the bill needs.
  if (school) return mine.find((a) => a.borrow === 'most') ?? mine.find((a) => a.borrow === 'bill') ?? mine[0];
  return mine.find((a) => a.borrow === 'none') ?? mine.find((a) => a.borrow === 'bill');
}

/** Free time in the day, fed and rested enough: when it studies. */
function free(turn: Turn): boolean {
  const minute = turn.fact('time.of-day') as number;
  // An hour's study runs its hour: not begun with a class starting inside it.
  const classIn = turn.fact('education.class-in') as number | undefined;
  return (
    turn.fact('job.on-shift') !== true &&
    (classIn === undefined || classIn >= 60) &&
    minute >= 9 * 60 &&
    minute < 21 * 60 &&
    level(turn, 'food') >= 30 &&
    level(turn, 'rest') >= 30 &&
    level(turn, turn.fact('life.lowest') as string) >= 25
  );
}

/** The GED: a test sat once its subject has had its hours; otherwise study for one. */
function ged(turn: Turn, offered: readonly Action[], studied: Map<string, number>): Action | undefined {
  if (turn.fact('education.high-school') === true) return undefined;
  const sit = of(offered, 'education/take-test').find((a) => (studied.get(a.subject as string) ?? 0) >= GED_HOURS);
  if (sit) return sit;
  const study = of(offered, 'education/study');
  return free(turn) && study.length > 0 ? turn.rng.pick(study) : undefined;
}

/** A course of this term still short of its week's hours, if any. */
function course(turn: Turn, offered: readonly Action[], week: Map<string, number>): Action | undefined {
  const w = Math.floor((turn.fact('time.day') as number) / 7);
  const short = of(offered, 'education/study').filter(
    (a) => !AHEAD.has(a.subject as string) && (week.get(`${w}/${String(a.subject)}`) ?? 0) < WEEKLY,
  );
  return short[0];
}

/** Past the associate's: applying, the LSAT studied for and sat, and the bar studied for and sat. */
function ahead(turn: Turn, offered: readonly Action[], studied: Map<string, number>): Action | undefined {
  // The college's associate's first, then the university in transfer; law school with a bachelor's.
  const university = turn.fact('education.finished') === 'associate' ? of(offered, 'education/apply')[0] : undefined;
  const apply = university ?? of(offered, 'education/apply-law')[0];
  if (apply) return apply;
  const lsat = of(offered, 'education/take-lsat')[0];
  if (lsat && (studied.get('lsat') ?? 0) >= LSAT_HOURS && (turn.fact('education.lsat') as number) < 0) return lsat;
  const bar = of(offered, 'education/sit-bar')[0];
  if (bar && (studied.get('bar') ?? 0) >= BAR_HOURS) return bar;
  if (!free(turn)) return undefined;
  const hours = { lsat: LSAT_HOURS, bar: BAR_HOURS } as const;
  return of(offered, 'education/study').find(
    (a) =>
      AHEAD.has(a.subject as string) && (studied.get(a.subject as string) ?? 0) < hours[a.subject as 'lsat' | 'bar'],
  );
}

/** Admitted to the university or law school and not through it: a student, not a job-seeker. */
const studying = (turn: Turn): boolean => {
  const finished = turn.fact('education.finished') as string;
  return (
    (turn.fact('education.admitted') === true && finished !== 'bachelor' && finished !== 'jd') ||
    (turn.fact('education.law-admitted') === true && finished !== 'jd')
  );
};

export const studentFor = (days: number, name = 'student', courses = COURSES): Policy => {
  // Steady; and once through school, looking for work if it was let go for the shifts its
  // classes cost it: the bar's fee and a life after school ask for a job. A job found during a
  // degree's terms would cost it classes again.
  const settled = steadyFor(days, name);
  const seeker = seekerFor(days, name);
  const steady: Policy = { name, choose: (turn) => (studying(turn) ? settled : seeker).choose(turn) };
  // Hours studied for each GED subject: the bot's own count, as a player keeps one.
  const studied = new Map<string, number>();
  // Hours studied for each course in each week, so a week's study stops at what a grade asks.
  const week = new Map<string, number>();
  return {
    name,
    choose(turn) {
      if ((turn.fact('time.day') as number) >= days) return null;
      if (turn.mode.id !== 'world') return steady.choose(turn);
      const offered = playable(turn);
      const work = offered.find((a) => a.type === 'life/do' && a.activity === 'work');
      if (work) return work;
      // Enrolling comes before a meal: a term the window closes on is a half year lost, and at a
      // degree school what the loans pay past the bill is what it eats on.
      const term = enroll(offered, courses);
      if (term) return term;
      if (level(turn, 'food') < 15) return steady.choose(turn);
      const pick =
        of(offered, 'education/pay-loan')[0] ??
        of(offered, 'education/attend')[0] ??
        ged(turn, offered, studied) ??
        (free(turn) && turn.fact('education.high-school') === true ? course(turn, offered, week) : undefined) ??
        ahead(turn, offered, studied);
      // A sitting of the bar is studied for anew, as the sim counts it (law.ts).
      if (pick?.type === 'education/sit-bar') studied.set('bar', 0);
      if (pick?.type === 'education/study') {
        const id = pick.subject as string;
        studied.set(id, (studied.get(id) ?? 0) + 1);
        const key = `${Math.floor((turn.fact('time.day') as number) / 7)}/${id}`;
        week.set(key, (week.get(key) ?? 0) + 1);
      }
      return pick ?? steady.choose(turn);
    },
  };
};
