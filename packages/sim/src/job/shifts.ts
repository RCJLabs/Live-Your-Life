/**
 * Shifts (D39): signing up for what is posted, dropping a shift in time, starting work late or
 * on time, leaving early, not showing up, and the day's upkeep: next week's postings and
 * payday. The life module does the working; this hears when work starts and how long it went.
 */

import type { Action, FactView } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { nextWeek, post, shiftKind, type Today, todayOf, weekOf } from './days.ts';
import { hire } from './hire.ts';
import type { Weekday } from './records.ts';
import {
  activeWarnings,
  careerFor,
  type JobContext,
  type JobSlice,
  letGo,
  moveStanding,
  type SignUp,
  shiftNow,
  timerFor,
  windowOf,
} from './state.ts';

type Viewer = FactView<JobSlice> | JobContext;
const sliceOf = (view: Viewer) => ('state' in view ? view.state : view.read());

/** Why a day can't take one more shift of yours, or null when it can: from tomorrow, one a day, the week's limit. */
export function freeProblem(view: Viewer, day: number): string | null {
  const slice = sliceOf(view);
  if (!slice.employed) return 'not-employed';
  if (slice.signed.some((s) => s.day === day)) return 'already-signed-up';
  const today = todayOf(view);
  if (day <= today.day) return 'too-soon';
  const week = weekOf(today, day);
  const taken = slice.signed.filter((s) => weekOf(today, s.day) === week).length;
  return taken >= careerFor(view.content, slice).perWeek ? 'week-full' : null;
}

/** Why a posted day can't be signed up for now, or null when it can. */
function signUpProblem(view: Viewer, day: number): string | null {
  // Postings are from tomorrow on: hiring posts from tomorrow, and midnight clears the day's.
  if (sliceOf(view).employed && !sliceOf(view).posted.some((p) => p.day === day)) return 'not-posted';
  return freeProblem(view, day);
}

/** A shift of yours from now on: its event, if it has one, sealed now so the routine can stop for it (D40). */
function addSignUp(ctx: JobContext, day: number, shift: string): void {
  const slice = ctx.write();
  const career = careerFor(ctx.content, slice);
  const { minutes } = shiftKind(career, shift);
  const rng = ctx.rng('events');
  const event = rng.chance(career.events.chance, 100) ? rng.int(30, minutes - 30) : null;
  slice.signed.push({ day, shift, event, in: null, worked: 0, home: false });
  slice.signed.sort((a, b) => a.day - b.day);
}

export const signUp = {
  run(ctx: JobContext, action: Action) {
    const day = action.day;
    if (typeof day !== 'number' || !Number.isSafeInteger(day)) return ctx.refuse('bad-day');
    const problem = signUpProblem(ctx, day);
    if (problem) return ctx.refuse(problem);
    const shift = ctx.read().posted.find((p) => p.day === day)?.shift as string;
    addSignUp(ctx, day, shift);
    ctx.emit('signed-up', { day, shift });
  },
  options: (view: FactView<JobSlice>) =>
    view.state.posted.filter((p) => signUpProblem(view, p.day) === null).map((p) => ({ day: p.day })),
};

/** `take-shift`: a shift not posted to you, taken as a favour (D42). It counts in your week like any other. */
export function takeShift(ctx: JobContext, day: number, shift: string): void {
  const problem = freeProblem(ctx, day);
  if (problem) {
    ctx.refuse(problem);
    return;
  }
  if (!careerFor(ctx.content, ctx.read()).shifts.some((k) => k.id === shift)) throw new Error(`no shift "${shift}"`);
  addSignUp(ctx, day, shift);
  ctx.emit('took-shift', { day, shift });
}

/** `give-shift`: one of yours covered by someone else before it starts (D42). The owner doesn't mind a swap. */
export function giveShift(ctx: JobContext, day: number): void {
  if (!(startsIn(ctx, day) > 0)) {
    ctx.refuse('not-ahead');
    return;
  }
  ctx.apply({ effect: 'cancel-timer', timer: timerFor(day, 'event') });
  ctx.apply({ effect: 'cancel-timer', timer: timerFor(day, 'over') });
  const slice = ctx.write();
  slice.signed = slice.signed.filter((s) => s.day !== day);
  ctx.emit('covered', { day });
}

/**
 * A shift's timers, set at midnight on its day rather than when it is signed up for: the time
 * module's slice is copied on every action, and a week of sign-ups would carry a dozen timers.
 */
function scheduleShift(ctx: JobContext, today: Today, s: SignUp): void {
  const { start, end } = windowOf(careerFor(ctx.content, ctx.read()), today, s);
  const day = s.day;
  if (s.event !== null) {
    const effects = [{ effect: 'shift-event', day }];
    ctx.apply({
      effect: 'schedule',
      timer: timerFor(day, 'event'),
      after: { minutes: start + s.event - today.tick },
      effects,
    });
  }
  // Settled a minute after it ends, once whoever worked it has stopped (timers fire in order).
  const effects = [{ effect: 'shift-over', day }];
  ctx.apply({ effect: 'schedule', timer: timerFor(day, 'over'), after: { minutes: end + 1 - today.tick }, effects });
}

/** Minutes until a signed-up shift starts. */
const startsIn = (view: FactView<JobSlice> | JobContext, day: number): number => {
  const slice = 'state' in view ? view.state : view.read();
  const today = todayOf(view);
  const s = slice.signed.find((x) => x.day === day);
  return s ? windowOf(careerFor(view.content, slice), today, s).start - today.tick : -1;
};

