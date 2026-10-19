/**
 * The corner shop as the law sees it (D45): its shelves, who sees each one, and the odds of
 * being noticed at it now. The shop is worked out from the block's seed whenever it is needed,
 * never stored; a few blocks are kept, as a bot plays one life's block over and over.
 */
import type { RecordStore } from '@eb/core';
import { planBlock } from '../city/block.ts';
import { type BlockTemplates, blockTemplates } from '../city/records.ts';
import { type ShopSight, type Spot, shopSight } from '../city/sight.ts';
import { mix } from '../people/roster.ts';
import { type CrimeRecord, goodsOn } from './records.ts';

const SLICE_BLOCK = 'slice';
const KEEP = 32;

const templates = new WeakMap<RecordStore, BlockTemplates>();
const shops = new Map<string, ShopSight>();

/** The shop on a block, with who sees each shelf. */
export function shopOn(store: RecordStore, block: string): ShopSight {
  const known = shops.get(block);
  if (known) return known;
  let t = templates.get(store);
  if (!t) {
    t = blockTemplates(store, SLICE_BLOCK);
    templates.set(store, t);
  }
  const sight = shopSight(t, planBlock(t, block));
  if (!sight) throw new Error(`block "${block}": no shop with anyone watching`);
  if (shops.size >= KEEP) shops.delete(shops.keys().next().value as string);
  shops.set(block, sight);
  return sight;
}

export const spotOf = (sight: ShopSight, id: string): Spot | undefined => sight.spots.find((s) => s.id === id);

const stocks = new WeakMap<ShopSight, readonly { spot: string; item: string }[]>();

/**
 * What each shelf holds: one line of goods to a shelf, as a shop stocks a section. The goods of
 * a kind go round its shelves in order from a place drawn from the block, so each is somewhere
 * when there are as many shelves as goods, and the shop's takes are as many as its shelves.
 */
export function stockOf(store: RecordStore, block: string): readonly { spot: string; item: string }[] {
  const sight = shopOn(store, block);
  const known = stocks.get(sight);
  if (known) return known;
  const seen = new Map<string, number>();
  const list = sight.spots.flatMap((spot) => {
    const goods = goodsOn(store, spot.stock);
    if (goods.length === 0) return [];
    const n = seen.get(spot.stock) ?? 0;
    seen.set(spot.stock, n + 1);
    const start = mix(block.length, ...[...block].map((c) => c.charCodeAt(0)), spot.stock.length) % goods.length;
    return [{ spot: spot.id, item: goods[(start + n) % goods.length] as string }];
  });
  stocks.set(sight, list);
  return list;
}

const clamp = (n: number): number => Math.min(95, Math.max(1, n));

/**
 * The odds in percent of being noticed taking from a shelf (D45): held now, by the clerk if they
 * see the shelf, or by chance if not; and, if the camera sees it, known from the footage at
 * close. Heat adds a point for every `per` of it. 0 for footage where no camera looks.
 */
export function oddsAt(sight: ShopSight, spot: Spot, crime: CrimeRecord, heat: number) {
  const by = (who: 'clerk' | 'camera') =>
    spot.seenBy.some((id) => sight.watchers.find((w) => w.id === id)?.who === who);
  const extra = Math.floor(heat / crime.heat.per);
  return {
    held: clamp((by('clerk') ? crime.noticed.clerk : crime.noticed.unseen) + extra),
    filmed: by('camera') ? clamp(crime.noticed.camera + extra) : 0,
  };
}
