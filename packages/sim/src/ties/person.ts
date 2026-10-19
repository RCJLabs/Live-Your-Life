/**
 * The coworker as a person (D41): who they are, drawn from the seed and the name pool once, at
 * hire; the days they work, worked out from their own seed rather than stored (Landnám's rule);
 * and the lines about them, filled in with their name and pronouns.
 */
import type { Rng } from '@eb/core';
import { type Today, weekdayOn } from '../job/days.ts';
import { mix } from '../people/roster.ts';
import type { Crew, NamePool, Pronouns } from './records.ts';

export interface Coworker {
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
  readonly age: number;
  /** What their week is worked out from. */
  readonly seed: number;
}

export function drawCoworker(pool: NamePool, crew: Crew, rng: Rng): Coworker {
  const first = rng.pick(pool.first);
  return {
    first: first.name,
    last: rng.pick(pool.last),
    pronouns: first.pronouns,
    age: rng.int(crew.ages.min, crew.ages.max),
    seed: rng.int(0, 0x7fffffff),
  };
}

const FORMS: Readonly<Record<Pronouns, { readonly them: string; readonly their: string }>> = {
  she: { them: 'her', their: 'her' },
  he: { them: 'him', their: 'his' },
  they: { them: 'them', their: 'their' },
};

/** A line about them with their name and pronouns in it. Lines name them rather than say "she" or "they", so no verb has to agree. */
export const fill = (text: string, who: Pick<Coworker, 'first' | 'pronouns'>): string =>
  text
    .replaceAll('{name}', who.first)
    .replaceAll('{them}', FORMS[who.pronouns].them)
    .replaceAll('{their}', FORMS[who.pronouns].their);

/** The Monday-to-Sunday week a day falls in, counted from the week the life began in: it never moves. */
const weekOfLife = (today: Today, day: number): number =>
  Math.floor((day + ((((today.weekday - today.day) % 7) + 7) % 7)) / 7);

/** The weekdays they have off in a week, from Monday (0): 7 − `days` of them, drawn from their seed. */
export function daysOff(seed: number, week: number, days: number): number[] {
  const order = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < 7 - days; i++) {
    const j = i + (mix(seed, week, i) % (7 - i));
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  return order.slice(0, 7 - days).sort((a, b) => a - b);
}

/** Whether they work a day by their week, before any favour. */
export const works = (who: Coworker, crew: Crew, today: Today, day: number): boolean =>
  !daysOff(who.seed, weekOfLife(today, day), crew.days).includes(weekdayOn(today, day));

/** The shift they work on a day you're not on: the diner pairs its two cooks, so on yours they're on yours. */
export const theirShift = (who: Coworker, kinds: readonly string[], day: number): string =>
  kinds[mix(who.seed, day, 7) % kinds.length] as string;
