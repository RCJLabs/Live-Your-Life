/**
 * Who the tier-1 people are: households, shifts, workplaces, third places, sleep and how
 * sociable each is. All of it is worked out from the seed, never stored (Dirtbag's
 * `presence.ts`, Landnám's rule: if a fact can be computed it does not go in the save); the
 * state holds only what changes.
 */
import { HOUSEHOLD, SHARED, SHIFTS, type ShiftTemplate, SLEEP } from './templates.ts';

/** A small integer hash: the same parts give the same number on every device. */
export function mix(...parts: readonly number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export interface Person {
  /** Places are numbered: homes first, then workplaces, then third places. */
  readonly home: number;
  /** -1 for someone with no shift. */
  readonly work: number;
  readonly third: number;
  readonly shift: ShiftTemplate | null;
  /** The hour they go to bed, counted on past midnight (25 is 1 am). */
  readonly bedHour: number;
  readonly sleepHours: number;
  /** 0 to 99: the chance in a hundred of an evening out. */
  readonly social: number;
}

/** The people whose hours come from another module (D70): the coworker first, then the fence. */
export const LINKED = { coworker: 0, fence: 1, count: 2 } as const;

export interface Roster {
  readonly people: readonly Person[];
  readonly places: number;
  /** Places numbered from here on are shared: workplaces and third places, where people meet. */
  readonly firstShared: number;
  /** And from here on, third places: a bar, a gym, a church hall. */
  readonly firstThird: number;
}

const pickShift = (roll: number): ShiftTemplate => {
  const total = SHIFTS.reduce((s, t) => s + t.weight, 0);
  let left = roll % total;
  for (const t of SHIFTS) {
    if (left < t.weight) return t;
    left -= t.weight;
  }
  return SHIFTS[SHIFTS.length - 1] as ShiftTemplate;
};

function build(seed: number, n: number): Roster {
  const homes: number[] = [];
  for (let place = 0; homes.length < n; place++) {
    const size = HOUSEHOLD[mix(seed, 1, place) % HOUSEHOLD.length] as number;
    for (let k = 0; k < size && homes.length < n; k++) homes.push(place);
  }
  const homeCount = (homes[homes.length - 1] ?? -1) + 1;
  // The coworker and the fence (D70) work the hours their own modules give them, not a template's.
  const none = SHIFTS.find((t) => t.minutes === 0) as ShiftTemplate;
  const shifts = homes.map((_, i) => (i < LINKED.count ? none : pickShift(mix(seed, 2, i))));
  const employed = shifts.filter((s) => s.minutes > 0).length;
  const workplaces = Math.max(1, Math.ceil(employed / SHARED.workplace));
  const thirds = Math.max(1, Math.ceil(n / SHARED.thirdPlace));
  const people = homes.map((home, i): Person => {
    const shift = shifts[i] as ShiftTemplate;
    const working = shift.minutes > 0;
    const [early, late] = SLEEP.bedtime;
    const evening = Math.floor((early + (mix(seed, 5, i) % (late - early + 1))) / 60);
    const sleepHours = SLEEP.hours[0] + (mix(seed, 6, i) % (SLEEP.hours[1] - SLEEP.hours[0] + 1));
    return {
      home,
      work: working ? homeCount + (mix(seed, 3, i) % workplaces) : -1,
      third: homeCount + workplaces + (mix(seed, 4, i) % thirds),
      shift: working ? shift : null,
      bedHour: working ? bedHourFor(shift, evening, sleepHours) : evening,
      sleepHours,
      social: mix(seed, 7, i) % 100,
    };
  });
  return {
    people,
    places: homeCount + workplaces + thirds,
    firstShared: homeCount,
    firstThird: homeCount + workplaces,
  };
}

/**
 * When a shift worker goes to bed. After a night shift, in the morning, an hour after it ends.
 * Otherwise in their evening window, but early enough to sleep their hours and be up two hours
 * before the shift starts, and not before an hour after it ends.
 */
function bedHourFor(shift: ShiftTemplate, evening: number, sleepHours: number): number {
  const start = shift.start / 60;
  const end = (shift.start + shift.minutes) / 60;
  if (end > 24) return end - 24 + 1;
  return Math.max(Math.ceil(end) + 1, Math.min(evening, start + 24 - 2 - sleepHours));
}

const rosters = new Map<string, Roster>();
/** Rosters kept at once: enough for a few games side by side, not a sweep's every seed. */
const KEPT = 4;

/** The roster for a seed and a head count, worked out once and kept while it is in use. */
export function rosterOf(seed: number, n: number): Roster {
  const key = `${seed}:${n}`;
  let found = rosters.get(key);
  if (!found) {
    found = build(seed, n);
    if (rosters.size >= KEPT) rosters.delete(rosters.keys().next().value as string);
    rosters.set(key, found);
  }
  return found;
}
