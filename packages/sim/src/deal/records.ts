/**
 * The trade the deal module reads (packages/content/types/trade.json, D78, D82), with the checks a
 * type file can't carry, as the law's records have them (law/records.ts): an hour's span inside a
 * day, weights that the charges cover in order.
 */
import type { RecordStore } from '@eb/core';
import type { Hours, Span } from '../law/records.ts';
import { offenceOf } from '../law/records.ts';

/** The slice's trade (D82): one. */
export const TRADE = 'cocaine';

export interface Lot {
  readonly id: string;
  /** Tenths of a gram. */
  readonly grams: number;
  /** Cents. */
  readonly price: number;
}

export interface TradeRecord {
  readonly name: string;
  readonly names: string;
  readonly supplier: { readonly hours: Hours; readonly sells: readonly Lot[] };
  readonly sale: { readonly grams: number; readonly price: number };
  readonly corner: { readonly buyers: readonly number[]; readonly passing: number };
  readonly seen: { readonly base: number; readonly witness: number; readonly per: number; readonly most: number };
  readonly heat: { readonly sale: number; readonly seen: number; readonly keep: number };
  readonly possession: readonly string[];
  readonly delivery: readonly string[];
  readonly police: { readonly enough: number; readonly raid: Span };
  readonly bail: { readonly bond: number; readonly posted: number; readonly hour: number };
  readonly court: Span;
  readonly contest: { readonly seen: number; readonly found: number };
  readonly crew: Crew;
  readonly boss: Boss;
  /** Rival crews on corners (M4.1 step 2, D148). */
  readonly rivals: { readonly held: number; readonly warnings: number; readonly off: number };
}

/** A crew of your own (M4.1, D145): the wholesale connect, and the terms you set your recruits. */
export interface Boss {
  readonly connect: {
    readonly trust: number;
    readonly heat: number;
    readonly hours: Hours;
    readonly sells: readonly Lot[];
    /** The most you can hold with the connect, in tenths of a gram. */
    readonly most: number;
  };
  readonly crew: {
    readonly most: number;
    readonly regard: number;
    readonly familiarity: number;
    readonly front: { readonly grams: number; readonly price: number; readonly days: number };
    readonly nights: number;
    readonly buyers: number;
    readonly seen: number;
    readonly named: number;
  };
}

/** The supplier's crew (D79, D84–D86). */
export interface Crew {
  readonly trust: number;
  readonly heat: number;
  readonly front: { readonly lot: string; readonly price: number; readonly days: number };
  readonly unpaid: number;
  readonly recruit: {
    readonly regard: number;
    readonly familiarity: number;
    readonly nights: number;
    readonly buyers: number;
    readonly share: number;
    readonly seen: number;
    readonly named: number;
    readonly act: string;
  };
}

const fail = (what: string, why: string): never => {
  throw new Error(`${what}: ${why}`);
};

const checked = new WeakSet<object>();

/** Charges in order of weight: each covers more than the one before, and the last covers whatever is left. */
function inWeight(store: RecordStore, what: string, ids: readonly string[]): void {
  let under = 0;
  ids.forEach((id, i) => {
    const o = offenceOf(store, id);
    if (o.grams === undefined) {
      if (i < ids.length - 1) fail(what, `"${id}" covers any weight, but isn't last`);
      return;
    }
    if (o.grams <= under) fail(what, `"${id}" covers no more than the charge before it`);
    under = o.grams;
  });
}

export function tradeOf(store: RecordStore, id: string = TRADE): TradeRecord {
  const t = store.get<TradeRecord>('trade', id) ?? fail(`trade "${id}"`, 'no such record');
  if (checked.has(t)) return t;
  const what = `trade "${id}"`;
  const h = t.supplier.hours;
  if (h.from >= h.to) fail(what, `the supplier's hours end at ${h.to}, not after ${h.from}`);
  const lots = new Set(t.supplier.sells.map((l) => l.id));
  if (lots.size !== t.supplier.sells.length) fail(what, 'two of what the supplier sells share an id');
  if (t.seen.base > t.seen.most) fail(what, 'its odds of being seen start above their most');
  if (!lots.has(t.crew.front.lot)) fail(what, `the crew fronts "${t.crew.front.lot}", which the supplier doesn't sell`);
  for (const [name, span] of [
    ['police.raid', t.police.raid],
    ['court', t.court],
  ] as const)
    if (span.min > span.max) fail(what, `${name} runs from ${span.min} down to ${span.max}`);
  const c = t.boss.connect;
  if (c.hours.from >= c.hours.to) fail(what, `the connect's hours end at ${c.hours.to}, not after ${c.hours.from}`);
  if (new Set(c.sells.map((l) => l.id)).size !== c.sells.length)
    fail(what, 'two of what the connect sells share an id');
  for (const l of c.sells) if (l.grams > c.most) fail(what, `the connect's "${l.id}" is more than you can hold`);
  if (t.boss.crew.front.grams > c.most) fail(what, 'your crew’s front is more than you can hold');
  inWeight(store, what, t.possession);
  inWeight(store, what, t.delivery);
  checked.add(t);
  return t;
}

/**
 * What holding or selling `grams` is charged as, for someone with `convictions`: the first of
 * `offences` whose weight covers it and whose priors allow the record; the last covers the rest.
 */
export function chargeFor(store: RecordStore, offences: readonly string[], grams: number, convictions: number): string {
  const fits = offences.find((id) => {
    const o = offenceOf(store, id);
    return (o.grams === undefined || grams < o.grams) && convictions <= o.priors;
  });
  return fits ?? (offences.at(-1) as string);
}
