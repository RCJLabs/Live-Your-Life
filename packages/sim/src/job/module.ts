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
import { quit, hire as startJob } from './hire.ts';
import { payday } from './pay.ts';
import { clockIn, drop, freeProblem, giveShift, jobDay, paidWork, shiftOver, signUp, takeShift } from './shifts.ts';
import {
  activeWarnings,
  careerFor,
  type JobSlice,
  jobless,
  letGo,
  shiftNow,
  skillOf,
  timerFor,
  windowOf,
} from './state.ts';
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
    version: 2,
    migrate: {
      // Experience (M2.5, D122): the practice in the job held is what is known of the work done before.
      // The shifts over this week weren't kept, so the week's limit counts none of them until next week.
      2: (slice) => {
        const s = slice as Omit<JobSlice, 'experience' | 'done'>;
        return { ...s, experience: s.career === null ? {} : { [s.career]: s.practice }, done: [] };
      },
    },
    init: (ctx) => (hire ? hiredAt(ctx, hire) : jobless()),
    facts: {
      // Heard by the market (M2.5, D122): minutes worked in a career, at any employer.
      worked: {
        read: ({ state }, args) => state.experience[String(args.career)] ?? 0,
        args: { career: { type: 'ref', to: 'career' } },
        domain: { type: 'int', min: 0 },
        label: 'minutes worked in a career',
      },
      employed: { read: ({ state }) => state.employed, domain: { type: 'bool' }, label: 'has a job' },
      // Heard by the federal module (M4.3 step 3): whether the job held is an agent's.
      career: {
        read: ({ state }) => state.career ?? '',
        domain: { type: 'text' },
        label: 'the career of the job held, or the last',
      },
      // Heard by health (M2.7, D105): a job whose employer offers health cover.
      insured: {
        read: ({ state, content }) =>
          state.employed && state.career !== null && careerFor(content, state).insurance === true,
        domain: { type: 'bool' },
        label: 'covered by an employer’s health plan',
      },
      // Heard by the family (M2.6 step 4c): what child support is worked out from.
      wage: {
        read: ({ state, content }) => (state.employed && state.career ? careerFor(content, state).wage : 0),
        domain: { type: 'int', min: 0 },
        label: 'cents an hour at your job, or 0',
      },
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
      // The coworker works beside you on your days (ties/state.ts); the people's hours need when (M2.2).
      'shift-start': {
        args: { day: { type: 'int', min: 0 } },
        read: (view, { day }) => {
          const signed = view.state.signed.find((s) => s.day === day);
          if (!signed || view.state.career === null) return -1;
          const kind = careerFor(view.content, view.state).shifts.find((k) => k.id === signed.shift);
          return kind ? kind.hour * 60 + kind.minute : -1;
        },
        domain: { type: 'int', min: -1 },
        label: 'the minute of the day your shift that day starts, or -1',
      },
      // Whether a shift you signed up for covers that minute of that day: dates are planned around it (M2.6).
      busy: {
        args: { day: { type: 'int', min: 0 }, minute: { type: 'int', min: 0 } },
        read: (view, { day, minute }) => {
          const signed = view.state.signed.find((s) => s.day === day);
          if (!signed || view.state.career === null) return false;
          const kind = careerFor(view.content, view.state).shifts.find((k) => k.id === signed.shift);
          const start = kind ? kind.hour * 60 + kind.minute : -1;
          return kind !== undefined && (minute as number) >= start && (minute as number) < start + kind.minutes;
        },
        domain: { type: 'bool' },
        label: 'on a shift you signed up for at that minute of that day',
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
      // Payday (pay.ts): heard by education, which counts the year's pay for aid (M2.8 step 4).
      paid: {
        args: {
          minutes: { type: 'int', min: 0 },
          gross: { type: 'int', min: 0 },
          withheld: { type: 'int', min: 0 },
          net: { type: 'int', min: 0 },
        },
        label: 'Paid',
      },
      late: { args: SHIFT_MINUTES, label: 'Started a shift late' },
      'called-in-sick': {
        args: { day: { type: 'int', min: 0 }, shift: { type: 'text' } },
        label: 'Called in sick',
      },
      'no-show': {
        args: { day: { type: 'int', min: 0 }, shift: { type: 'text' }, warnings: { type: 'int', min: 1 } },
        label: "Didn't show for a shift",
      },
      hired: { args: { career: { type: 'text' } }, label: 'Started a job' },
      // Heard by the federal module (M4.3 step 3): a shift's work added to the open case.
      evidence: { args: { points: { type: 'int', min: 1 } }, label: 'Found evidence for a case' },
      quit: { label: 'Quit a job' },
      standing: {
        args: { by: { type: 'int' }, now: { type: 'int', min: 0, max: 100 }, why: { type: 'text' } },
        label: 'Standing at work moved',
      },
      'let-go': {
        args: { reason: { type: 'enum', values: ['no-shows', 'standing', 'prison', 'record'] } },
        label: 'Let go from a job',
      },
    },
    actions: { 'sign-up': signUp, drop, choose, quit },
    on: {
      // An heir carries on (M2.7 step 3): nothing of your job is theirs. Its last pay went to the estate.
      'lives/succeeded': (ctx) => {
        for (const s of ctx.read().signed) {
          ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'event') });
          ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'over') });
        }
        ctx.apply({ effect: 'cancel-timer', timer: 'payday' });
        Object.assign(ctx.write(), jobless());
      },
      // Taken into prison (D81): an employer doesn't keep the job for years.
      'prison/admitted': (ctx) => {
        if (ctx.read().employed) letGo(ctx, 'prison');
      },
      // A felony sentence ends a job that bars one: a police officer's licence goes with it (M2.4).
      'law/sentenced': (ctx) => {
        const s = ctx.read();
        if (s.employed && careerFor(ctx.content, s).requires?.record === 'no-felony') letGo(ctx, 'record');
      },
    },
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
      hire: (ctx, effect) => startJob(ctx, String(effect.career)),
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
