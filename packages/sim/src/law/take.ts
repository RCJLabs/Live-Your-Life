/**
 * Taking something from a shelf (D45, D48): the odds of being noticed come from who sees where
 * you stand, are shown first, and are what is rolled. Held by the clerk, you wait for the police
 * (D46). Not held, the goods are yours, and a camera that saw it is reviewed at close.
 */
import type { Action, Effect, OptionsView, PreviewContext } from '@eb/core';
import { todayOf } from '../job/days.ts';
import { goodOf, SHOPLIFTING } from './records.ts';
import { oddsAt, shopOn, spotOf, stockOf } from './shop.ts';
import {
  between,
  crime,
  type Hold,
  type LawContext,
  type LawSlice,
  type LawView,
  setTimer,
  sliceOf,
  tickOf,
} from './state.ts';

const HEAT_MAX = 100;

const open = (view: LawView | LawContext): boolean => {
  if (!view.content.has('crime', SHOPLIFTING)) return false;
  const hour = view.fact('clock.hour') as number;
  const c = crime(view);
  return hour >= c.open.from && hour < c.open.to;
};

/** What can be taken now: each shelf's line of goods, while the shop is open to you. */
export function takeOptions(view: LawView) {
  if (!open(view) || view.state.barred) return [];
  return stockOf(view.content, view.state.block);
}

/** The shelf and good an action or effect names, if the shelf holds it. */
function picked(view: LawView | LawContext | PreviewContext<LawSlice>, data: Readonly<Record<string, unknown>>) {
  const sight = shopOn(view.content, sliceOf(view as LawContext).block);
  const spot = spotOf(sight, String(data.spot));
  const item = String(data.item);
  const block = sliceOf(view as LawContext).block;
  if (!spot || !stockOf(view.content, block).some((s) => s.spot === spot.id && s.item === item)) return null;
  return { sight, spot, item, odds: oddsAt(sight, spot, crime(view), sliceOf(view as LawContext).heat) };
}

export const take = {
  run(ctx: LawContext, action: Action) {
    if (!open(ctx)) return ctx.refuse('shop-shut');
    if (ctx.read().barred) return ctx.refuse('barred');
    if (!picked(ctx, action)) return ctx.refuse('not-on-that-shelf');
    ctx.apply({ effect: 'theft', spot: action.spot, item: action.item });
  },
  options: takeOptions,
};

/** `theft`: the odds read before anything changes, so they are the ones the preview showed. */
export const theft = {
  run(ctx: LawContext, effect: Effect) {
    const at = picked(ctx, effect);
    if (!at) throw new Error(`theft: nothing "${String(effect.item)}" at "${String(effect.spot)}"`);
    const { held, filmed } = at.odds;
    const w = ctx.write();
    w.heat = Math.min(HEAT_MAX, w.heat + crime(ctx).heat.theft);
    const item = at.item;
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance: held, effects: [{ effect: 'held', item }] },
        { chance: 100 - held, effects: [{ effect: 'got-away', item, filmed }] },
      ],
    });
  },
  preview(ctx: PreviewContext<LawSlice>, effect: Effect) {
    const at = picked(ctx, effect);
    if (!at) return { refused: 'not-on-that-shelf' };
    return { ...at.odds, value: goodOf(ctx.content, at.item).value };
  },
};

/** Not held: it's in your pocket, and a camera that saw may still know you. */
export function gotAway(ctx: LawContext, effect: Effect): void {
  const item = String(effect.item);
  ctx.apply({ effect: 'give-item', item });
  ctx.emit('took', { item });
  const filmed = effect.filmed as number;
  if (filmed <= 0) return;
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance: filmed, effects: [{ effect: 'filmed', item }] },
      { chance: 100 - filmed, effects: [] },
    ],
  });
}

/** Known from the footage: reviewed at close, when the police are told (D46). */
export function filmedNow(ctx: LawContext, effect: Effect): void {
  const item = String(effect.item);
  const w = ctx.write();
  w.filmed.push({ item, value: goodOf(ctx.content, item).value });
  if (w.filmed.length > 1) return;
  const today = todayOf(ctx);
  setTimer(ctx, 'law-review', tickOf(today, today.day, crime(ctx).review * 60), [{ effect: 'review' }], 'review');
}

/** Held by the clerk: the police come in a while, and you wait (D46). */
export function heldNow(ctx: LawContext, effect: Effect): void {
  const item = String(effect.item);
  const c = crime(ctx);
  const w = ctx.write();
  w.heat = Math.min(HEAT_MAX, w.heat + c.heat.caught);
  const until = todayOf(ctx).tick + between(ctx, c.police.min, c.police.max);
  const hold: Hold = { why: 'clerk', until };
  ctx.modes.push('held', hold);
  ctx.emit('held', { item });
  setTimer(ctx, 'law-police', until, [{ effect: 'ticket', item, evidence: 'held', recovered: true }], 'police');
}

const holdOf = (frame: { id: string; data?: unknown }): Hold | null =>
  frame.id === 'held' ? (frame.data as Hold) : null;

/** `law/wait`: held or jailed, the time passes until they come for you. */
export const wait = {
  run(ctx: LawContext) {
    const hold = holdOf(ctx.modes.current);
    if (!hold) return ctx.refuse('not-held');
    ctx.apply({ effect: 'wait', minutes: Math.max(1, hold.until - todayOf(ctx).tick) });
  },
  options: (view: OptionsView<LawSlice>) => (holdOf(view.mode) ? [{}] : []),
};
