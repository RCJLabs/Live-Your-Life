/**
 * The police (D46): an appearance ticket with a court date, for someone held or found from the
 * footage or a sale; the footage reviewed at close and a visit set days later; a missed court
 * date as a warrant, and a visit to pick you up. Each visit is set with a time the player is
 * told (state.ts's setTimer), and one that comes while you are held or in court comes the next
 * day instead. And midnight's upkeep: heat fading, warrants, probation.
 */

import type { Effect } from '@eb/core';
import { todayOf } from '../job/days.ts';
import { courtDay } from '../season/module.ts';
import { raid, violation } from './drugs.ts';
import { FENCE, fenceOf, goodOf, offenceFor } from './records.ts';
import {
  between,
  type Case,
  convict,
  crime,
  type Evidence,
  type Hold,
  type LawContext,
  setTimer,
  tickOf,
  type Visit,
} from './state.ts';

/** When in the day the police come round: from 10:00 to 18:00 (tune). */
const CALLS = { from: 10 * 60, to: 18 * 60 };

/** The shop's civil demand (MCL 600.2953): ten times the price within its bounds, and anything not recovered. */
function demandFor(ctx: LawContext, value: number, recovered: boolean): number {
  const d = crime(ctx).demand;
  return Math.min(d.max, Math.max(d.min, d.times * value)) + (recovered ? 0 : value);
}

/**
 * Probation ends at a new offence or a missed check-in. HYTA's enters the conviction it held off
 * (D47); a sentence's sends the police to pick you up for days in jail (M2.4).
 */
function revoke(ctx: LawContext, why: string): void {
  const p = ctx.read().probation;
  if (!p) return;
  const w = ctx.write();
  w.probation = null;
  if (p.trainee) w.hyta = 'revoked';
  ctx.emit('revoked', { why });
  if (p.trainee) convict(ctx, p.offence, 'probation');
  else newVisit(ctx, later(ctx), { why: 'violation', item: '', case: 0 });
}

const holdNow = (ctx: LawContext): Hold | null =>
  ctx.modes.current.id === 'held' ? (ctx.modes.current.data as Hold) : null;

/** `ticket`: an appearance ticket and a court date; the shop's demand by letter, and its bar. */
export function ticket(ctx: LawContext, effect: Effect): void {
  const today = todayOf(ctx);
  const c = crime(ctx);
  const item = String(effect.item);
  const value = goodOf(ctx.content, item).value;
  const evidence = effect.evidence as Evidence;
  const recovered = effect.recovered === true;
  const charged = evidence === 'sale' ? fenceOf(ctx.content, FENCE).offences : c.offences;
  const w = ctx.write();
  const kase: Case = {
    id: w.next++,
    offence: offenceFor(ctx.content, charged, value, w.convictions),
    value,
    evidence,
    // Never on a holiday, when the court is closed (D132).
    court: courtDay(ctx, today.day + between(ctx, c.court.min, c.court.max)),
    warrant: false,
  };
  w.cases.push(kase);
  const demand = evidence === 'sale' ? 0 : demandFor(ctx, value, recovered);
  w.owed.demand += demand;
  if (evidence !== 'sale' && c.bars) w.barred = true;
  if (holdNow(ctx)?.why === 'clerk') ctx.modes.pop();
  ctx.emit('ticketed', { case: kase.id, offence: kase.offence, court: kase.court, demand });
  ctx.emit('notice', { what: 'court', case: kase.id, tick: tickOf(today, kase.court, c.hearing.from * 60) });
  revoke(ctx, 'new-offence');
}

/** Sets a visit for a day, at a time in the police's hours, and tells the player. */
function visitOn(ctx: LawContext, day: number, v: Visit): void {
  const at = tickOf(todayOf(ctx), day, between(ctx, CALLS.from, CALLS.to));
  const what = v.why === 'warrant' || v.why === 'violation' ? 'arrest' : v.why === 'raid' ? 'raid' : 'visit';
  setTimer(ctx, `law-visit-${v.id}`, at, [{ effect: 'visit', visit: v.id }], what);
}

