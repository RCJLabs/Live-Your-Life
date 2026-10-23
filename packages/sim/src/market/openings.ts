/**
 * The openings (M2.3, D74): when one of an employer's staff leaves, a job comes up there. How
 * often follows the career's turnover; when in the week it is posted, and how long it stays open
 * before someone else takes it, follow from the seed, the employer and the week. So the openings
 * on any day are worked out, never stored, and are the same however the days were lived.
 */
import { mix } from '../people/roster.ts';
import { type Employer, hashOf } from './employers.ts';

export interface Opening {
  /**
   * `<employer>-o<week + 100>-<k>`: what an application names and its timers carry, so in the
   * timers' alphabet (words of a-z and 0-9 joined by hyphens); the 100 keeps weeks before the life began whole.
   */
  readonly id: string;
  readonly employer: Employer;
  /** The day it went up, and the first day it is gone, counted from the life's first day. */
  readonly posted: number;
  readonly closes: number;
}

/** Days an opening stays up before it is filled by someone else (tune; CALIBRATION.md). */
export const FILL = { fewest: 10, most: 28 } as const;
const WEEKS_BACK = Math.ceil(FILL.most / 7);
/** Weeks in a month, as the turnover survey counts a month. */
const WEEKS_A_MONTH = 52 / 12;

const WEEK_OFFSET = 100;
const openingId = (employer: string, week: number, k: number): string => `${employer}-o${week + WEEK_OFFSET}-${k}`;

/** Openings a week at an employer, on average: its staff times its monthly separations. */
export const weeklyRate = (e: Employer): number => (e.staff * e.turnover) / 1000 / WEEKS_A_MONTH;

/** The openings an employer posts in week `week`: the whole number of its rate, and one more by chance. */
export function postedIn(seed: number, e: Employer, week: number): Opening[] {
  const h = hashOf(e.id);
  const rate = weeklyRate(e);
  const whole = Math.floor(rate);
  const count = whole + (mix(seed, 42, h, week) % 1000 < Math.round((rate - whole) * 1000) ? 1 : 0);
  const out: Opening[] = [];
  for (let k = 0; k < count; k++) {
    const roll = mix(seed, 43, h, week, k);
    const posted = week * 7 + (roll % 7);
    const closes = posted + FILL.fewest + ((roll >>> 4) % (FILL.most - FILL.fewest + 1));
    out.push({ id: openingId(e.id, week, k), employer: e, posted, closes });
  }
  return out;
}

/** Every opening up on a day, by employer and then by when it went up. */
export function openingsOn(seed: number, employers: readonly Employer[], day: number): Opening[] {
  const week = Math.floor(day / 7);
  const out: Opening[] = [];
  for (const e of employers) {
    // From before the life began too: on its first day, the city already has jobs going.
    for (let w = week - WEEKS_BACK; w <= week; w++) {
      for (const o of postedIn(seed, e, w)) if (o.posted <= day && day < o.closes) out.push(o);
    }
  }
  return out;
}

/** An opening by its id, if it is up on the day. */
export function openingOf(seed: number, employers: readonly Employer[], id: string, day: number): Opening | null {
  const parts = /^(.+)-o(\d+)-(\d+)$/.exec(id);
  if (!parts) return null;
  const e = employers.find((x) => x.id === parts[1]);
  if (!e) return null;
  const o = postedIn(seed, e, Number(parts[2]) - WEEK_OFFSET)[Number(parts[3])];
  return o && o.id === id && o.posted <= day && day < o.closes ? o : null;
}
