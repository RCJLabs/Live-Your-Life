/**
 * The trade the deal module reads (packages/content/types/trade.json, D78, D82), with the checks a
 * type file can't carry, as the law's records have them (law/records.ts): an hour's span inside a
 * day, weights that the charges cover in order.
 */
import type { RecordStore } from '@eb/core';
import type { Hours } from '../law/records.ts';
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
