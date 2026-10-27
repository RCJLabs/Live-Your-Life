/**
 * Violence in the trade (M4.1 step 3, D146): rare and costly, at odds shown first. Robbed on the
 * corner, more likely the more you hold and on a held corner; beaten when a held corner's crew runs
 * you off, or when the supplier's front goes unpaid; a front your crew owes collected by force; a
 * rival's seller robbed. A beating goes through health as an injury (the hospital if it brings health
 * to nothing), and what is reported brings the police and a charge by Michigan's law (law/violence.ts).
 */
import type { Action, Effect, OptionsView, PreviewContext } from '@eb/core';
import { tradeOf } from './records.ts';
import { holder, YOURS } from './rivals.ts';
import { type DealContext, type DealSlice, type DealView, type Member, raiseHeat, sliceOf } from './state.ts';

const violenceOf = (v: DealView) => tradeOf(v.content).violence;
const cashOf = (v: DealView): number => v.fact('economy.amount', { resource: 'cash' }) as number;
const traded = (v: DealView): boolean => v.content.has('trade', 'cocaine');

/** A roll at `chance` in 100 of `effects`; nothing otherwise. */
const odds = (chance: number, effects: Effect[]): Effect => ({
  effect: 'roll',
  outcomes: [
    { chance, effects },
    { chance: 100 - chance, effects: [] },
  ],
});

/** Beaten: an injury, through the health module. */
export const beat = (ctx: DealContext, by: string): void => {
  ctx.apply({ effect: 'hurt', kind: violenceOf(ctx).hurt });
  ctx.emit('beaten', { by });
};

/** The odds in percent of being robbed in an hour on your corner, as the preview shows them. */
export function robbedOdds(v: DealView): number {
  if (!traded(v)) return 0;
  const r = violenceOf(v).robbed;
  const held = holder(v, YOURS) !== -1 ? r.held : 0;
  return Math.min(r.most, r.base + Math.floor(sliceOf(v).held / r.per) + held);
}

/** `robbed`: what you hold taken, and cash up to the record's most; hurt at its odds. */
export function robbed(ctx: DealContext): void {
  const r = violenceOf(ctx).robbed;
  const grams = ctx.read().held;
  const cash = Math.min(r.cash, cashOf(ctx));
  ctx.write().held = 0;
  if (cash > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: -cash });
  ctx.emit('robbed', { grams, cash });
  ctx.apply(odds(r.hurt, [{ effect: 'beaten', by: 'robbed' }]));
}

/** The roll of a beating, at `chance`, for whoever deals it. */
export const beatenAt = (chance: number, by: string): Effect => odds(chance, [{ effect: 'beaten', by }]);

const memberOf = (v: DealView, person: number) => sliceOf(v).members.find((m) => m.person === person);

/** `deal/collect {person}`: a front a member of your crew left unpaid, collected by force. */
export const collect = {
  run(ctx: DealContext, action: Action) {
    const person = Number(action.person);
    const m = memberOf(ctx, person);
    if (!m || !m.cutOff || m.owed === 0) return ctx.refuse('nothing-to-collect');
    ctx.apply({ effect: 'collect-roll', person });
  },
  options: (v: OptionsView<DealSlice>) =>
    sliceOf(v)
      .members.filter((m) => m.cutOff && m.owed > 0)
      .map((m) => ({ person: m.person })),
};

/** `collect-roll`: the money got at the record's odds; its preview is what the page shows first. */
export const collectRoll = {
  run(ctx: DealContext, effect: Effect) {
    const c = violenceOf(ctx).collect;
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance: c.win, effects: [{ effect: 'collected', person: effect.person }] },
        { chance: 100 - c.win, effects: [{ effect: 'not-collected', person: effect.person }] },
      ],
    });
  },
  preview(ctx: PreviewContext<DealSlice>) {
    const c = violenceOf(ctx).collect;
    return { win: c.win, hurt: c.hurt, yours: c.yours, reported: c.reported };
  },
};

