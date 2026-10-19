/**
 * Where a batch's time goes (M0.4). The people's own arithmetic, an hour and a day of it, run
 * outside the kernel; and the kernel's copy and freeze of the people's slice, which it does once
 * in every action that writes to the slice. The copy and the freeze are the engine's own
 * functions, imported from its source because @eb/core doesn't export them: if the engine moves
 * them, this file fails to typecheck rather than timing something else.
 *
 * A lean copy and freeze sits beside them for comparison: arrays of numbers copied whole, and
 * checked without building a path for each element. It is what a change to the engine might
 * save, not what the engine does.
 */
import { newShare, type PeopleSlice, planAt, progress, rosterOf } from '@lyl/sim';
import { cloneJson, freezeJson } from '../../../engine/packages/core/src/sim/json.ts';

export interface Split {
  readonly n: number;
  /** Everyone's game hour, settled alone, its plan built: the mean over a week of hours. */
  readonly hourMs: number;
  /** Everyone's game day settled in one call, its 24 plans built: the mean over a week of days. */
  readonly dayMs: number;
  /** A new hour's plan alone, which every cadence builds once for each game hour: who is where, who meets whom. */
  readonly planMs: number;
  /** The kernel's copy of everyone's slice, then the copy and its freeze: medians. */
  readonly copyMs: number;
  readonly copyFreezeMs: number;
  /** The lean copy and freeze, for comparison: the median. */
  readonly leanMs: number;
  /**
   * One staggered share of 24: its day settled with the plans built, as it finds all but one of
   * them (the one hour new since the share before it is the plan above); then its copy and freeze.
   */
  readonly shareDayMs: number;
  readonly shareCopyFreezeMs: number;
}

const WEEK = 7 * 24;

export function split(n: number, seed: number, now: () => number): Split {
  const city = { seed, n };
  const whole = newShare(n);
  // A week in first, so the ties are as full as a running game's.
  progress(city, whole, 7, WEEK, 0);
  let t0 = now();
  for (let h = WEEK; h < 2 * WEEK; h++) progress(city, whole, h, h + 1, 0);
  const hourMs = (now() - t0) / WEEK;
  t0 = now();
  for (let day = 14; day < 21; day++) progress(city, whole, day * 24, (day + 1) * 24, 0);
  const dayMs = (now() - t0) / 7;
  const roster = rosterOf(seed, n);
  t0 = now();
  for (let h = 21 * 24; h < 28 * 24; h++) planAt(roster, seed, h, Math.floor(h / 24) % 7);
  const planMs = (now() - t0) / WEEK;
  const rounds = n >= 1000 ? 15 : 41;
  const share = shareDay(city, now);
  return {
    n,
    hourMs,
    dayMs,
    planMs,
    ...copies(whole, rounds, now),
    shareDayMs: share.ms,
    shareCopyFreezeMs: copies(share.slice, rounds, now).copyFreezeMs,
  };
}

/** Share 0 of 24, a week in, then a day at a time with the day's plans built first. */
function shareDay(city: { seed: number; n: number }, now: () => number) {
  const slice = newShare(city.n, 0, 24);
  progress(city, slice, 7, WEEK, 0);
  let total = 0;
  for (let day = 7; day < 14; day++) {
    for (let h = day * 24; h < (day + 1) * 24; h++) planAt(rosterOf(city.seed, city.n), city.seed, h, day % 7);
    const t0 = now();
    progress(city, slice, day * 24, (day + 1) * 24, 0);
    total += now() - t0;
  }
  return { slice, ms: total / 7 };
}

function copies(slice: PeopleSlice, rounds: number, now: () => number) {
  const frozen = cloneJson(slice);
  freezeJson(frozen, '/people');
  return {
    copyMs: median(rounds, now, () => cloneJson(frozen)),
    copyFreezeMs: median(rounds, now, () => freezeJson(cloneJson(frozen), '/people')),
    leanMs: median(rounds, now, () => leanFreeze(leanCopy(frozen))),
  };
}

// Each sample repeats `f` for at least 2 ms, because a page's clock may be as coarse as 0.1 ms.
function median(rounds: number, now: () => number, f: () => unknown): number {
  let t0 = now();
  f();
  const reps = Math.max(1, Math.ceil(2 / Math.max(now() - t0, 0.01)));
  const times: number[] = [];
  for (let r = 0; r < rounds; r++) {
    t0 = now();
    for (let k = 0; k < reps; k++) f();
    times.push((now() - t0) / reps);
  }
  return times.sort((a, b) => a - b)[Math.floor(rounds / 2)] as number;
}

// Indexed loops throughout: V8 copies a frozen array with slice() or every() far more slowly
// than with a loop (5.5 ms against 0.7 for 54,000 numbers, Node 22), and the kernel's state is
// always frozen.
function numbers(value: readonly unknown[]): boolean {
  for (let i = 0; i < value.length; i++) if (typeof value[i] !== 'number') return false;
  return true;
}

function leanCopy<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    const flat = numbers(value);
    for (let i = 0; i < value.length; i++) out.push(flat ? value[i] : leanCopy(value[i]));
    return out as T;
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, leanCopy(child)])) as T;
}

function leanFreeze(value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('not JSON');
  if (typeof value !== 'object' || value === null) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) leanFreeze(value[i]);
  } else {
    for (const child of Object.values(value)) leanFreeze(child);
  }
  Object.freeze(value);
}
