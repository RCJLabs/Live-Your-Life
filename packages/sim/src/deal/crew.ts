/**
 * The supplier's crew (M2.4, D79, D84–D86). Trust grows with each purchase; with enough of it, and
 * little enough heat, they bring you in. In the crew they front you weight at the crew's price,
 * owed by a due date: paid back, it is trust; unpaid, they stop fronting you and trust falls, the
 * debt still standing (no violence yet, D86). Later you can bring in the coworker, who sells on
 * their own nights from what you hold. You keep a share, and arrested, they may name you.
 */
import type { Action, Beat, OptionsView } from '@eb/core';
import { bossDay } from './boss.ts';
import { TRADE, tradeOf } from './records.ts';
import { type DealContext, type DealSlice, type DealView, heatOf, sliceOf } from './state.ts';
import { cash, mostHeld, supplierHere, TRUST_MOST } from './trade.ts';
import { beatenAt } from './violence.ts';

const crewOf = (v: DealView) => tradeOf(v.content, TRADE).crew;
const day = (v: DealView): number => v.fact('time.day') as number;
const traded = (v: DealView): boolean => v.content.has('trade', TRADE);

/** Why the supplier won't bring you in now, or null. */
function joinProblem(v: DealView): string | null {
  if (!traded(v) || !sliceOf(v).supplier) return 'no-trade';
  const s = sliceOf(v);
  if (s.crew) return 'in-the-crew';
  if (!supplierHere(v)) return 'no-supplier-now';
  if (s.trust < crewOf(v).trust) return 'not-trusted';
  if (heatOf(v) > crewOf(v).heat) return 'too-hot';
  return null;
}

export const join = {
  run(ctx: DealContext) {
    const problem = joinProblem(ctx);
    if (problem) return ctx.refuse(problem);
    ctx.write().crew = true;
    ctx.emit('joined', {});
  },
  options: (v: OptionsView<DealSlice>) => (joinProblem(v) === null ? [{}] : []),
};

const frontLot = (v: DealView) => {
  const c = crewOf(v);
  return tradeOf(v.content, TRADE).supplier.sells.find((l) => l.id === c.front.lot);
};

/** Why nothing can be fronted now, or null. */
function frontProblem(v: DealView): string | null {
  const s = sliceOf(v);
  if (!traded(v) || !s.crew) return 'not-in-the-crew';
  if (s.cutOff) return 'cut-off';
  if (!supplierHere(v)) return 'no-supplier-now';
  if (s.owed > 0) return 'still-owed';
  if (s.held + (frontLot(v)?.grams ?? 0) > mostHeld(v)) return 'holding-too-much';
  return null;
}

export const front = {
  run(ctx: DealContext) {
    const problem = frontProblem(ctx);
    if (problem) return ctx.refuse(problem);
    const c = crewOf(ctx);
    const lot = frontLot(ctx);
    if (!lot) return ctx.refuse('no-such-lot');
    const w = ctx.write();
    w.held += lot.grams;
    w.owed = c.front.price;
    w.due = day(ctx) + c.front.days;
    ctx.emit('fronted', { grams: lot.grams, owed: c.front.price, due: w.due });
  },
  options: (v: OptionsView<DealSlice>) => (frontProblem(v) === null ? [{}] : []),
};

/** `deal/pay-back`: what a front left owed, paid to the supplier at their hours. */
export const payBack = {
  run(ctx: DealContext) {
    const s = ctx.read();
    if (s.owed === 0) return ctx.refuse('nothing-owed');
    if (!supplierHere(ctx)) return ctx.refuse('no-supplier-now');
    if (cash(ctx) < s.owed) return ctx.refuse('short');
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: -s.owed });
    const w = ctx.write();
    const late = w.due >= 0 && day(ctx) > w.due;
    w.owed = 0;
    w.due = -1;
    if (!late) w.trust = Math.min(TRUST_MOST, w.trust + 1);
    ctx.emit('paid-back', { paid: s.owed });
  },
  options: (v: OptionsView<DealSlice>) => {
    const s = v.state;
    return s.owed > 0 && supplierHere(v) && cash(v) >= s.owed ? [{}] : [];
  },
};

