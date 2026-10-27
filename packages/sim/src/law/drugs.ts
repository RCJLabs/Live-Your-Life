/**
 * A drug case (M2.4, D78, D82): the police come for you at a time you are told once enough of your
 * sales were seen, search you, and charge what they find and what was seen, by weight. A night in
 * the cells, then arraignment: post a tenth of the bond to go home until the court date, or stay
 * in jail until then. A felony conviction is sentenced by the offence's record: jail then
 * probation for a first, prison for a repeat (served by step 3's days, D81).
 */

import type { Effect, OptionsView } from '@eb/core';
import { chargeFor, TRADE, tradeOf } from '../deal/records.ts';
import { todayOf } from '../job/days.ts';
import { courtDay } from '../season/module.ts';
import { offenceOf } from './records.ts';
import {
  between,
  type Case,
  crime,
  DAY,
  type Hold,
  type LawContext,
  type LawSlice,
  type LawView,
  setTimer,
  sliceOf,
  tickOf,
} from './state.ts';

/** Days in jail for a probation violation (tune). */
export const VIOLATION_DAYS = 30;

const trade = (v: { content: LawContext['content'] }) => tradeOf(v.content, TRADE);

/** `drug-case`: enough was seen; the police will come, at a time you are told, unless they already are. */
export function drugCase(ctx: LawContext, visitOn: (day: number) => void): void {
  if (ctx.read().visits.some((v) => v.why === 'raid')) return;
  const r = trade(ctx).police.raid;
  visitOn(todayOf(ctx).day + between(ctx, r.min, r.max));
}

/** The raid: searched, charged by what was found and seen, and held for arraignment. */
export function raid(ctx: LawContext): void {
  const held = ctx.fact('deal.held') as number;
  const seen = ctx.fact('deal.seen') as number;
  if (held === 0 && seen === 0) {
    ctx.emit('searched', {});
    return;
  }
  const t = trade(ctx);
  ctx.apply({ effect: 'seize' });
  const w = ctx.write();
  const offence =
    seen > 0
      ? chargeFor(ctx.content, t.delivery, held + seen * t.sale.grams, w.convictions)
      : chargeFor(ctx.content, t.possession, held, w.convictions);
  const today = todayOf(ctx);
  const kase: Case = {
    id: w.next++,
    offence,
    value: 0,
    evidence: held > 0 ? 'found' : 'seen',
    // Never on a holiday, when the court is closed (D132).
    court: courtDay(ctx, today.day + between(ctx, t.court.min, t.court.max)),
    warrant: false,
  };
  w.cases.push(kase);
  ctx.emit('raided', { case: kase.id, offence });
  const until = tickOf(today, today.day + 1, t.bail.hour * 60);
  const hold: Hold = { why: 'jail', until, case: kase.id };
  ctx.modes.push('held', hold);
  setTimer(ctx, 'law-arraign', until, [{ effect: 'arraign', case: kase.id }], 'arraignment');
}

const posted = (v: LawView | LawContext): number => {
  const b = trade(v).bail;
  return Math.floor((b.bond * b.posted) / 100);
};

/** `arraign`: before a judge in the morning, who sets bail and the court date. */
export function arraign(ctx: LawContext, effect: Effect): void {
  const k = ctx.read().cases.find((x) => x.id === effect.case);
  if (ctx.modes.current.id === 'held') ctx.modes.pop();
  if (!k) return;
  ctx.modes.push('bail', { case: k.id });
  ctx.emit('arraigned', { case: k.id, offence: k.offence, bond: trade(ctx).bail.bond, court: k.court });
}

const bailCase = (v: LawContext | OptionsView<LawSlice>): number | undefined => {
  const frame = 'modes' in v ? v.modes.current : v.mode;
  return frame.id === 'bail' ? (frame.data as { case: number }).case : undefined;
};

const cash = (v: LawView | LawContext): number => v.fact('economy.amount', { resource: 'cash' }) as number;

