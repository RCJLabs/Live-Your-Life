/**
 * What you do with what you took (D48): sell it to the fence behind the diner, at their hours,
 * for a share of its price, at odds shown first that the sale comes back to you; or eat it, if
 * it is food. The fence is drawn from the seed and the name pool, as the coworker is.
 */
import type { Action, Effect, PreviewContext, RecordStore, Rng } from '@eb/core';
import { namePoolOf } from '../ties/records.ts';
import { FENCE, fenceOf, goodOf } from './records.ts';
import type { LawContext, LawSlice, LawView } from './state.ts';

export interface Fence {
  readonly first: string;
  readonly last: string;
}

/** The fence, or null in a world without one: a test's, with no content. */
export function drawFence(store: RecordStore, rng: Rng): Fence | null {
  if (!store.has('fence', FENCE)) return null;
  const pool = namePoolOf(store, fenceOf(store, FENCE).names);
  return { first: rng.pick(pool.first).name, last: rng.pick(pool.last) };
}

/** The goods you carry, by id, as the inventory kit counts them. */
function carried(view: LawView | LawContext): string[] {
  return view.content
    .entries('item')
    .map(([id]) => id)
    .filter((id) => (view.fact('inventory.count', { item: id }) as number) > 0);
}

const fenceHere = (view: LawView | LawContext): boolean => {
  if (!view.content.has('fence', FENCE)) return false;
  const hour = view.fact('clock.hour') as number;
  const h = fenceOf(view.content, FENCE).hours;
  return hour >= h.from && hour < h.to;
};

/** What the fence pays for a good, in cents: a share of its price, rounded down. */
export const paidFor = (store: RecordStore, item: string): number =>
  Math.floor((goodOf(store, item).value * fenceOf(store, FENCE).share) / 100);

export const sell = {
  run(ctx: LawContext, action: Action) {
    if (!fenceHere(ctx)) return ctx.refuse('no-fence-now');
    const item = String(action.item);
    if (!carried(ctx).includes(item)) return ctx.refuse('not-carried');
    ctx.apply({ effect: 'sale', item });
  },
  options: (view: LawView) => (fenceHere(view) ? carried(view).map((item) => ({ item })) : []),
};

/** `sale`: paid, and rolled at the fence's odds of trouble, which its preview shows. */
export const sale = {
  run(ctx: LawContext, effect: Effect) {
    const item = String(effect.item);
    const f = fenceOf(ctx.content, FENCE);
    const paid = paidFor(ctx.content, item);
    ctx.apply({ effect: 'take-item', item });
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: paid });
    ctx.emit('sold', { item, paid });
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance: f.trouble, effects: [{ effect: 'sale-seen', item }] },
        { chance: 100 - f.trouble, effects: [] },
      ],
    });
  },
  preview(ctx: PreviewContext<LawSlice>, effect: Effect) {
    const item = String(effect.item);
    return { paid: paidFor(ctx.content, item), trouble: fenceOf(ctx.content, FENCE).trouble };
  },
};

export const eat = {
  run(ctx: LawContext, action: Action) {
    const item = String(action.item);
    const food = ctx.content.get<{ food?: number }>('item', item)?.food;
    if (!food || !carried(ctx).includes(item)) return ctx.refuse('nothing-to-eat');
    ctx.apply({ effect: 'take-item', item });
    ctx.apply({ effect: 'adjust-needs', needs: { food } });
    ctx.emit('ate', { item });
  },
  options: (view: LawView) =>
    carried(view)
      .filter((item) => view.content.get<{ food?: number }>('item', item)?.food)
      .map((item) => ({ item })),
};