const leave = (ctx: DealContext, person: number): Member | undefined => {
  const m = ctx.read().members.find((x) => x.person === person) as Member | undefined;
  const w = ctx.write();
  w.members = w.members.filter((x) => x.person !== person);
  ctx.apply({ effect: 'regard-to', person, to: 0 });
  return m;
};

/** `collected`: they pay what they owe, and are out of your crew; hurt, perhaps, and it may be reported. */
export function collected(ctx: DealContext, effect: Effect): void {
  const person = Number(effect.person);
  const c = violenceOf(ctx).collect;
  const m = leave(ctx, person);
  const paid = m?.owed ?? 0;
  ctx.apply({ effect: 'add-resource', resource: 'cash', by: paid });
  ctx.write().takings += paid;
  const name = ctx.fact('circle.name', { person }) as string;
  ctx.emit('collected', { person, name, paid });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance: c.hurt, effects: [{ effect: 'report-roll', person, offence: c.aggravated }] },
      { chance: 100 - c.hurt, effects: [{ effect: 'report-roll', person, offence: c.assault }] },
    ],
  });
}

/** `not-collected`: they fought back; you may be hurt, and they are out of your crew. */
export function notCollected(ctx: DealContext, effect: Effect): void {
  const person = Number(effect.person);
  const c = violenceOf(ctx).collect;
  leave(ctx, person);
  ctx.emit('not-collected', { person, name: ctx.fact('circle.name', { person }) as string });
  ctx.apply(beatenAt(c.yours, 'collecting'));
}

/** `report-roll`: whether what was done is reported, at the record's odds; if so, the police come. */
export function reportRoll(ctx: DealContext, effect: Effect): void {
  const reported = violenceOf(ctx).collect.reported;
  ctx.apply(odds(reported, [{ effect: 'reported-case', offence: effect.offence }]));
}

/** Why you can't rob a seller now, or null: only on a held corner, with someone of theirs there to rob. */
function robProblem(v: DealView): string | null {
  if (!traded(v)) return 'no-trade';
  if (holder(v, YOURS) === -1) return 'nobody-to-rob';
  const hour = v.fact('clock.hour') as number;
  if ((tradeOf(v.content).corner.buyers[hour] ?? 0) < 10) return 'nobody-out';
  return null;
}

/** `deal/rob`: the rival crew's seller on your corner, robbed. */
export const rob = {
  run(ctx: DealContext) {
    const problem = robProblem(ctx);
    if (problem) return ctx.refuse(problem);
    ctx.apply({ effect: 'rob-roll' });
    ctx.apply({ effect: 'wait', minutes: 20 });
  },
  options: (v: OptionsView<DealSlice>) => (robProblem(v) === null ? [{}] : []),
};

/** `rob-roll`: got away with it or not, and reported or not, at the odds its preview shows. */
export const robRoll = {
  run(ctx: DealContext) {
    const r = violenceOf(ctx).rob;
    raiseHeat(ctx, r.heat);
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance: r.win, effects: [{ effect: 'robbed-them' }] },
        { chance: 100 - r.win, effects: [{ effect: 'rob-failed' }] },
      ],
    });
    ctx.apply(odds(r.seen, [{ effect: 'reported-case', offence: r.robbery }]));
  },
  preview(ctx: PreviewContext<DealSlice>) {
    const r = violenceOf(ctx).rob;
    return { win: r.win, yours: r.yours, seen: r.seen, min: r.min, max: r.max };
  },
};

/** `rob-failed`: they fought back; you may be hurt. */
export function robFailed(ctx: DealContext): void {
  ctx.emit('rob-failed', {});
  ctx.apply(beatenAt(violenceOf(ctx).rob.yours, 'robbing'));
}

/** `robbed-them`: cash taken from their seller, between the record's least and most. */
export function robbedThem(ctx: DealContext): void {
  const r = violenceOf(ctx).rob;
  const cash = ctx.rng('violence').int(r.min, r.max);
  ctx.apply({ effect: 'add-resource', resource: 'cash', by: cash });
  ctx.emit('robbed-them', { cash });
}