export function newVisit(ctx: LawContext, day: number, visit: Omit<Visit, 'id'>): void {
  const w = ctx.write();
  const v = { ...visit, id: w.next++ };
  w.visits.push(v);
  visitOn(ctx, day, v);
}

export const later = (ctx: LawContext): number => {
  const c = crime(ctx);
  return todayOf(ctx).day + between(ctx, c.visit.min, c.visit.max);
};

/** `review`: the day's footage, at close. Each theft it shows sends the police round days later. */
export function review(ctx: LawContext): void {
  const filmed = ctx.read().filmed;
  if (filmed.length === 0) return;
  ctx.write().filmed = [];
  for (const f of filmed) newVisit(ctx, later(ctx), { why: 'camera', item: f.item, case: 0 });
}

/** A sale the fence was seen making comes back to you (D48). */
export const saleSeen = (ctx: LawContext, effect: Effect): void =>
  newVisit(ctx, later(ctx), { why: 'sale', item: String(effect.item), case: 0 });

/** `visit`: the police at your door. A ticket, or for a warrant, a night in the cells and the hearing. */
export function visit(ctx: LawContext, effect: Effect): void {
  const v = ctx.read().visits.find((x) => x.id === effect.visit);
  if (!v) return;
  // Held, or in court, already: they come the next day.
  if (ctx.modes.current.id !== 'world') {
    visitOn(ctx, todayOf(ctx).day + 1, v);
    return;
  }
  ctx.write().visits = ctx.read().visits.filter((x) => x.id !== v.id);
  if (v.why === 'raid' || v.why === 'violation') {
    if (v.why === 'raid') raid(ctx);
    else violation(ctx);
    return;
  }
  if (v.why === 'warrant') {
    const until = todayOf(ctx).tick + crime(ctx).jail;
    const hold: Hold = { why: 'jail', until, case: v.case };
    ctx.modes.push('held', hold);
    ctx.emit('arrested', { case: v.case });
    setTimer(ctx, 'law-hearing', until, [{ effect: 'hearing', case: v.case }], 'hearing');
    return;
  }
  // What is still in your bag is taken back, and not owed for.
  const kept = (ctx.fact('inventory.count', { item: v.item }) as number) > 0;
  if (kept) ctx.apply({ effect: 'take-item', item: v.item });
  ctx.apply({ effect: 'ticket', item: v.item, evidence: v.why, recovered: kept });
}

/** `hearing`: brought from the cells before the court on a warrant. */
export function hearing(ctx: LawContext, effect: Effect): void {
  if (holdNow(ctx)?.why === 'jail') ctx.modes.pop();
  ctx.modes.push('court', { case: effect.case });
  ctx.emit('hearing', { case: effect.case });
}

/** `law-day`, at midnight: heat fades, a missed court date is a warrant, probation is kept or not. */
export function lawDay(ctx: LawContext): void {
  const slice = ctx.read();
  const today = todayOf(ctx).day;
  if (slice.heat > 0) ctx.write().heat = Math.floor((slice.heat * crime(ctx).heat.keep) / 10_000);
  for (const k of slice.cases) {
    if (k.warrant || k.court >= today) continue;
    const w = ctx.write();
    w.cases = w.cases.map((x) => (x.id === k.id ? { ...x, warrant: true } : x));
    ctx.emit('warrant', { case: k.id });
    newVisit(ctx, later(ctx), { why: 'warrant', item: '', case: k.id });
  }
  const p = ctx.read().probation;
  if (p && p.next < today) revoke(ctx, 'missed-check-in');
  else if (p && p.until <= today) {
    const w = ctx.write();
    w.probation = null;
    w.hyta = 'done';
    ctx.emit('discharged', {});
  }
}
