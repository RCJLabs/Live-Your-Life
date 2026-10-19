/**
 * The home module: rent, due at midnight on the 1st of each month, paid from the economy kit's
 * cash. Rent that can't be paid is owed, not refused: the month still turns, and what is owed
 * waits until the player pays it. Eviction and its notice come with housing (Phase 2).
 */
import { defineModule } from '@eb/core';
import { daysToNextMonth } from './calendar.ts';
import { RENT } from './dials.ts';

export interface HomeSlice {
  /** Cents of rent due and not paid. */
  owed: number;
}

/** The named timer for the next rent. */
export const RENT_TIMER = 'rent';

export const homeModule = defineModule<HomeSlice>({
  id: 'home',
  init: () => ({ owed: 0 }),
  facts: {
    owed: { read: ({ state }) => state.owed, domain: { type: 'int', min: 0 }, label: 'rent owed' },
  },
  effects: {
    'rent-due': (ctx) => {
      // Paid if the cash is there; owed if not. The attempt keeps a refusal from undoing the month.
      const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: RENT } }));
      if (!paid.ok) ctx.write().owed += RENT;
      ctx.emit('rent', { cents: RENT, paid: paid.ok });
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
