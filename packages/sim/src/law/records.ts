/**
 * The records the law module reads (packages/content/types/crime.json, offence.json, fence.json
 * and item.json, the inventory kit's with a food field), with the checks a type file can't carry:
 * a range's ends in order, an hour's span inside a day. A bad record throws when it is read,
 * naming itself, as the job's do (job/records.ts).
 */
import type { RecordStore } from '@eb/core';
import type { ItemRecord } from '@eb/kits';

export interface Span {
  readonly min: number;
  readonly max: number;
}
export interface Hours {
  readonly from: number;
  readonly to: number;
}

export interface OffenceRecord {
  readonly name: string;
  readonly law: string;
  /** It covers goods worth less than this, in cents; any value when left out. */
  readonly under?: number;
  readonly priors: number;
  readonly days: number;
  readonly fineMax: number;
  readonly timesValue: number;
  /** What a court in the slice imposes on a conviction, in cents. */
  readonly fine: number;
  readonly costs: number;
  /** For a controlled substance: it covers less than this weight, in tenths of a gram (D82). */
  readonly grams?: number;
  readonly felony?: boolean;
  /** A first offence can be deferred, under HYTA (D47). */
  readonly deferral?: boolean;
  /** A felony's sentence with no conviction before: days in jail, then on probation. */
  readonly first?: { readonly jail: Span; readonly probation: number };
  /** With a conviction before: months in prison. */
  readonly repeat?: { readonly prison: Span };
}

export interface CrimeRecord {
  readonly name: string;
  /** What it is charged as: the first that covers the value and the record. */
  readonly offences: readonly string[];
  /** Whether a shop that catches you bars you for good. */
  readonly bars: boolean;
  readonly noticed: { readonly clerk: number; readonly camera: number; readonly unseen: number };
  readonly heat: { readonly theft: number; readonly caught: number; readonly keep: number; readonly per: number };
  readonly open: Hours;
  readonly review: number;
  readonly police: Span;
  readonly visit: Span;
  readonly court: Span;
  readonly hearing: Hours;
  readonly contest: { readonly held: number; readonly camera: number };
  readonly hyta: { readonly age: number; readonly days: number; readonly every: number; readonly fee: number };
  readonly demand: { readonly times: number; readonly min: number; readonly max: number };
  readonly jail: number;
}

export interface FenceRecord {
  readonly name: string;
  readonly names: string;
  readonly share: number;
  readonly hours: Hours;
  readonly trouble: number;
  readonly offences: readonly string[];
}

export interface Good extends ItemRecord {
  readonly name: string;
  readonly value: number;
  readonly food?: number;
}

/** The slice's crime and fence (M1.5): one of each. */
export const SHOPLIFTING = 'shoplifting';
export const FENCE = 'back-lot';

const fail = (what: string, problem: string): never => {
  throw new Error(`${what}: ${problem}`);
};

const inOrder = (what: string, name: string, s: Span): void => {
  if (s.min > s.max) fail(what, `${name} runs from ${s.min} down to ${s.max}`);
};
const inDay = (what: string, name: string, h: Hours): void => {
  if (h.from >= h.to) fail(what, `${name} ends at ${h.to}, not after ${h.from}`);
};

export const offenceOf = (store: RecordStore, id: string): OffenceRecord =>
  store.get<OffenceRecord>('offence', id) ?? fail(`offence "${id}"`, 'no such record');

// Each record is checked once: records are frozen, and the module reads them many times a turn.
const checked = new WeakSet<object>();

export function crimeOf(store: RecordStore, id: string): CrimeRecord {
  const c = store.get<CrimeRecord>('crime', id) ?? fail(`crime "${id}"`, 'no such record');
  if (checked.has(c)) return c;
  const what = `crime "${id}"`;
  for (const o of c.offences) offenceOf(store, o);
  for (const [name, span] of [
    ['police', c.police],
    ['visit', c.visit],
    ['court', c.court],
  ] as const)
    inOrder(what, name, span);
  inDay(what, 'open', c.open);
  inDay(what, 'hearing', c.hearing);
  if (c.review >= c.open.from && c.review < c.open.to) fail(what, 'reviews its footage while it is open');
  if (c.demand.min > c.demand.max) fail(what, 'its demand runs from more to less');
  checked.add(c);
  return c;
}

export function fenceOf(store: RecordStore, id: string): FenceRecord {
  const f = store.get<FenceRecord>('fence', id) ?? fail(`fence "${id}"`, 'no such record');
  if (checked.has(f)) return f;
  inDay(`fence "${id}"`, 'hours', f.hours);
  for (const o of f.offences) offenceOf(store, o);
  checked.add(f);
  return f;
}

/**
 * What a crime of `value` cents is charged as, for someone with `convictions` on their record:
 * the first of `offences` that covers both. A prior conviction makes a third-degree theft a
 * second-degree one (MCL 750.356d). The last covers whatever the others don't.
 */
export function offenceFor(store: RecordStore, offences: readonly string[], value: number, convictions: number) {
  const fits = offences.find((id) => {
    const o = offenceOf(store, id);
    return (o.under === undefined || value < o.under) && convictions <= o.priors;
  });
  return fits ?? (offences.at(-1) as string);
}

export function goodOf(store: RecordStore, id: string): Good {
  const g = store.get<Good>('item', id) ?? fail(`item "${id}"`, 'no such record');
  if (g.value === undefined || g.value < 1) fail(`item "${id}"`, 'has no retail price');
  return g;
}

const stocked = new WeakMap<RecordStore, Map<string, readonly string[]>>();

/** The goods a shelf of `stock` holds, sorted by id. Read every turn, so kept per record store. */
export function goodsOn(store: RecordStore, stock: string): readonly string[] {
  let byStock = stocked.get(store);
  if (!byStock) {
    byStock = new Map();
    stocked.set(store, byStock);
  }
  const known = byStock.get(stock);
  if (known) return known;
  const goods = store.entries<Good>('item').flatMap(([id, g]) => ((g.tags ?? []).includes(stock) ? [id] : []));
  byStock.set(stock, goods);
  return goods;
}
