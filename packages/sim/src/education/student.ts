/**
 * The student bot (M2.8 step 7): a life that works and studies toward an associate's. It lives as
 * the steady bot does; in each enrolling window it takes two courses, six credits, paying cash if
 * it can and borrowing what the bill needs if not; it goes to class when one starts, unless it is
 * on shift (work comes first, as for someone who needs the job); it studies in its free hours in
 * the day; and pays what is behind on its loans. Without a diploma it studies for the GED and sits
 * each test when it has studied a week of evenings for it. It sees only options and facts.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { STAGE_ONLY, steadyFor } from '../bot.ts';

/** Courses a term: half time, as most community college students go (tune). */
export const COURSES = 2;
/** Hours studied for a GED subject before it sits the test (tune). */
const GED_HOURS = 10;
/** Hours a week it studies for each course: two a credit, what a full grade asks (the record's `study`). */
const WEEKLY = 6;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string) => offered.filter((a) => a.type === type);
const level = (turn: Turn, need: string) => turn.fact('life.need', { need }) as number;

/** Enrolling: the courses it takes, by cash if it can, else by a loan for the rest. */
function enroll(offered: readonly Action[]): Action | undefined {
  const ways = of(offered, 'education/enroll');
  const most = Math.max(0, ...ways.map((a) => a.courses as number));
  const n = Math.min(COURSES, most);
  const mine = ways.filter((a) => a.courses === n);
  return mine.find((a) => a.borrow === 'none') ?? mine.find((a) => a.borrow === 'bill');
}

/** Free time in the day, fed and rested enough: when it studies. */
function free(turn: Turn): boolean {
  const minute = turn.fact('time.of-day') as number;
  return (
    turn.fact('job.on-shift') !== true &&
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
  const short = of(offered, 'education/study').filter((a) => (week.get(`${w}/${String(a.subject)}`) ?? 0) < WEEKLY);
  return short[0];
}

export const studentFor = (days: number, name = 'student'): Policy => {
  const steady = steadyFor(days, name);
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
      if (level(turn, 'food') < 15) return steady.choose(turn);
      const pick =
        of(offered, 'education/pay-loan')[0] ??
        of(offered, 'education/attend')[0] ??
        enroll(offered) ??
        ged(turn, offered, studied) ??
        (free(turn) && turn.fact('education.high-school') === true ? course(turn, offered, week) : undefined);
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
