/**
 * The tier-1 people's hours from their careers (M2.3): a worker works the shifts of the career
 * their workplace employs in (market/employers.ts), not M0.4's templates. Each takes one of its
 * shifts and as many of its open days a week as it allows, drawn from the seed; bedtime follows
 * from the shift as before. The harness keeps the templates (rosterOf).
 */
import type { RecordStore } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { careerOf } from '../job/records.ts';
import { employersOf } from '../market/employers.ts';
import { bedHourFor, eveningOf, mix, type Roster, rosterOf } from './roster.ts';
import type { ShiftTemplate } from './templates.ts';

/** The district your block stands in (D67), as the market has it. */
const HOME = 'inner-ring';

const kept = new Map<string, Roster>();
const KEPT = 4;

/** A career's shift for a person: one of its kinds, on `perWeek` of its open days, by the seed. */
function shiftFor(store: RecordStore, career: string, seed: number, i: number): ShiftTemplate {
  const c = careerOf(store, career);
  const kind = c.shifts[mix(seed, 45, i) % c.shifts.length] as (typeof c.shifts)[number];
  const open = c.open.map((d) => WEEKDAYS.indexOf(d));
  const days = [...open]
    .sort((a, b) => mix(seed, 46, i, a) - mix(seed, 46, i, b))
    .slice(0, Math.min(c.perWeek, open.length))
    .sort((a, b) => a - b);
  return { id: `${career}/${kind.id}`, weight: 0, start: kind.hour * 60 + kind.minute, minutes: kind.minutes, days };
}

/** The roster of a life: the seed's people, each worker on their career's shifts. */
export function careerRoster(store: RecordStore, seed: number, n: number): Roster {
  const careers = [...store.ids('career')].sort();
  const key = `${seed}:${n}:${careers.join(',')}`;
  const found = kept.get(key);
  if (found) return found;
  const base = rosterOf(seed, n);
  const careerAt = new Map(
    employersOf(store, seed, base, HOME)
      .filter((e) => e.place >= 0)
      .map((e) => [e.place, e.career]),
  );
  const people = base.people.map((p, i) => {
    const career = p.work >= 0 && p.shift ? careerAt.get(p.work) : undefined;
    if (!career) return p;
    const shift = shiftFor(store, career, seed, i);
    return { ...p, shift, bedHour: bedHourFor(shift, eveningOf(seed, i), p.sleepHours) };
  });
  const roster: Roster = { ...base, people, shifts: `careers:${careers.join(',')}` };
  if (kept.size >= KEPT) kept.delete(kept.keys().next().value as string);
  kept.set(key, roster);
  return roster;
}

const moved = new Map<string, Roster>();

/**
 * The roster with the people who have left or changed jobs (people/work.ts): `moves` holds
 * [person, place] pairs, place -1 for someone between jobs. Kept by the moves' version, so the
 * hour plans built from it are kept apart from another version's (gather.ts reads `shifts`).
 */
export function rosterWith(
  store: RecordStore,
  seed: number,
  n: number,
  moves: readonly number[],
  version: number,
): Roster {
  const base = careerRoster(store, seed, n);
  if (moves.length === 0) return base;
  const key = `${seed}:${n}:${version}:${base.shifts}`;
  const found = moved.get(key);
  if (found) return found;
  const careerAt = new Map(
    employersOf(store, seed, rosterOf(seed, n), HOME)
      .filter((e) => e.place >= 0)
      .map((e) => [e.place, e.career]),
  );
  const people = [...base.people];
  for (let k = 0; k < moves.length; k += 2) {
    const i = moves[k] as number;
    const place = moves[k + 1] as number;
    const p = people[i];
    if (!p) continue;
    const career = careerAt.get(place);
    if (place < 0 || !career) {
      people[i] = { ...p, work: -1, shift: null, bedHour: eveningOf(seed, i) };
      continue;
    }
    const shift = shiftFor(store, career, seed, i);
    people[i] = { ...p, work: place, shift, bedHour: bedHourFor(shift, eveningOf(seed, i), p.sleepHours) };
  }
  const roster: Roster = { ...base, people, shifts: `${base.shifts}:moved-${version}` };
  if (moved.size >= KEPT) moved.delete(moved.keys().next().value as string);
  moved.set(key, roster);
  return roster;
}
