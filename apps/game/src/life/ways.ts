/**
 * The ways across the city (M2.9 step 5, D118): on foot, by bus or by a hailed ride, each shown
 * with its minutes and price before you choose. The bus's and the ride's come from the sim's
 * previews (`bus-trip`, `ride-trip`), the same sums `travel/bus` and `travel/ride` take; the walk
 * is the page's own measure along the streets (city/workplace.ts), passed as `time/advance` (D61).
 */
import type { Action } from '@eb/core';
import type { Item } from './menus.ts';
import type { Life } from './session.ts';
import { money } from './words.ts';

export type Way = 'walk' | 'bus' | 'ride';

/** A trip's two ends in the city's metres, and the walk between them along the streets. */
export interface Leg {
  readonly minutes: number;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

export interface WayOption {
  readonly way: Way;
  readonly minutes: number;
  readonly cents: number;
  /** "Walk, 34 minutes", "Bus, 21 minutes, $1.75". */
  readonly label: string;
  /** What the minutes are made of. */
  readonly note: string | null;
}

const NAME: Record<Way, string> = { walk: 'Walk', bus: 'Bus', ride: 'Ride' };

/** The price: none on foot; on the bus, nothing more once the day's cap is paid. */
const priceOf = (way: Way, cents: number) =>
  cents > 0 ? `, ${money(cents)}` : way === 'bus' ? ', the day’s fares paid' : '';

const labelOf = (way: Way, minutes: number, cents: number) =>
  `${NAME[way]}, ${minutes} minute${minutes === 1 ? '' : 's'}${priceOf(way, cents)}`;

/** The leg reversed: the way back. */
export const back = (leg: Leg): Leg => ({ minutes: leg.minutes, from: leg.to, to: leg.from });

/** Each way you can take now: walking always; the bus while one runs; a ride you can pay for. */
export function waysFor(life: Life, leg: Leg): WayOption[] {
  const out: WayOption[] = [
    { way: 'walk', minutes: leg.minutes, cents: 0, label: labelOf('walk', leg.minutes, 0), note: null },
  ];
  const cash = life.fact('economy.amount', { resource: 'cash' }) as number;
  for (const [way, effect, price] of [
    ['bus', 'bus-trip', 'cents'],
    ['ride', 'ride-trip', 'price'],
  ] as const) {
    const p = life.peek<Record<string, number | undefined>>({ effect, from: leg.from, to: leg.to });
    const minutes = p.minutes;
    const cents = p[price];
    if (minutes === undefined || cents === undefined || cents > cash) continue;
    out.push({ way, minutes, cents, label: labelOf(way, minutes, cents), note: noteOf(way, p) });
  }
  return out;
}

const mins = (n: number | undefined) => {
  const m = Math.round(n ?? 0);
  return `${m} minute${m === 1 ? '' : 's'}`;
};

/** The bus's walk, wait, ride and change; the ride's wait for the car. */
function noteOf(way: Way, p: Record<string, number | undefined>): string {
  if (way === 'ride') return `The car comes in ${mins(p.wait)}.`;
  const change = (p.buses ?? 1) > 1 ? `, change and wait ${mins(p.change)}` : '';
  const fares = (p.fares ?? 1) > 1 ? ' Too long a change for the transfer: two fares.' : '';
  return `Walk ${mins(p.walkTo)} to the stop, wait ${mins(p.wait)}, ride ${mins(p.ride)}${change}, then walk ${mins(p.walkFrom)}.${fares}`;
}

/** The action that takes a leg by a way. */
export function wayAction(way: Way, leg: Leg): Action {
  if (way === 'walk') return { type: 'time/advance', minutes: leg.minutes };
  return { type: way === 'bus' ? 'travel/bus' : 'travel/ride', from: leg.from, to: leg.to };
}

/** The way you chose if it can still be taken, else walking: the last bus may have gone. */
export function wayOrWalk(life: Life, way: Way, leg: Leg): Action {
  return waysFor(life, leg).some((w) => w.way === way) ? wayAction(way, leg) : wayAction('walk', leg);
}

/** Whether an action is a trip's leg, which the page shows passing as a fast-forward. */
export const isLeg = (a: Action) => a.type === 'time/advance' || a.type === 'travel/bus' || a.type === 'travel/ride';

/** The choice of ways for a trip: each item the trip's own action, with the way chosen. */
export const wayItems = (life: Life, leg: Leg, a: Action): Item[] =>
  waysFor(life, leg).map((w) => ({
    label: w.label,
    ...(w.note ? { note: w.note } : {}),
    action: { ...a, way: w.way },
  }));
