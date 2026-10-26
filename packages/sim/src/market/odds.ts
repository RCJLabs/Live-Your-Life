/**
 * Whether you may apply for an opening, and the odds you are taken (D74): the same function for
 * the Jobs panel's preview and the roll, so the odds on screen are the odds rolled.
 */
import type { CareerRecord } from '../job/records.ts';

/** Reputation's steps (tune): a whole shift on time adds a point, so a let-go is worked off in about four weeks. */
export const REPUTATION = { start: 50, letGo: -20, quit: -5, worked: 1 } as const;
/** Applications waiting on an answer at once (tune). */
export const PENDING = 5;
/** Days an offer stands before it lapses (tune). */
export const OFFER_DAYS = 2;
const FLOOR = 5;
const CEILING = 95;

export interface Applicant {
  readonly convictions: number;
  /** Of them, felonies (M2.4). */
  readonly felonies: number;
  readonly reputation: number;
  /** The highest schooling finished (M2.8): 'none', 'diploma', 'ged' or 'associate'. */
  readonly schooling: string;
  /** Minutes worked in each career, at any employer (M2.5, D122). */
  readonly worked?: Readonly<Record<string, number>>;
}

/** Whether what you finished meets what a career asks: a GED counts as a diploma. */
const meets = (finished: string, need: 'high-school' | 'associate'): boolean =>
  need === 'associate' ? finished === 'associate' : finished !== 'none';

/** Minutes worked in any of `careers`. */
export const experienceIn = (you: Pick<Applicant, 'worked'>, careers: readonly string[]): number =>
  careers.reduce((n, c) => n + (you.worked?.[c] ?? 0), 0);

/**
 * Why you can't be hired into a career at all, or null. Theft was every offence until M2.4, so
 * none and no-theft both bar any conviction; no-felony bars only a felony (MCOLES's standard).
 * Schooling comes first (M2.8, D114): a diploma or GED, or an associate's; then experience (M2.5, D122).
 */
export function barred(
  career: CareerRecord,
  you: Applicant,
): 'record' | 'high-school' | 'associate' | 'experience' | null {
  const need = career.requires?.schooling;
  if (need && !meets(you.schooling, need)) return need;
  const exp = career.requires?.experience;
  if (exp && experienceIn(you, exp.careers) < exp.minutes) return 'experience';
  const rule = career.requires?.record;
  if (rule === undefined) return null;
  const count = rule === 'no-felony' ? you.felonies : you.convictions;
  return count > 0 ? 'record' : null;
}

/**
 * The odds in a hundred an application is taken: the base, less the record's points, ± reputation,
 * and the points a preferred credential adds (M2.8, D114).
 */
export function hireOdds(career: CareerRecord, you: Applicant): number {
  const h = career.hiring;
  const record = you.convictions > 0 ? h.record : 0;
  const reputation = Math.floor((h.reputation * (you.reputation - REPUTATION.start)) / REPUTATION.start);
  const preferred = h.prefers && meets(you.schooling, h.prefers.schooling) ? h.prefers.points : 0;
  return Math.min(CEILING, Math.max(FLOOR, h.base - record + reputation + preferred));
}