/** `law/post-bail`: a tenth of the bond, given back when the case ends; home until the court date. */
export const postBail = {
  run(ctx: LawContext) {
    const id = bailCase(ctx);
    if (id === undefined) return ctx.refuse('no-bail');
    const amount = posted(ctx);
    if (cash(ctx) < amount) return ctx.refuse('not-enough');
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: -amount });
    const w = ctx.write();
    w.cases = w.cases.map((x) => (x.id === id ? { ...x, bail: amount } : x));
    ctx.modes.pop();
    const k = ctx.read().cases.find((x) => x.id === id) as Case;
    ctx.emit('bailed', { case: id, posted: amount });
    ctx.emit('notice', { what: 'court', case: id, tick: tickOf(todayOf(ctx), k.court, crime(ctx).hearing.from * 60) });
  },
  options: (v: OptionsView<LawSlice>) => (bailCase(v) !== undefined && cash(v) >= posted(v) ? [{}] : []),
};

/** `law/remand`: unable or unwilling to post it, in jail until the court date. */
export const remand = {
  run(ctx: LawContext) {
    const id = bailCase(ctx);
    if (id === undefined) return ctx.refuse('no-bail');
    const k = ctx.read().cases.find((x) => x.id === id) as Case;
    ctx.modes.pop();
    const until = tickOf(todayOf(ctx), k.court, crime(ctx).hearing.from * 60);
    ctx.modes.push('held', { why: 'jail', until, case: id } satisfies Hold);
    ctx.emit('remanded', { case: id, court: k.court });
    setTimer(ctx, 'law-hearing', until, [{ effect: 'hearing', case: id }], 'hearing');
  },
  options: (v: OptionsView<LawSlice>) => (bailCase(v) !== undefined ? [{}] : []),
};

/** Bail given back as a case ends, whatever its end. */
export function refund(ctx: LawContext, k: Case): void {
  if (k.bail) ctx.apply({ effect: 'add-resource', resource: 'cash', by: k.bail });
}

/** Days in jail served now: held until they're done. */
function serve(ctx: LawContext, days: number): void {
  if (days <= 0) return;
  const until = todayOf(ctx).tick + days * DAY;
  ctx.modes.push('held', { why: 'term', until } satisfies Hold);
  setTimer(ctx, 'law-release', until, [{ effect: 'released' }], 'release');
}

/**
 * A felony's sentence, by the offence's record and the convictions before this one: jail, then
 * probation, for a first; prison for a repeat. A first goes to prison too where the guidelines'
 * range starts above jail (M4.1: the heavier weights). An offence without one (shoplifting's) has none.
 */
export function sentence(ctx: LawContext, offence: string, priors: number): void {
  const o = offenceOf(ctx.content, offence);
  if (!o.first) return;
  const term = priors > 0 && o.repeat ? o.repeat.prison : o.first.prison;
  if (term) {
    const months = between(ctx, term.min, term.max);
    ctx.write().prison = { months, offence };
    ctx.emit('sentenced', { offence, kind: 'prison', jail: 0, probation: 0, prison: months });
    return;
  }
  const jail = between(ctx, o.first.jail.min, o.first.jail.max);
  const day = todayOf(ctx).day;
  const every = crime(ctx).hyta.every;
  ctx.write().probation = {
    until: day + jail + o.first.probation,
    next: day + jail + every,
    offence,
    trainee: false,
  };
  const kind = jail > 0 ? 'jail' : 'probation';
  ctx.emit('sentenced', { offence, kind, jail, probation: o.first.probation, prison: 0 });
  serve(ctx, jail);
}

/** `released`: a jail term served. */
export function released(ctx: LawContext): void {
  if (ctx.modes.current.id === 'held' && (ctx.modes.current.data as Hold).why === 'term') ctx.modes.pop();
  ctx.emit('released', {});
}

/** A probation violation's visit: picked up, and the days served. */
export function violation(ctx: LawContext): void {
  ctx.emit('violated', { days: VIOLATION_DAYS });
  serve(ctx, VIOLATION_DAYS);
}

/** Contesting a drug case, at odds its evidence sets. */
export const drugContest = (v: { content: LawContext['content'] }, k: Case): number =>
  trade(v).contest[k.evidence === 'found' ? 'found' : 'seen'];

export const isDrugCase = (k: Case): boolean => k.evidence === 'seen' || k.evidence === 'found';

/** A deferral is offered on a drug case whose offence allows it. */
export const drugDeferral = (v: LawView | LawContext, k: Case): boolean =>
  offenceOf(v.content, k.offence).deferral === true && sliceOf(v).hyta === 'none';
