/**
 * The home module: rent, due at midnight on the 1st of each month, paid from the economy kit's
 * cash. Rent that can't be paid is owed, not refused: the month still turns, and what is owed
 * waits until the player pays it. Eviction and its notice come with housing (Phase 2). The gas
 * bill for the month just past comes due with it (D130), and the month's other bills (D140), paid
 * or owed the same way.
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { daysToNextMonth, MONTHS } from './calendar.ts';
import { RENT } from './dials.ts';
import { climateIn, gasBill } from './season/climate.ts';

export interface HomeSlice {
  /** Cents of rent and gas due and not paid. */
  owed: number;
}

/** The named timer for the next rent. */
export const RENT_TIMER = 'rent';

/** Paid if the cash is there; owed if not. The attempt keeps a refusal from undoing the month. */
function charge(ctx: ModuleContext<HomeSlice>, cents: number): boolean {
  const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: cents } }));
  if (!paid.ok) ctx.write().owed += cents;
  return paid.ok;
}

export const homeModule = defineModule<HomeSlice>({
  id: 'home',
  init: () => ({ owed: 0 }),
  events: {
    // Heard by the people you know (M2.6): a partner you live with pays their share.
    rent: { args: { cents: { type: 'int', min: 0 }, paid: { type: 'bool' } }, label: 'Rent came due' },
    gas: { args: { cents: { type: 'int', min: 0 }, paid: { type: 'bool' } }, label: 'The gas bill came due' },
    bill: {
      args: { bill: { type: 'text' }, cents: { type: 'int', min: 0 }, paid: { type: 'bool' } },
      label: 'A bill came due',
    },
  },
  facts: {
    owed: { read: ({ state }) => state.owed, domain: { type: 'int', min: 0 }, label: 'rent owed' },
  },
  on: {
    // Rent owed was the estate's to pay (M2.7 step 3); the heir keeps the flat.
    'lives/succeeded': (ctx) => {
      if (ctx.read().owed > 0) ctx.write().owed = 0;
    },
  },
  effects: {
    // The next 1st's rent, set again at midnight after a ward's years, which pass without it (D108).
    'rent-next': (ctx) => {
      const days = daysToNextMonth(ctx.fact('time.month') as string, ctx.fact('time.day-of-month') as number);
      const minutes = days * 1440 - (ctx.fact('time.of-day') as number);
      ctx.apply({ effect: 'schedule', timer: RENT_TIMER, after: { minutes }, effects: [{ effect: 'rent-due' }] });
    },
    'rent-due': (ctx) => {
      ctx.emit('rent', { cents: RENT, paid: charge(ctx, RENT) });
      // The gas for the month just past (D130).
      const month = MONTHS.findIndex((m) => m.id === ctx.fact('time.month'));
      const climate = climateIn(ctx.content);
      if (climate) {
        const gas = gasBill(climate, month === 0 ? 12 : month);
        ctx.emit('gas', { cents: gas, paid: charge(ctx, gas) });
      }
      // The month's other bills (D140): the electricity, the phone, clothes and household things.
      // They are for the month just past, so a life that began in it pays for the days it lived.
      const past = (MONTHS[month === 0 ? 11 : month - 1] as { days: number }).days;
      const lived = Math.min(past, ctx.fact('time.day') as number);
      for (const bill of ctx.content.ids('bill')) {
        const whole = (ctx.content.get<{ cents: number }>('bill', bill) as { cents: number }).cents;
        const cents = Math.floor((whole * lived) / past);
        ctx.emit('bill', { bill, cents, paid: charge(ctx, cents) });
      }
      const days = daysToNextMonth(ctx.fact('time.month') as string, ctx.fact('time.day-of-month') as number);
      ctx.apply({ effect: 'schedule', timer: RENT_TIMER, after: { days }, effects: [{ effect: 'rent-due' }] });
    },
  },
  actions: {
    'pay-owed': {
      run: (ctx) => {
        const owed = ctx.read().owed;
        if (owed === 0) return ctx.refuse('nothing-owed');
        ctx.apply({ effect: 'pay-cost', cost: { cash: owed } });
        ctx.write().owed = 0;
        ctx.emit('paid-owed', { cents: owed });
      },
      // Offered only when all of it can be paid: part payments come with housing.
      options: (view) => {
        const owed = view.state.owed;
        const cash = view.fact('economy.amount', { resource: 'cash' }) as number;
        return owed > 0 && cash >= owed ? [{}] : [];
      },
    },
  },
});