/** Why the coworker can't be asked to sell now, or null. */
function recruitProblem(v: DealView): string | null {
  const s = sliceOf(v);
  if (!traded(v) || !s.crew) return 'not-in-the-crew';
  if (s.recruit >= 0) return 'already-selling';
  const r = crewOf(v).recruit;
  if ((v.fact('ties.familiarity') as number) < r.familiarity) return 'not-close-enough';
  if ((v.fact('ties.regard') as number) < r.regard) return 'not-enough-regard';
  return null;
}

export const recruit = {
  run(ctx: DealContext, _action: Action) {
    const problem = recruitProblem(ctx);
    if (problem) return ctx.refuse(problem);
    ctx.write().recruit = day(ctx);
    ctx.apply({ effect: 'tie-act', act: crewOf(ctx).recruit.act });
    ctx.emit('recruited', {});
  },
  options: (v: OptionsView<DealSlice>) => (recruitProblem(v) === null ? [{}] : []),
};

/** Whether the recruit sells on a day: `nights` days of the week, by the day. */
const sellsOn = (d: number, nights: number): boolean => d % 7 < nights;

/** A night of the recruit's: buyers through four hours, from what you hold; each sale may be seen. */
function recruitNight(ctx: DealContext): void {
  const t = tradeOf(ctx.content, TRADE);
  const r = t.crew.recruit;
  const rng = ctx.rng('recruit');
  let sold = 0;
  for (let k = 0; k < 24 && ctx.read().held >= t.sale.grams; k++) {
    if (rng.int(0, 99) >= r.buyers) continue;
    sold++;
    const w = ctx.write();
    w.held -= t.sale.grams;
    if (rng.int(0, 99) < r.seen) {
      arrested(ctx, sold);
      return;
    }
  }
  if (sold > 0) paid(ctx, sold);
}

function paid(ctx: DealContext, sold: number): void {
  const t = tradeOf(ctx.content, TRADE);
  const takings = sold * t.sale.price;
  const yours = takings - Math.floor((takings * t.crew.recruit.share) / 100);
  ctx.apply({ effect: 'add-resource', resource: 'cash', by: yours });
  ctx.write().takings += yours;
  ctx.emit('recruit-sold', { sales: sold, yours });
}

/** The recruit taken in: what they sold that night is lost, and they may name you. */
function arrested(ctx: DealContext, sold: number): void {
  const r = crewOf(ctx).recruit;
  ctx.write().recruit = -1;
  const named = Math.max(0, r.named - (ctx.fact('ties.regard') as number));
  const roll = ctx.rng('recruit').int(0, 99);
  ctx.emit('recruit-arrested', { sales: sold, named: roll < named });
  if (roll >= named) return;
  // Named: a statement against you, as good as a sale seen (law/drugs.ts builds the case).
  const t = tradeOf(ctx.content, TRADE);
  const w = ctx.write();
  w.seen.push({ day: day(ctx), hour: 23, grams: t.sale.grams, passing: 0 });
  w.seen.push({ day: day(ctx), hour: 23, grams: t.sale.grams, passing: 0 });
  if (w.seen.length >= t.police.enough) ctx.apply({ effect: 'drug-case' });
}

/** The crew's days, settled as time passes: a front come due unpaid, and the recruit's nights. */
export function crewDays(ctx: DealContext, _event: Beat): void {
  const s = ctx.read();
  const today = day(ctx);
  if (!traded(ctx) || today <= s.settled) return;
  const c = crewOf(ctx);
  for (let d = s.settled + 1; d <= today; d++) {
    const now = ctx.read();
    if (now.owed > 0 && now.due >= 0 && d > now.due && !now.cutOff) {
      const w = ctx.write();
      w.cutOff = true;
      w.trust = Math.max(0, w.trust - c.unpaid);
      ctx.emit('cut-off', { owed: now.owed });
      // And their people may come for you (D146, amending D86).
      ctx.apply(beatenAt(tradeOf(ctx.content, TRADE).violence.cutOff, 'supplier'));
    }
    if (ctx.read().recruit >= 0 && ctx.read().recruit < d && sellsOn(d, c.recruit.nights)) recruitNight(ctx);
    bossDay(ctx, d);
  }
  ctx.write().settled = today;
}
