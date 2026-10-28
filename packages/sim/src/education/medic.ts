/**
 * The medic bots (M4.4 step 5, D163): a life with a diploma that goes into medicine. It lives as
 * the steady bot does. The nursing student takes the college's prerequisites two courses a term,
 * applies to the college's nursing program once it can, takes the program's courses, sits the
 * licensing exam, and applies only to registered nurses' openings until it is hired as one. The
 * EMT takes the EMT course in one term, sits the national exam, and applies to the ambulance
 * services. Each signs up for no shift that meets one of its classes, goes to class when one
 * starts, studies a course's week of hours in its free time, and then works the shifts, taking
 * an event's certain choice where it has one. It sees only options and facts.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { SEEKING, STAGE_ONLY, steadyFor } from '../bot.ts';
import { shiftEventOf } from '../job/records.ts';
import { educationOf } from './records.ts';

export type Track = 'nurse' | 'emt';
/** The career each track is hired into, and its school. */
const CAREER: Readonly<Record<Track, string>> = { nurse: 'registered-nurse', emt: 'emt' };
/** Courses a term: half time at the college (tune), two at a time in a program, both at once for the EMT course. */
const COURSES = 2;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string) => offered.filter((a) => a.type === type);
const level = (turn: Turn, need: string) => turn.fact('life.need', { need }) as number;

/** Breaks this long or longer hold a night's sleep besides the meal, and a meal's minutes: as the page's trip (tune). */
const SLEEP_BREAK = 4 * 60;
const MEAL = 30;

/**
 * On shift: work to its middle, a meal there, then on to its sleep, slept to the end; as a crew
 * takes a 24-hour shift's breaks (D164), and as apps/game's trip.ts does for a player.
 */
function onShift(turn: Turn, offered: readonly Action[], work: Action, ate: { day: number }): Action {
  const breaks = turn.fact('job.shift-breaks') as number;
  const endsIn = turn.fact('job.shift-ends-in') as number;
  const sleep = breaks >= SLEEP_BREAK ? breaks - MEAL : 0;
  const meal = Math.min(MEAL, breaks - sleep);
  const left = work.minutes as number;
  const day = turn.fact('time.tick') as number;
  // One meal a shift: the tick its shift ends marks it.
  const shift = day + endsIn;
  const half = Math.floor((turn.fact('job.shift-minutes') as number) / 2);
  if (meal > 0 && ate.day !== shift) {
    if (endsIn > half) return { ...work, minutes: Math.min(left, endsIn - half) };
    ate.day = shift;
    const eat = offered.find((a) => a.type === 'life/do' && a.activity === 'eat');
    return eat ? { ...eat, minutes: meal } : { type: 'life/do', activity: 'relax', minutes: meal };
  }
  if (sleep > 0) {
    if (endsIn > sleep) return { ...work, minutes: Math.min(left, endsIn - sleep) };
    return { type: 'life/do', activity: 'sleep', minutes: Math.max(1, endsIn) };
  }
  return work;
}

