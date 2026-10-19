/**
 * A person's day, hour by hour: what they do and where, worked out from who they are, the
 * weekday and the seed, never stored. Each hour is one of a few kinds, each up to three pieces
 * of the needs' activities (needs.ts), so tier-1 people run the same needs as the player at an
 * hour's grain. The kinds are shared, not built per person, because thousands are asked for
 * every game hour (M0.4).
 */
import type { Activity } from '../needs.ts';
import { mix, type Person } from './roster.ts';

export type Segment = readonly [Activity, number];

/** Where an hour is spent: at the person's own home, work or third place, or on the way. */
export type Where = 'home' | 'work' | 'third' | 'away';

export interface HourKind {
  readonly at: Where;
  /** Pieces adding up to 60 minutes. */
  readonly segments: readonly Segment[];
}

export const HOURS = {
  work: { at: 'work', segments: [['work', 60]] },
  /** The shift's fifth hour: half of it eating. */
  break: {
    at: 'work',
    segments: [
      ['eat', 30],
      ['work', 30],
    ],
  },
  sleep: { at: 'home', segments: [['sleep', 60]] },
  /** The hour before a shift: getting there. */
  commute: { at: 'away', segments: [['awake', 60]] },
  /** The first hour up. */
  rise: {
    at: 'home',
    segments: [
      ['wash', 15],
      ['eat', 30],
      ['awake', 15],
    ],
  },
  meal: {
    at: 'home',
    segments: [
      ['eat', 30],
      ['relax', 30],
    ],
  },
  out: { at: 'third', segments: [['socialize', 60]] },
  evening: { at: 'home', segments: [['relax', 60]] },
  home: { at: 'home', segments: [['awake', 60]] },
} as const satisfies Record<string, HourKind>;

/** Asleep in hour h of any day: last night's sleep reaching into the morning, or tonight's. */
export function asleep(p: Person, h: number): boolean {
  const from = p.bedHour;
  const to = p.bedHour + p.sleepHours;
  return (h >= from && h < to) || (h + 24 >= from && h + 24 < to);
}

/** At work in hour h of a weekday (0 is Monday): today's shift, or last night's running on. */
export function working(p: Person, weekday: number, h: number): boolean {
  const s = p.shift;
  if (!s) return false;
  const start = s.start / 60;
  const end = (s.start + s.minutes) / 60;
  return (
    (h >= start && h < Math.min(24, end) && s.days.includes(weekday)) ||
    (end > 24 && h < end - 24 && s.days.includes((weekday + 6) % 7))
  );
}

/** An evening out, some days, more often for the sociable: up to one in two. */
export const out = (p: Person, seed: number, i: number, day: number): boolean =>
  mix(seed, 8, i, day) % 100 < p.social / 2;

/** What person i does in hour h of a day. */
export function hourOf(p: Person, seed: number, i: number, day: number, weekday: number, h: number): HourKind {
  if (working(p, weekday, h)) return ((p.shift?.start ?? 0) / 60 + 4) % 24 === h ? HOURS.break : HOURS.work;
  if (asleep(p, h)) return HOURS.sleep;
  if (asleep(p, (h + 23) % 24)) return HOURS.rise;
  const next = (h + 1) % 24;
  if (working(p, next === 0 ? (weekday + 1) % 7 : weekday, next)) return HOURS.commute;
  if (h === 12 || h === 18) return HOURS.meal;
  if ((h === 20 || h === 21) && out(p, seed, i, day)) return HOURS.out;
  return h >= 19 ? HOURS.evening : HOURS.home;
}

/** The place an hour is spent at, by its number: -1 on the way. */
export function placeOf(p: Person, at: Where): number {
  if (at === 'home') return p.home;
  if (at === 'work') return p.work;
  if (at === 'third') return p.third;
  return -1;
}
