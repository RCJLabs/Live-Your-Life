/**
 * A child's care (M2.6 step 4b, D98): minutes of it a day by age, half taken on by a partner you
 * live with (ATUS's hours, CALIBRATION.md); daycare paid each day you work while a child is young
 * and nobody is home; and days without enough care, which bring a report to child protective
 * services and an investigation that closes after its days.
 */
import type { ModuleContext } from '@eb/core';
import { pregnancyOf } from './records.ts';
import { type FamilySlice, type FamilyView, familyOf } from './state.ts';

type Ctx = ModuleContext<FamilySlice>;

const day = (v: FamilyView) => v.fact('time.day') as number;
const ageOn = (born: number, d: number) => Math.floor((d - born) / 365);
const yours = (v: FamilyView) => familyOf(v).children.filter((c) => c.with === 'you');

/** Minutes of care your children need on a day, less what a partner you live with gives unless `whole`. */
export function needOn(v: FamilyView, d: number, whole = false): number {
  const c = pregnancyOf(v.content).care;
  let need = 0;
  for (const child of yours(v)) {
    const age = ageOn(child.born, d);
    need += c.needs.find((n) => age < n.under)?.minutes ?? 0;
  }
  const partner = !whole && (v.fact('circle.living') as number) >= 0;
  return partner ? Math.ceil((need * (100 - c.partner)) / 100) : need;
}

/** Minutes of care given on a day. */
export const givenOn = (v: FamilyView, d: number): number => {
  const care = familyOf(v).care;
  return care.day === d ? care.minutes : 0;
};

/** What a sitting of care can be now: the rest of today's, at most the record's sitting. */
export function sittingNow(v: FamilyView): number {
  if (yours(v).length === 0) return 0;
  const left = needOn(v, day(v)) - givenOn(v, day(v));
  return Math.max(0, Math.min(pregnancyOf(v.content).care.sitting, left));
}

/** `family/care`: a sitting of care, passing its time. */
export const care = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const most = sittingNow(ctx);
    const minutes = action.minutes;
    if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes < 1 || minutes > most)
      return ctx.refuse('bad-minutes');
    const today = day(ctx);
    const w = ctx.write();
    w.care = { day: today, minutes: givenOn(ctx, today) + minutes };
    w.given = { ...w.given, you: w.given.you + minutes };
    ctx.apply({ effect: 'end-activity' });
    ctx.emit('cared', { minutes });
    ctx.apply({ effect: 'wait', minutes });
  },
  options: (v: FamilyView) => {
    const minutes = sittingNow(v);
    return minutes > 0 ? [{ minutes }] : [];
  },
};

/** A day ended: was its care enough? Too many days short in the window bring a report. */
export function dayOfCare(ctx: Ctx, d: number): void {
  const c = pregnancyOf(ctx.content).care;
  const need = needOn(ctx, d);
  // What a partner you live with gave that day: who cared most is weighed at a parting (D100).
  const theirs = needOn(ctx, d, true) - need;
  if (theirs > 0) {
    const g = ctx.write().given;
    ctx.write().given = { ...g, them: g.them + theirs };
  }
  if (need > 0 && givenOn(ctx, d) < need) {
    const w = ctx.write();
    w.missed = [...w.missed.filter((m) => m > d - c.neglect.window), d];
    ctx.emit('short', { day: d });
  }
  safetyPlan(ctx, d);
  const s = ctx.read();
  if (s.report && d >= s.report.closes) {
    const found = s.missed.some((m) => m >= (s.report as { made: number }).made);
    const w = ctx.write();
    w.report = null;
    if (found) {
      w.findings++;
      w.plan = { from: d + 1, until: d + 1 + c.plan.days };
    }
    ctx.emit('investigated', { found });
    if (found) ctx.emit('planned', { until: d + 1 + c.plan.days });
  } else if (!s.report && s.missed.filter((m) => m > d - c.neglect.window).length >= c.neglect.days) {
    ctx.write().report = { made: d + 1, closes: d + 1 + c.investigation };
    ctx.emit('reported', { closes: d + 1 + c.investigation });
  }
}

/**
 * A safety plan's day (D102): enough days short of care within it, and the children who live
 * with you go to their other parent, or into foster care when that parent lives with you too;
 * at its end, it closes.
 */
function safetyPlan(ctx: Ctx, d: number): void {
  const plan = ctx.read().plan;
  if (!plan) return;
  const short = ctx.read().missed.filter((m) => m >= plan.from).length;
  if (short >= pregnancyOf(ctx.content).care.plan.short) {
    const living = ctx.fact('circle.living') as number;
    ctx.write().children = ctx.read().children.map((child) => {
      if (child.with !== 'you') return child;
      const to = child.other !== living && child.other >= 0 ? 'them' : 'care';
      ctx.emit('removed', { child: child.first, to });
      return { ...child, with: to, parted: child.parted >= 0 ? child.parted : d };
    });
    ctx.write().plan = null;
  } else if (d >= plan.until) {
    ctx.write().plan = null;
    ctx.emit('plan-closed', {});
  }
}

/** A shift worked: daycare for a young child while you're out, once a day, unless a partner is home. */
export function daycare(ctx: Ctx): void {
  const c = pregnancyOf(ctx.content).care;
  const today = day(ctx);
  if (ctx.read().daycare === today) return;
  const young = yours(ctx).some((child) => ageOn(child.born, today) < c.daycare.under);
  if (!young) return;
  const living = ctx.fact('circle.living') as number;
  if (living >= 0 && ctx.fact('circle.living-works') !== true) return;
  ctx.write().daycare = today;
  const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: c.daycare.cost } }));
  if (!paid.ok) ctx.write().owed += c.daycare.cost;
  ctx.emit('daycare', { cents: c.daycare.cost, paid: paid.ok });
}
