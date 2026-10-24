/**
 * Meeting the tier-1 people (M2.6, D89): in each game hour you spend at a shared place, at work
 * or out, you meet some of the people the hour's plan puts there, as they meet each other
 * (people/gather.ts). Who is there comes from the same plans the people are moved on by, so the
 * bar is full on a Friday night for the same reason the street is.
 */
import type { FactView, ModuleContext, PreviewContext, RecordStore } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { rosterWith } from '../people/careers.ts';
import { type HourKind, placeOf } from '../people/day.ts';
import { planAt } from '../people/gather.ts';
import { LINKED, mix, type Roster } from '../people/roster.ts';
import { whoIs } from '../people/who.ts';
import { namePoolOf } from '../ties/records.ts';
import { populationOf } from './records.ts';
import { type CircleSlice, MET_ONCE, newTie } from './state.ts';

type View = FactView<unknown> | ModuleContext<unknown> | PreviewContext<unknown>;

/** The roster as the people are now, with whoever has left or changed jobs. */
export function rosterNow(v: View): Roster | null {
  const n = v.fact('people.count') as number;
  if (n === 0) return null;
  const moves = v.fact('people-work.moves') as number[];
  return rosterWith(v.content, v.fact('people.seed') as number, n, moves, v.fact('people-work.version') as number);
}

/** The third places you go out to: a few of the city's, by the people's seed, as each of them has one. */
export function hauntsOf(roster: Roster, seed: number, count: number): number[] {
  const thirds = roster.places - roster.firstThird;
  const out: number[] = [];
  for (let k = 0; out.length < Math.min(count, thirds) && k < count * 8; k++) {
    const place = roster.firstThird + (mix(seed, 71, k) % thirds);
    if (!out.includes(place)) out.push(place);
  }
  return out;
}

/** The people at a place in an hour, linked people aside: they are known through their own modules. */
export function presentAt(roster: Roster, seed: number, hour: number, weekday: number, place: number): number[] {
  const plan = planAt(roster, seed, hour, weekday);
  const here: number[] = [];
  roster.people.forEach((p, i) => {
    if (i >= LINKED.count && placeOf(p, (plan.kinds[i] as HourKind).at) === place) here.push(i);
  });
  return here;
}

/** A person's full name, for the chronicle. */
export function nameOf(store: RecordStore, seed: number, person: number): string {
  const pop = populationOf(store);
  const who = whoIs(pop, namePoolOf(store, pop.names), seed, person);
  return `${who.first} ${who.last}`;
}

/** Time together with someone: added to a tie, or a new one if there's room, or in place of someone met once. */
function together(ctx: ModuleContext<CircleSlice>, seed: number, person: number, minutes: number, day: number): void {
  const slice = ctx.write();
  const tie = slice.ties.find((t) => t.person === person);
  if (tie) {
    tie.together += minutes;
    tie.seen = day;
    return;
  }
  const kept = populationOf(ctx.content).ties.kept;
  if (slice.ties.length >= kept) {
    const known = slice.ties.filter((t) => t.status !== 'dating');
    if (known.length === 0) return;
    const least = known.reduce((a, b) => (b.together < a.together ? b : a));
    if (least.together > MET_ONCE) return;
    slice.ties = slice.ties.filter((t) => t !== least);
  }
  slice.ties.push(newTie(person, minutes, day));
  ctx.emit('met', { person, name: nameOf(ctx.content, seed, person) });
}

/**
 * The hours from `from` to `to` (minutes since the life's first midnight) at `place`: in each, the
 * people you meet there, `perHour` of those present by the seed, each for the minutes of the hour
 * you shared, counted at `weight` in a hundred.
 */
export function meetAt(ctx: ModuleContext<CircleSlice>, place: number, from: number, to: number, weight: number): void {
  const roster = rosterNow(ctx);
  if (!roster || to <= from || weight === 0) return;
  const seed = ctx.fact('people.seed') as number;
  const day = ctx.fact('time.day') as number;
  const weekday = WEEKDAYS.indexOf(ctx.fact('time.weekday') as (typeof WEEKDAYS)[number]);
  const perHour = populationOf(ctx.content).ties.perHour;
  for (let hour = Math.floor(from / 60); hour * 60 < to; hour++) {
    const minutes = Math.min(to, hour * 60 + 60) - Math.max(from, hour * 60);
    const onDay = Math.floor(hour / 24);
    const here = presentAt(roster, seed, hour, (((weekday - (day - onDay)) % 7) + 7) % 7, place);
    const counted = Math.floor((minutes * weight) / 100);
    for (let m = 0; m < Math.min(perHour, here.length) && counted > 0; m++) {
      const at = mix(seed, 72, hour, m) % here.length;
      const person = here.splice(at, 1)[0] as number;
      together(ctx, seed, person, counted, onDay);
    }
  }
}
