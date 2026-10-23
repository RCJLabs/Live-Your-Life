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
  readonly reputation: number;
}

/** Why you can't be hired into a career at all, or null. Every offence so far is theft (M1.5). */
export function barred(career: CareerRecord, you: Applicant): 'record' | null {
  const rule = career.requires?.record;
  return rule !== undefined && you.convictions > 0 ? 'record' : null;
}

/** The odds in a hundred an application is taken: the base, less the record's points, ± reputation. */
export function hireOdds(career: CareerRecord, you: Applicant): number {
  const h = career.hiring;
  const record = you.convictions > 0 ? h.record : 0;
  const reputation = Math.floor((h.reputation * (you.reputation - REPUTATION.start)) / REPUTATION.start);
  return Math.min(CEILING, Math.max(FLOOR, h.base - record + reputation));
}
