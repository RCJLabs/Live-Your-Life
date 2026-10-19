/**
 * The job module (M1.3): one career on the template, from its record (D9). Shifts posted weekly
 * and signed up for (shifts.ts), standing and its warnings (D39), shift events that stop the
 * routine for a choice (events.ts, D40), and pay less withholding (pay.ts, D38). The life module
 * does the working and tells this when work starts and how long it went. Since M1.4 it raises
 * events the ties module hears, and takes and gives shifts as favours (D42).
 */
import { defineModule, type FactView, type InitContext } from '@eb/core';
import { type LifeStart, weekdayOf } from '../calendar.ts';
import { daysAtHire, post, type Today, todayOf } from './days.ts';
import { choose, shiftChoice, shiftEvent, shiftOutcome } from './events.ts';
import { payday } from './pay.ts';
import { clockIn, drop, freeProblem, giveShift, jobDay, paidWork, shiftOver, signUp, takeShift } from './shifts.ts';
import { activeWarnings, careerFor, type JobSlice, jobless, shiftNow, skillOf, windowOf } from './state.ts';
import { payFor } from './withholding.ts';

/** Who is hired where when a life starts: the slice's line cook (DESIGN.md, The first slice). */
export interface Hire {
  readonly career: string;
  readonly start: LifeStart;
}

/** Hired at the start: standing at the career's start, and this week's shifts posted from tomorrow. */
function hiredAt(ctx: InitContext, hire: Hire): JobSlice {
  const career = careerFor(ctx.content, hire);
  const today: Today = {
    day: 0,
    weekday: weekdayOf(hire.start),
    tick: 0,
    minute: hire.start.hour * 60 + hire.start.minute,
  };
  const standing = career.standing.start;
  const posted = post(career, ctx.rng('postings'), today, daysAtHire(career, today), standing);
  return { ...jobless(), career: hire.career, employed: true, standing, posted, year: hire.start.year };
}

/** Minutes until the shift being worked ends, or its event comes due if that is sooner: how long work may go on now. */
function shiftLeft(view: FactView<JobSlice>): number {
  const now = shiftNow(view);
  if (!now) return 0;
  const tick = view.fact('time.tick') as number;
  const due = now.s.event === null ? now.end : now.start + now.s.event;
  return (due > tick ? Math.min(due, now.end) : now.end) - tick;
}

/** Minutes until the next shift signed up for starts; none without one. */
function nextShiftIn(view: FactView<JobSlice>): number | undefined {
  if (!view.state.employed || view.state.signed.length === 0) return undefined;
  const today = todayOf(view);
  const career = careerFor(view.content, view.state);
  const starts = view.state.signed.map((s) => windowOf(career, today, s).start).filter((t) => t > today.tick);
  return starts.length === 0 ? undefined : Math.min(...starts) - today.tick;
}

/** What `worked` and `late` carry: the shift, and its minutes. */
const SHIFT_MINUTES = {
  day: { type: 'int', min: 0 },
  shift: { type: 'text' },
  minutes: { type: 'int', min: 1 },
} as const;

const dayOf = (effect: Readonly<Record<string, unknown>>): number => {
  if (typeof effect.day !== 'number' || !Number.isSafeInteger(effect.day))
    throw new Error('job: "day" is a whole number');
  return effect.day;
};

export function jobModule(hire?: Hire) {
  return defineModule<JobSlice>({
    id: 'job',
    init: (ctx) => (hire ? hiredAt(ctx, hire) : jobless()),
    facts: {
      employed: { read: ({ state }) => state.employed, domain: { type: 'bool' }, label: 'has a job' },
      standing: {
        read: ({ state }) => state.standing,
        domain: { type: 'int', min: 0, max: 100 },
        label: 'standing at work',
      },
      skill: {
        read: ({ state, content }) =>
          state.career === null ? 0 : skillOf(state.practice, careerFor(content, state).skill.half),
        domain: { type: 'int', min: 0, max: 100 },
        label: 'skill at work',
      },
      warnings: {
        read: (view) =>
          view.state.career === null
            ? 0
            : activeWarnings(view.state, careerFor(view.content, view.state), view.fact('time.tick') as number).length,
        domain: { type: 'int', min: 0 },
        label: 'warnings at work',
      },
      'on-shift': { read: (view) => shiftNow(view) !== null, domain: { type: 'bool' }, label: 'on shift' },
      'shift-left': { read: shiftLeft, domain: { type: 'int', min: 0 }, label: 'minutes of work left now' },
      'next-shift-in': { read: nextShiftIn, domain: { type: 'int', min: 1 }, label: 'minutes to the next shift' },
      unpaid: {
        read: ({ state, content }) =>
          state.career === null ? 0 : payFor(state.unpaid, careerFor(content, state).wage),
        domain: { type: 'int', min: 0 },
        label: 'pay earned and not yet paid',
      },
      free: {
        args: { day: { type: 'int', min: 0 } },
        read: (view, { day }) => freeProblem(view, day as number) === null,
        domain: { type: 'bool' },
        label: 'free to take a shift that day',
      },
      // Your shifts not yet started, for whoever asks to cover one: a list, so no domain.
      ahead: (view) => {
        if (!view.state.employed) return [];
        const today = todayOf(view);
        const career = careerFor(view.content, view.state);
        return view.state.signed
          .filter((s) => windowOf(career, today, s).start > today.tick)
          .map((s) => ({ day: s.day, shift: s.shift }));
      },
    },
    events: {
      worked: { args: SHIFT_MINUTES, label: 'Worked a shift, or part of it' },
      late: { args: SHIFT_MINUTES, label: 'Started a shift late' },
      'no-show': {
        args: { day: { type: 'int', min: 0 }, shift: { type: 'text' }, warnings: { type: 'int', min: 1 } },
        label: "Didn't show for a shift",
      },
    },
    actions: { 'sign-up': signUp, drop, choose },
    effects: {
      'clock-in': (ctx) => clockIn(ctx),
      'paid-work': (ctx, effect) => {
        const minutes = effect.minutes;
        if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes < 1) {
          throw new Error('paid-work: "minutes" is a whole number, at least 1');
        }
        paidWork(ctx, minutes);
      },
      'job-day': (ctx) => jobDay(ctx),
      'shift-event': (ctx, effect) => shiftEvent(ctx, dayOf(effect)),
      'shift-over': (ctx, effect) => shiftOver(ctx, dayOf(effect)),
      payday: (ctx) => payday(ctx),
      'shift-choice': shiftChoice,
      'shift-outcome': (ctx, effect) => shiftOutcome(ctx, effect),
      'take-shift': (ctx, effect) => takeShift(ctx, dayOf(effect), String(effect.shift)),
      'give-shift': (ctx, effect) => giveShift(ctx, dayOf(effect)),
    },
    modes: {
      // A shift event on screen: the clock stops, and only a choice is allowed (D40).
      'shift-event': { actions: ['job/choose'] },
    },
  });
}