export const drop = {
  run(ctx: JobContext, action: Action) {
    const slice = ctx.read();
    const day = action.day;
    if (typeof day !== 'number' || !slice.signed.some((s) => s.day === day)) return ctx.refuse('not-signed-up');
    if (startsIn(ctx, day) < careerFor(ctx.content, slice).standing.dropBefore) return ctx.refuse('too-late-to-drop');
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(day, 'event') });
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(day, 'over') });
    const w = ctx.write();
    w.signed = w.signed.filter((s) => s.day !== day);
    ctx.emit('dropped', { day });
    moveStanding(ctx, -careerFor(ctx.content, w).standing.drop, 'dropped');
  },
  options: (view: FactView<JobSlice>) => {
    if (!view.state.employed) return [];
    const before = careerFor(view.content, view.state).standing.dropBefore;
    return view.state.signed.filter((s) => startsIn(view, s.day) >= before).map((s) => ({ day: s.day }));
  },
};

/** Work has started (the life module's `work`): the first time on a shift, late or on time. */
export function clockIn(ctx: JobContext): void {
  const now = shiftNow(ctx);
  if (!now || now.s.in !== null) return;
  const tick = todayOf(ctx).tick;
  const s = ctx.write().signed.find((x) => x.day === now.s.day) as JobSlice['signed'][number];
  s.in = tick;
  const late = tick - now.start;
  ctx.emit('started', { day: s.day, late });
  const rules = careerFor(ctx.content, ctx.read()).standing;
  if (late <= rules.lateAfter) return;
  ctx.emit('late', { day: s.day, shift: s.shift, minutes: late });
  moveStanding(ctx, -rules.late, 'late');
}

/** Work has stopped after `minutes` (the life module's `paid-work`): practice, and pay owed. */
export function paidWork(ctx: JobContext, minutes: number): void {
  const slice = ctx.write();
  slice.unpaid += minutes;
  slice.practice += minutes;
  const today = todayOf(ctx);
  const career = careerFor(ctx.content, slice);
  const s = slice.signed.find((x) => {
    const { start, end } = windowOf(career, today, x);
    return x.in !== null && start <= today.tick - minutes && today.tick <= end;
  });
  if (!s) return;
  s.worked += minutes;
  ctx.emit('worked', { day: s.day, shift: s.shift, minutes });
}

/** A minute after a shift ends: a no-show, a shift left early, or one worked whole. */
export function shiftOver(ctx: JobContext, day: number): void {
  const slice = ctx.read();
  const s = slice.signed.find((x) => x.day === day);
  if (!slice.employed || !s) return;
  const career = careerFor(ctx.content, slice);
  const rules = career.standing;
  const today = todayOf(ctx);
  ctx.write().signed = slice.signed.filter((x) => x.day !== day);
  if (s.in === null) {
    const warnings = [...activeWarnings(slice, career, today.tick), today.tick];
    ctx.write().warnings = warnings;
    ctx.emit('no-show', { day, shift: s.shift, warnings: warnings.length });
    if (warnings.length >= career.warnings.letGoAt) letGo(ctx, 'no-shows');
    else moveStanding(ctx, -rules.noShow, 'no-show');
    return;
  }
  const { start, end } = windowOf(career, today, s);
  const missed = end - s.in - s.worked;
  const late = s.in - start > rules.lateAfter;
  const left = !s.home && missed > rules.missedAfter;
  ctx.emit('shift-over', { day, worked: s.worked, late: s.in - start, missed, home: s.home });
  if (left) moveStanding(ctx, -rules.leftEarly, 'left-early');
  else if (!late && !s.home) {
    moveStanding(ctx, rules.shift, 'worked');
    promote(ctx);
  }
}

/** A rank earned (M2.4): with the career's practice and standing, the next on its ladder, same employer. */
function promote(ctx: JobContext): void {
  const slice = ctx.read();
  if (!slice.employed || slice.career === null) return;
  const ladder = careerFor(ctx.content, slice).ladder;
  if (!ladder || slice.practice < ladder.practice || slice.standing < ladder.standing) return;
  const from = slice.career;
  hire(ctx, ladder.next);
  ctx.emit('promoted', { from, career: ladder.next });
}

/** Midnight: past postings go, next week's go up on the posting day, the day's shift is set, and payday. */
export function jobDay(ctx: JobContext): void {
  const slice = ctx.read();
  if (slice.career === null || (!slice.employed && slice.unpaid === 0)) return;
  const career = careerFor(ctx.content, slice);
  const today = todayOf(ctx);
  const weekday = WEEKDAYS[today.weekday] as Weekday;
  const kept = slice.posted.filter((p) => p.day > today.day);
  const added =
    slice.employed && weekday === career.posting.weekday
      ? post(career, ctx.rng('postings'), today, nextWeek(today), slice.standing)
      : [];
  if (kept.length !== slice.posted.length || added.length > 0) ctx.write().posted = [...kept, ...added];
  if (added.length > 0) ctx.emit('posted', { days: added.map((p) => p.day) });
  const todays = slice.employed ? slice.signed.find((s) => s.day === today.day) : undefined;
  if (todays) scheduleShift(ctx, today, todays);
  if (weekday !== career.pay.weekday) return;
  const at = career.pay.hour * 60 + career.pay.minute;
  if (at === 0) ctx.apply({ effect: 'payday' });
  else ctx.apply({ effect: 'schedule', timer: 'payday', after: { minutes: at }, effects: [{ effect: 'payday' }] });
}
