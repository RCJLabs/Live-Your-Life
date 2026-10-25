/**
 * The courting that happens while time passes (M2.6 step 2): a date not turned up to, regard
 * drifting from someone you're dating and don't see, and someone ending it whose regard has
 * fallen below the courtship record's line. Settled a day at a time, as the crew's days are
 * (deal/crew.ts), so a long sleep or a sentence settles every day it passed.
 */
import type { Beat, ModuleContext } from '@eb/core';
import { end } from './court.ts';
import { nameOf, occupant } from './meet.ts';
import { courtshipOf } from './records.ts';
import { type CircleSlice, partnered, type Tie } from './state.ts';
import { judged } from './together.ts';

type Ctx = ModuleContext<CircleSlice>;

/** A planned date whose window has gone by: missed, and remembered. */
function missedDates(ctx: Ctx, now: number): void {
  const d = courtshipOf(ctx.content).date;
  for (const t of ctx.read().ties) {
    if (!t.date || t.date.day * 1440 + t.date.minute + d.window >= now) continue;
    const w = ctx.write().ties.find((x) => x.person === t.person);
    if (!w) continue;
    w.regard = Math.max(0, w.regard + d.missed);
    w.date = null;
    ctx.emit('stood-up', { person: w.person, name: nameFor(ctx, w.person) });
  }
}

const nameFor = (ctx: Ctx, person: number) => ctx.fact('circle.name', { person }) as string;

/**
 * A day gone by: a licence lapses unused, a divorce comes to judgment, and for each partner the
 * day apart or together, and perhaps an end. Someone who lives with you is seen every day.
 */
function dayFor(ctx: Ctx, day: number): void {
  const c = courtshipOf(ctx.content);
  const rng = ctx.rng('circle');
  for (const t of ctx.read().ties) {
    if (t.licence && t.licence.until < day) {
      const w = ctx.write().ties.find((x) => x.person === t.person) as Tie;
      w.licence = null;
      ctx.emit('licence-lapsed', { person: w.person, name: nameFor(ctx, w.person) });
    }
    if (t.hearing >= 0 && t.hearing <= day) judged(ctx, t);
    if (!partnered(t)) continue;
    const w = ctx.write().ties.find((x) => x.person === t.person);
    if (!w) continue;
    if (w.living) w.seen = day;
    if (day - w.seen > c.drift.days) w.regard = Math.max(0, w.regard - c.drift.per);
    if (w.regard < c.leave.regard && rng.int(0, 99) < c.leave.chance) end(ctx, w, 'them');
  }
}

/**
 * Someone you know who has died (D106): whoever holds their place came after you met them. The
 * tie ends, a partner's home with you with it, and the family hears of it for the children.
 */
function deaths(ctx: Ctx, day: number): void {
  const seed = ctx.fact('people.seed') as number;
  for (const t of ctx.read().ties) {
    if (occupant(ctx.content, seed, t.person, day).since <= t.met) continue;
    const name = nameOf(ctx.content, seed, t.person, t.met);
    ctx.write().ties = ctx.read().ties.filter((x) => x.person !== t.person);
    ctx.emit('died', { person: t.person, name, partner: partnered(t) });
  }
}

/** On every passage of time: deaths, missed dates now, and each whole day since the last settled. */
export function circleDays(ctx: Ctx, _event: Beat): void {
  const day = ctx.fact('time.day') as number;
  const settled = ctx.read().settled;
  if (day > settled && ctx.read().ties.length > 0) deaths(ctx, day);
  // Nobody dated, nothing planned: nothing to settle, and no record read, so a life from content
  // without courtship (a replay by the pack it was saved with) passes its time as it did.
  if (!ctx.read().ties.some((t) => partnered(t) || t.date || t.licence || t.hearing >= 0)) {
    if (day > settled) ctx.write().settled = day;
    return;
  }
  missedDates(ctx, day * 1440 + (ctx.fact('time.of-day') as number));
  if (day <= settled) return;
  for (let d = settled + 1; d <= day; d++) dayFor(ctx, d);
  ctx.write().settled = day;
}
