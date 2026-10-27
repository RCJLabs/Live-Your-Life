/**
 * Buying and selling (D78): buy a weight from the supplier at their hours, then stand on the
 * corner an hour at a time. In each ten minutes a buyer comes at the hour's odds, and each sale
 * is seen at odds from who passes and the heat on you, worked out when the hour starts: they are
 * the odds the preview shows, and what each sale in the hour rolls, as the roll beats record.
 */
import type { Action, Effect, PreviewContext } from '@eb/core';
import { type Lot, TRADE, tradeOf } from './records.ts';
import { noticed, runOff, YOURS, yourCorner } from './rivals.ts';
import { type DealContext, type DealSlice, type DealView, heatOf, raiseHeat, sliceOf } from './state.ts';
import { robbedOdds } from './violence.ts';
import { passingNow } from './witnesses.ts';

/** Trust with the supplier holds at most this much. */
export const TRUST_MOST = 20;

/** Held at most, in tenths of a gram: under the 50 g the charges above go by (D82, tune). */
export const MOST_HELD = 499;
const SLOTS = 6;

const traded = (v: DealView): boolean => v.content.has('trade', TRADE);

/** Held at most now: the connect's most once you have them (M4.1, D145), or MOST_HELD. */
export const mostHeld = (v: DealView): number =>
  sliceOf(v).connect && traded(v) ? tradeOf(v.content).boss.connect.most : MOST_HELD;

export const supplierHere = (v: DealView): boolean => {
  if (!traded(v) || !sliceOf(v).supplier) return false;
  const hour = v.fact('clock.hour') as number;
  const h = tradeOf(v.content).supplier.hours;
  return hour >= h.from && hour < h.to;
};

export const cash = (v: DealView): number => v.fact('economy.amount', { resource: 'cash' }) as number;

const lotNamed = (v: DealView, id: unknown): Lot | undefined =>
  tradeOf(v.content).supplier.sells.find((l) => l.id === id);

/** Why a lot can't be bought now, or null. */
function buyProblem(v: DealView, lot: Lot | undefined): string | null {
  if (!supplierHere(v)) return 'no-supplier-now';
  if (!lot) return 'no-such-lot';
  if (sliceOf(v).held + lot.grams > mostHeld(v)) return 'holding-too-much';
  if (cash(v) < lot.price) return 'short';
  return null;
}

export const buy = {
  run(ctx: DealContext, action: Action) {
    const lot = lotNamed(ctx, action.lot);
    const problem = buyProblem(ctx, lot);
    if (problem || !lot) return ctx.refuse(problem ?? 'no-such-lot');
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: -lot.price });
    const w = ctx.write();
    w.held += lot.grams;
    // Each purchase is trust built with the supplier (D79), up to a point.
    w.trust = Math.min(TRUST_MOST, w.trust + 1);
    ctx.emit('bought', { lot: lot.id, grams: lot.grams, price: lot.price });
  },
  options: (v: DealView) =>
    traded(v)
      ? tradeOf(v.content)
          .supplier.sells.filter((l) => buyProblem(v, l) === null)
          .map((l) => ({ lot: l.id }))
      : [],
};

/** The odds, in percent, that a sale in this hour is seen: from who passes and the heat on you. */
export function seenOdds(v: DealView): number {
  const s = tradeOf(v.content).seen;
  const odds = s.base + Math.floor((passingNow(v) * s.witness) / 10) + Math.floor(heatOf(v) / s.per);
  return Math.max(1, Math.min(s.most, odds));
}

/** The odds, in percent, of a buyer in each ten minutes of this hour. */
export const buyerOdds = (v: DealView): number => tradeOf(v.content).corner.buyers[v.fact('clock.hour') as number] ?? 0;

const canSell = (v: DealView): boolean => traded(v) && sliceOf(v).held >= tradeOf(v.content).sale.grams;

