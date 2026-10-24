/**
 * The deal module (M2.4, D78, D82): cocaine bought from a supplier and sold on the corner. It
 * holds what you carry and the heat on you, and keeps what was seen of your sales, which the
 * police build a case on (step 2). It owns no money: the economy kit does.
 */
import { defineModule } from '@eb/core';
import { namePoolOf } from '../ties/records.ts';
import { TRADE, tradeOf } from './records.ts';
import { type DealSlice, HEAT_MAX, heatOf } from './state.ts';
import { buy, buyerCame, corner, cornerHour, MOST_HELD, seize, sighted } from './trade.ts';

const TEXT = { type: 'text' } as const;
const WHOLE = { type: 'int', min: 0 } as const;
const PERCENT = { type: 'int', min: 0, max: 100 } as const;

export const dealModule = defineModule<DealSlice>({
  id: 'deal',
  init: (ctx) => {
    const traded = ctx.content.has('trade', TRADE);
    const pool = traded ? namePoolOf(ctx.content, tradeOf(ctx.content).names) : null;
    // The supplier's stream is opened only in a world with the trade: an open stream is kept in the
    // kernel's state, and a save replayed by content from before the trade must keep its hash.
    const rng = pool ? ctx.rng('supplier') : null;
    return {
      supplier: pool && rng ? { first: rng.pick(pool.first).name, last: rng.pick(pool.last) } : null,
      held: 0,
      heat: 0,
      asOf: 0,
      sales: 0,
      takings: 0,
      seen: [],
    };
  },
  facts: {
    held: {
      read: ({ state }) => state.held,
      domain: { type: 'int', min: 0, max: MOST_HELD },
      label: 'what you hold, in tenths of a gram',
    },
    heat: { read: (view) => heatOf(view), domain: { type: 'int', min: 0, max: HEAT_MAX }, label: 'the heat on you' },
    sales: { read: ({ state }) => state.sales, domain: WHOLE, label: 'sales made' },
    seen: { read: ({ state }) => state.seen.length, domain: WHOLE, label: 'sales seen' },
    'supplier-from': {
      read: ({ state, content }) =>
        state.supplier && content.has('trade', TRADE) ? tradeOf(content).supplier.hours.from : -1,
      domain: { type: 'int', min: -1, max: 24 },
      label: 'the hour the supplier comes',
    },
    'supplier-to': {
      read: ({ state, content }) =>
        state.supplier && content.has('trade', TRADE) ? tradeOf(content).supplier.hours.to : -1,
      domain: { type: 'int', min: -1, max: 24 },
      label: 'the hour the supplier goes',
    },
  },
  events: {
    bought: { args: { lot: TEXT, grams: WHOLE, price: WHOLE }, label: 'Bought from the supplier' },
    'on-corner': { args: { buyer: PERCENT, seen: PERCENT, passing: WHOLE }, label: 'Stood an hour on the corner' },
    sold: { args: { grams: WHOLE, price: WHOLE }, label: 'Made a sale' },
    'turned-away': { args: {}, label: 'Had nothing left for a buyer' },
    seen: { args: { day: WHOLE, hour: { type: 'int', min: 0, max: 23 } }, label: 'A sale was seen' },
  },
  actions: { buy, corner },
  effects: { 'corner-hour': cornerHour, buyer: buyerCame, sighted, seize },
});