/** Free time in the day, off shift, no class within the hour, fed and rested enough: when it studies. */
function free(turn: Turn): boolean {
  const minute = turn.fact('time.of-day') as number;
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

/** The school it enrolls at now: the EMT course; for the nurse, the program once admitted, the college before. */
function schoolFor(turn: Turn, track: Track): string | undefined {
  if (track === 'emt') return turn.fact('education.emt-certified') === true ? undefined : 'emt';
  if (turn.fact('education.nursing') !== 'none') return undefined;
  return turn.fact('education.adn-admitted') === true ? 'adn' : 'college';
}

/** Enrolling at its school: by evening where it can while it has a job, paying cash if it can, else the bill borrowed. */
function enroll(turn: Turn, offered: readonly Action[], track: Track): Action | undefined {
  const school = schoolFor(turn, track);
  if (!school) return undefined;
  const here = of(offered, 'education/enroll').filter((a) => (a.school ?? 'college') === school);
  const evening = turn.fact('job.employed') === true && here.some((a) => a.evening === true);
  const ways = here.filter((a) => (a.evening === true) === evening);
  const n = Math.min(COURSES, Math.max(0, ...ways.map((a) => a.courses as number)));
  const mine = ways.filter((a) => a.courses === n);
  return mine.find((a) => a.borrow === 'none') ?? mine.find((a) => a.borrow === 'bill');
}

/**
 * Hours a week a course asks for a full grade: its school's hours a credit times its credits, as
 * the School tab says (the program's six-credit courses ask twice the college's).
 */
function weekly(turn: Turn, id: string): number {
  const r = educationOf(turn.content);
  for (const c of [r?.college, r?.emt, r?.adn]) {
    const found = c?.courses.find((x) => x.id === id);
    if (c && found) return c.study * found.credits;
  }
  return 0;
}

/** A course of this term still short of its week's hours, if any. */
function course(turn: Turn, offered: readonly Action[], week: Map<string, number>): Action | undefined {
  const w = Math.floor((turn.fact('time.day') as number) / 7);
  const id = (a: Action) => String(a.subject);
  return of(offered, 'education/study').find((a) => (week.get(`${w}/${id(a)}`) ?? 0) < weekly(turn, id(a)));
}

/** Licensed and not yet in the career: an opening of it applied to, or an offer of it taken. */
function seek(turn: Turn, offered: readonly Action[], track: Track): Action | undefined {
  const licensed = turn.fact(track === 'nurse' ? 'education.rn-licensed' : 'education.emt-licensed') === true;
  if (!licensed || turn.fact('job.career') === CAREER[track]) return undefined;
  // It applies only to its career's openings, so every offer it holds is one.
  const take = of(offered, 'market/accept')[0];
  if (take) return take;
  if ((turn.fact('market.waiting') as number) >= SEEKING) return undefined;
  const listed = turn.fact('market.openings') as { opening: string; career: string; problem: string | null }[];
  const open = listed.filter((l) => l.career === CAREER[track] && l.problem === null);
  const pick = open.length > 0 ? turn.rng.pick(open) : undefined;
  return pick ? { type: 'market/apply', opening: pick.opening } : undefined;
}

/** The exam sat once offered: the nursing licence, or the national EMT exam. */
const exam = (offered: readonly Action[], track: Track) =>
  of(offered, track === 'nurse' ? 'education/sit-nclex' : 'education/sit-nremt')[0];

/**
 * A shift event's choice: the certain one, where the event has one, as a careful nurse or EMT
 * would take it; the steady bot's draw otherwise. Its records put certain choices first.
 */
function careful(turn: Turn, offered: readonly Action[]): Action | undefined {
  const event = (turn.mode.data as { event?: string } | undefined)?.event;
  if (!event) return undefined;
  const certain = shiftEventOf(turn.content, event).choices.find((c) => c.odds === undefined);
  return offered.find((a) => a.type === 'job/choose' && a.choice === certain?.id);
}

/** A posted shift that meets one of its classes: not signed up for, as a student who keeps its classes would. */
function clashes(turn: Turn, a: Action): boolean {
  if (a.type !== 'job/sign-up') return false;
  const day = a.day as number;
  const minute = turn.fact('job.posted-start', { day }) as number;
  const minutes = turn.fact('job.posted-minutes', { day }) as number;
  return minute >= 0 && turn.fact('education.class-during', { day, minute, minutes }) === true;
}

export const medicFor = (days: number, track: Track, name = `medic-${track}`): Policy => {
  const steadyBot = steadyFor(days, name);
  const steady: Policy = {
    name,
    choose: (turn) => steadyBot.choose({ ...turn, options: turn.options.filter((a) => !clashes(turn, a)) }),
  };
  // Hours studied for each course in each week, so a week's study stops at what a grade asks.
  const week = new Map<string, number>();
  const ate = { day: -1 };
  return {
    name,
    choose(turn) {
      if ((turn.fact('time.day') as number) >= days) return null;
      if (turn.mode.id === 'shift-event') return careful(turn, turn.options) ?? steady.choose(turn);
      if (turn.mode.id !== 'world') return steady.choose(turn);
      const offered = playable(turn);
      const work = offered.find((a) => a.type === 'life/do' && a.activity === 'work');
      if (work) return onShift(turn, offered, work, ate);
      // Enrolling before a meal: a term the window closes on is a half year lost.
      const term = enroll(turn, offered, track);
      if (term) return term;
      if (level(turn, 'food') < 15) return steady.choose(turn);
      const pick =
        of(offered, 'education/pay-loan')[0] ??
        of(offered, 'education/attend')[0] ??
        (track === 'nurse' ? of(offered, 'education/apply-nursing').find((a) => a.program === 'adn') : undefined) ??
        exam(offered, track) ??
        seek(turn, offered, track) ??
        (free(turn) ? course(turn, offered, week) : undefined);
      if (pick?.type === 'education/study') {
        const key = `${Math.floor((turn.fact('time.day') as number) / 7)}/${String(pick.subject)}`;
        week.set(key, (week.get(key) ?? 0) + 1);
      }
      return pick ?? steady.choose(turn);
    },
  };
};
