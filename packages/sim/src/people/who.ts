/**
 * Who a tier-1 person is (M2.6, D89, D91): a name with its pronouns, an adult age, and whom they
 * are drawn to, worked out from the people's seed and their number and never stored, as the rest
 * of the roster is (Landnám's rule). Met people are named the same on every device.
 */
import type { PopulationRecord } from '../circle/records.ts';
import type { NamePool, Pronouns } from '../ties/records.ts';
import { mix } from './roster.ts';

/** Whom someone can be drawn to: the gender a binary-pronoun person isn't, their own, or anyone. */
export type DrawnTo = 'women' | 'men' | 'anyone';
export const DRAWN_TO: readonly DrawnTo[] = ['women', 'men', 'anyone'];

/** The youngest anyone can be courted at: the out list's line (CLAUDE.md, D89). */
export const ADULT = 18;

export interface Who {
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
  /** Their age on the life's first day. */
  readonly age: number;
  readonly drawnTo: DrawnTo;
  /** Whether their body can carry a pregnancy (D96), by their pronouns' share. */
  readonly carries: boolean;
}

/** Whether a body can carry, from a roll of a thousand and the pronouns' share (D96). */
export const carriesFor = (pop: PopulationRecord, pronouns: Pronouns, roll: number): boolean =>
  roll % 1000 < pop.carry[pronouns];

/** The gender a person's pronouns stand for here: she as a woman, he as a man, they as neither. */
const genderOf = (p: Pronouns): DrawnTo | null => (p === 'she' ? 'women' : p === 'he' ? 'men' : null);

/** An age from the bands, by their shares of a thousand. */
function ageFrom(pop: PopulationRecord, roll: number, within: number): number {
  let left = roll % 1000;
  for (const band of pop.ages) {
    if (left < band.share) return band.from + (within % (band.to - band.from + 1));
    left -= band.share;
  }
  const last = pop.ages[pop.ages.length - 1] as PopulationRecord['ages'][number];
  return last.to;
}

/**
 * Whom someone of an age and pronouns is drawn to, from a roll of a thousand and their age's
 * shares. Someone who uses they, drawn to one gender, is drawn to women or men by a second roll.
 */
export function drawnFor(pop: PopulationRecord, age: number, pronouns: Pronouns, roll: number, side: number): DrawnTo {
  const band =
    pop.drawn.find((d) => age >= d.from && age <= d.to) ??
    (pop.drawn[pop.drawn.length - 1] as PopulationRecord['drawn'][number]);
  const r = roll % 1000;
  if (r >= band.same && r < band.same + band.both) return 'anyone';
  const own = genderOf(pronouns);
  if (own === null) return side % 2 === 0 ? 'women' : 'men';
  const other: DrawnTo = own === 'women' ? 'men' : 'women';
  return r < band.same ? own : other;
}

/** Person i of the people seeded `seed`. */
export function whoIs(pop: PopulationRecord, pool: NamePool, seed: number, i: number): Who {
  const first = pool.first[mix(seed, 60, i) % pool.first.length] as NamePool['first'][number];
  const age = ageFrom(pop, mix(seed, 61, i), mix(seed, 62, i));
  if (age < ADULT) throw new Error(`people: person ${i} drawn at ${age}, under ${ADULT}`);
  return {
    first: first.name,
    last: pool.last[mix(seed, 63, i) % pool.last.length] as string,
    pronouns: first.pronouns,
    age,
    drawnTo: drawnFor(pop, age, first.pronouns, mix(seed, 64, i), mix(seed, 65, i)),
    carries: carriesFor(pop, first.pronouns, mix(seed, 69, i)),
  };
}

/** Whether someone drawn to `to` can be drawn to a person who uses `pronouns`. */
export const drawnBy = (to: DrawnTo, pronouns: Pronouns): boolean => to === 'anyone' || to === genderOf(pronouns);

/**
 * How drawn person i is to you, 0 to 100: none when they can't be, by whom they are drawn to, or
 * when either of you is under 18 (D89); otherwise the pair's chemistry from the seed, less points
 * for each year of age between you past the free ones (tune). Whether you are drawn to them is
 * yours (D91), and decides only what you can ask of them.
 */
export function chemistry(
  pop: PopulationRecord,
  seed: number,
  i: number,
  them: Who,
  you: { readonly pronouns: Pronouns; readonly age: number },
  days: number,
): number {
  const theirAge = them.age + Math.floor(days / 365);
  if (theirAge < ADULT || you.age < ADULT || !drawnBy(them.drawnTo, you.pronouns)) return 0;
  const gap = Math.max(0, Math.abs(theirAge - you.age) - pop.chemistry.free);
  return Math.max(0, (mix(seed, 66, i) % 101) - gap * pop.chemistry.per);
}
