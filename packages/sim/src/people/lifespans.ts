/**
 * Who holds each of the city's places over the years (M2.7 step 1b, D106). The person in a place
 * lives each year at the life table's odds for their age and body, the roll drawn from the seed,
 * not the run's stream, since their deaths don't hang on what you do. When one dies, a newcomer
 * moves into their place the next day. All of it is worked out from the seed and the day, never
 * stored, as the rest of the roster is (Landnám's rule).
 */
import type { PopulationRecord } from '../circle/records.ts';
import { type MortalityRecord, yearChance } from '../lives/records.ts';
import type { NamePool } from '../ties/records.ts';
import { LINKED, mix } from './roster.ts';
import { type Who, whoIs } from './who.ts';

export interface Occupant {
  /** 0 for the one there on the life's first day, then 1, 2… for each newcomer. */
  readonly gen: number;
  /** The day they came: 0 for the first. */
  readonly since: number;
  readonly who: Who;
  /** Who held the place before, and the day they died; null for the first. */
  readonly before: { readonly who: Who; readonly died: number } | null;
}

/** The newcomer `gen` into place `i`: their own draw, by the same bands as everyone. */
const whoAt = (pop: PopulationRecord, pool: NamePool, seed: number, i: number, gen: number): Who =>
  whoIs(pop, pool, gen === 0 ? seed : mix(seed, 95, gen), i);

/** The day the occupant `gen` of place `i` dies, if before `until`, or -1. */
function deathOf(
  m: MortalityRecord,
  seed: number,
  i: number,
  gen: number,
  who: Who,
  since: number,
  until: number,
): number {
  for (let k = 0; since + k * 365 <= until; k++) {
    const q = yearChance(m, who.age + k, who.carries);
    if (mix(seed, 93, i, gen, k) % 100_000 < q) {
      const day = since + k * 365 + (mix(seed, 94, i, gen, k) % 365);
      return day <= until ? day : -1;
    }
  }
  return -1;
}

/** Who holds place `i` on `day`. */
export function occupantAt(
  pop: PopulationRecord,
  pool: NamePool,
  m: MortalityRecord,
  seed: number,
  i: number,
  day: number,
): Occupant {
  let gen = 0;
  let since = 0;
  let who = whoAt(pop, pool, seed, i, 0);
  let before: Occupant['before'] = null;
  // The coworker, the fence and the supplier have modules of their own, and stay (open question).
  if (i < LINKED.count) return { gen, since, who, before };
  for (;;) {
    const died = deathOf(m, seed, i, gen, who, since, day);
    // Died before today: the newcomer came the day after. Died today: the place is theirs till tomorrow.
    if (died < 0 || died + 1 > day) return { gen, since, who, before };
    before = { who, died };
    gen++;
    since = died + 1;
    who = whoAt(pop, pool, seed, i, gen);
  }
}

/** Their age on `day`: their age when they came, and the years since. */
export const ageOn = (o: Occupant, day: number): number => o.who.age + Math.floor((day - o.since) / 365);
