/**
 * The deal module (M2.4, D78, D82): cocaine bought from a supplier and sold on the corner. It
 * holds what you carry and the heat on you, and keeps what was seen of your sales, which the
 * police build a case on (step 2). It owns no money: the economy kit does.
 */
import { defineModule } from '@eb/core';
import { namePoolOf } from '../ties/records.ts';
import { crewDays, front, join, payBack, recruit } from './crew.ts';
import { TRADE, tradeOf } from './records.ts';
import { type DealSlice, HEAT_MAX, heatOf, NO_CREW } from './state.ts';
import { buy, buyerCame, corner, cornerHour, MOST_HELD, seize, sighted } from './trade.ts';

const TEXT = { type: 'text' } as const;
const WHOLE = { type: 'int', min: 0 } as const;
const PERCENT = { type: 'int', min: 0, max: 100 } as const;

export const dealModule = defineModule<DealSlice>({
  id: 'deal',
  // 2 (M2.4 step 4): the crew, its fronts and the recruit.
  version: 2,
  migrate: { 2: (slice) => ({ ...(slice as object), ...NO_CREW }) },
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
      ...NO_CREW,
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
    trust: { read: ({ state }) => state.trust, domain: WHOLE, label: 'the supplier’s trust in you' },
    crew: { read: ({ state }) => state.crew, domain: { type: 'bool' }, label: 'in the supplier’s crew' },
    owed: { read: ({ state }) => state.owed, domain: WHOLE, label: 'owed to the supplier, in cents' },
    'recruit-selling': {
      read: ({ state }) => state.recruit >= 0,
      domain: { type: 'bool' },
      label: 'the coworker selling for you',
    },
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
    joined: { args: {}, label: 'Joined the supplier’s crew' },
    fronted: { args: { grams: WHOLE, owed: WHOLE, due: WHOLE }, label: 'Fronted weight on credit' },
    'paid-back': { args: { paid: WHOLE }, label: 'Paid back a front' },
    'cut-off': { args: { owed: WHOLE }, label: 'Cut off for a front unpaid' },
    recruited: { args: {}, label: 'Brought the coworker in' },
    'recruit-sold': { args: { sales: WHOLE, yours: WHOLE }, label: 'The recruit sold a night' },
    'recruit-arrested': { args: { sales: WHOLE, named: { type: 'bool' } }, label: 'The recruit was arrested' },
  },
  actions: { buy, corner, join, front, 'pay-back': payBack, recruit },
  effects: { 'corner-hour': cornerHour, buyer: buyerCame, sighted, seize },
  on: {
    'time/passed': crewDays,
    // An heir holds nothing, and is no one to the trade; the supplier is still who they are (M2.7 step 3).
    'lives/succeeded': (ctx) => {
      const s = ctx.read();
      Object.assign(ctx.write(), {
        held: 0,
        heat: 0,
        sales: 0,
        takings: 0,
        seen: [],
        ...NO_CREW,
        settled: s.settled,
      });
    },
  },
});
