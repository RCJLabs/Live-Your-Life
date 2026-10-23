/**
 * Everyone's game hour at once, worked out from the roster and kept while it is in use: what
 * each person does, and the people whose meetings with them at a shared place change their
 * ties. All of it is derived from the seed, so a share of the people can be moved on without the
 * rest: someone's ties follow from who was where, not from anyone else's state.
 *
 * An hour at a time, so that moving the people on an hour, or a share of them a day, costs an
 * hour's plan rather than a day's at once; and in flat arrays from counting sorts, because a day
 * of 3,000 people built from maps and small arrays spent a quarter of its time collecting
 * garbage (M0.4).
 */
import { type HourKind, hourOf, placeOf } from './day.ts';
import { mix, type Roster } from './roster.ts';
import { TIES } from './templates.ts';

export interface HourPlan {
  /** What person i does. */
  readonly kinds: readonly HourKind[];
  /**
   * Whom person i met, in the order the meetings happened, once for each meeting:
   * `others[start[i]]` to `others[start[i + 1] - 1]`. Never changed.
   */
  readonly start: Int32Array;
  readonly others: Int32Array;
}

/** Each meeting as two entries, one on each person's list: the person in `of`, whom they met in `who`. */
interface Meetings {
  readonly of: number[];
  readonly who: number[];
}

/** The people at each shared place, by a counting sort: place s's are `people[starts[s]]` to `people[starts[s + 1] - 1]`. */
function byPlace(roster: Roster, placeAt: Int32Array) {
  const shared = roster.places - roster.firstShared;
  const starts = new Int32Array(shared + 1);
  for (const at of placeAt) {
    if (at >= roster.firstShared)
      starts[at - roster.firstShared + 1] = (starts[at - roster.firstShared + 1] as number) + 1;
  }
  for (let s = 0; s < shared; s++) starts[s + 1] = (starts[s + 1] as number) + (starts[s] as number);
  const fill = starts.slice(0, shared);
  const people = new Int32Array(starts[shared] as number);
  placeAt.forEach((at, i) => {
    if (at >= roster.firstShared) people[(fill[at - roster.firstShared] as number)++] = i;
  });
  return { shared, starts, people };
}

/**
 * The hour's meetings: at each shared place, each person there, in person order, meets
 * `TIES.perHour` others picked by the seed, never themselves.
 */
function meetings(roster: Roster, seed: number, hour: number, placeAt: Int32Array): Meetings {
  const { shared, starts, people } = byPlace(roster, placeAt);
  const out: Meetings = { of: [], who: [] };
  for (let s = 0; s < shared; s++) {
    const from = starts[s] as number;
    const len = (starts[s + 1] as number) - from;
    if (len < 2) continue;
    for (let a = 0; a < len; a++) {
      const i = people[from + a] as number;
      for (let m = 0; m < TIES.perHour; m++) {
        const j = people[from + ((a + 1 + (mix(seed, 9, hour, i, m) % (len - 1))) % len)] as number;
        out.of.push(i, j);
        out.who.push(j, i);
      }
    }
  }
  return out;
}

function build(roster: Roster, seed: number, hour: number, weekday: number): HourPlan {
  const n = roster.people.length;
  const day = Math.floor(hour / 24);
  const kinds: HourKind[] = new Array(n);
  const placeAt = new Int32Array(n);
  roster.people.forEach((p, i) => {
    const kind = hourOf(p, seed, i, day, weekday, hour % 24);
    kinds[i] = kind;
    placeAt[i] = placeOf(p, kind.at);
  });
  const met = meetings(roster, seed, hour, placeAt);
  // A stable counting sort by person keeps each person's meetings in the order they happened.
  const start = new Int32Array(n + 1);
  for (const i of met.of) start[i + 1] = (start[i + 1] as number) + 1;
  for (let i = 0; i < n; i++) start[i + 1] = (start[i + 1] as number) + (start[i] as number);
  const fill = start.slice(0, n);
  const others = new Int32Array(met.of.length);
  met.of.forEach((i, e) => {
    others[(fill[i] as number)++] = met.who[e] as number;
  });
  return { kinds, start, others };
}

const plans = new Map<string, HourPlan>();
/** How many hour plans have been built, for the tests that hold a long passage to one plan an hour. */
export const built = { plans: 0 };
/** Hour plans kept: two days', enough for a share settled a day at a time and for the hour before. */
const KEPT = 48;

/** Everyone's hour, counted from the start day's midnight, on a day that is `weekday` (0 for Monday). */
export function planAt(roster: Roster, seed: number, hour: number, weekday: number): HourPlan {
  const key = `${roster.shifts ?? 'templates'}:${seed}:${roster.people.length}:${hour}:${weekday}`;
  let found = plans.get(key);
  if (!found) {
    found = build(roster, seed, hour, weekday);
    built.plans++;
    if (plans.size >= KEPT) plans.delete(plans.keys().next().value as string);
    plans.set(key, found);
  }
  return found;
}