/** `deal/corner`: an hour on the corner, rolled a ten minutes at a time. */
export const corner = {
  run(ctx: DealContext) {
    if (!traded(ctx)) return ctx.refuse('no-trade');
    if (!canSell(ctx)) return ctx.refuse('nothing-to-sell');
    if (runOff(ctx, ctx.read().rival)) return ctx.refuse('run-off');
    // A held corner's crew sees you before any buyer does (D148): warned, or run off for days.
    if (noticed(ctx, ctx.write().rival, -1, YOURS)) {
      ctx.apply({ effect: 'wait', minutes: 10 });
      return;
    }
    ctx.apply({ effect: 'corner-hour' });
  },
  options: (v: DealView) => (canSell(v) && !runOff(v, sliceOf(v).rival) ? [{}] : []),
};

/** `corner-hour`: the odds read before anything changes, so they are the ones the preview showed. */
export const cornerHour = {
  run(ctx: DealContext) {
    const buyer = buyerOdds(ctx);
    const seen = seenOdds(ctx);
    const passing = passingNow(ctx);
    const robbed = robbedOdds(ctx);
    ctx.emit('on-corner', { buyer, seen, passing });
    // Robbed first, at the hour's odds (D146): what is taken is not there for the buyers after.
    if (robbed > 0)
      ctx.apply({
        effect: 'roll',
        outcomes: [
          { chance: robbed, effects: [{ effect: 'robbed' }] },
          { chance: 100 - robbed, effects: [] },
        ],
      });
    for (let k = 0; k < SLOTS && buyer > 0; k++) {
      const outcomes = [{ chance: buyer, effects: [{ effect: 'buyer', seen, passing }] }];
      ctx.apply({
        effect: 'roll',
        outcomes: buyer < 100 ? [...outcomes, { chance: 100 - buyer, effects: [] }] : outcomes,
      });
    }
    ctx.apply({ effect: 'wait', minutes: 60 });
  },
  preview(ctx: PreviewContext<DealSlice>) {
    if (!traded(ctx)) return { refused: 'no-trade' };
    const t = tradeOf(ctx.content);
    const held = yourCorner(ctx);
    return {
      buyer: buyerOdds(ctx),
      seen: seenOdds(ctx),
      passing: passingNow(ctx),
      price: t.sale.price,
      held: held.holder !== -1,
      left: held.left,
      robbed: robbedOdds(ctx),
      trouble: held.holder !== -1 && held.left === 0 ? tradeOf(ctx.content).violence.trouble : 0,
    };
  },
};

/** `buyer`: a sale, if you still hold enough; and whether it is seen, at the hour's odds. */
export function buyerCame(ctx: DealContext, effect: Effect): void {
  const t = tradeOf(ctx.content);
  if (ctx.read().held < t.sale.grams) {
    ctx.emit('turned-away', {});
    return;
  }
  const w = ctx.write();
  w.held -= t.sale.grams;
  w.sales += 1;
  w.takings += t.sale.price;
  ctx.apply({ effect: 'add-resource', resource: 'cash', by: t.sale.price });
  raiseHeat(ctx, t.heat.sale);
  ctx.emit('sold', { grams: t.sale.grams, price: t.sale.price });
  const seen = effect.seen as number;
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance: seen, effects: [{ effect: 'sighted', passing: effect.passing }] },
      { chance: 100 - seen, effects: [] },
    ],
  });
}

/** `sighted`: someone saw, and told. */
export function sighted(ctx: DealContext, effect: Effect): void {
  const t = tradeOf(ctx.content);
  const day = ctx.fact('time.day') as number;
  const hour = ctx.fact('clock.hour') as number;
  ctx.write().seen.push({ day, hour, grams: t.sale.grams, passing: effect.passing as number });
  raiseHeat(ctx, t.heat.seen);
  ctx.emit('seen', { day, hour });
  // Enough seen, and the police will come for you, at a time you are told (law/drugs.ts).
  if (ctx.read().seen.length >= t.police.enough) ctx.apply({ effect: 'drug-case' });
}

/** `seize`: taken in a search, with what was seen kept on the case the law opens. */
export function seize(ctx: DealContext): void {
  const w = ctx.write();
  w.held = 0;
  w.seen = [];
}
