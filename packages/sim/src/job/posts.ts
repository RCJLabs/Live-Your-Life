/**
 * A rank that is one post at an employer, held by someone (M2.5, D124): the post comes open when
 * its holder leaves, at the rank's turnover, and stays open three weeks for whoever is ready.
 * Worked out from the seed, the employer and the day, so nothing is saved and the Jobs tab and the
 * promotion read the same answer.
 */
import { hashOf } from '../market/employers.ts';
import { mix } from '../people/roster.ts';

/** Days a post stays open once its holder has left (tune). */
export const POST_OPEN_DAYS = 21;

/**
 * Whether the holder leaves on `day`: turnover is separations a month in a thousand staff. A round
 * of mixing after the day: with the day last, consecutive days drew leavings in clumps (M2.5).
 */
const leaves = (seed: number, key: number, turnover: number, day: number): boolean =>
  mix(seed, 71, key, day, 1) % 30000 < turnover;

/** Whether the post of `career` at `employer` is open on `day`: its holder left in the three weeks to it. */
export function postOpen(seed: number, employer: string, career: string, turnover: number, day: number): boolean {
  const key = hashOf(`${employer}/${career}`);
  for (let d = day - POST_OPEN_DAYS + 1; d <= day; d++) if (leaves(seed, key, turnover, d)) return true;
  return false;
}
