/**
 * The court (D47): on your court date you go, or a warrant follows. You plead guilty, ask for
 * HYTA if it is offered, or contest it at odds the evidence sets, shown first. And what follows:
 * probation's check-ins, and paying what you owe.
 */
import type { Action, Effect, OptionsView, PreviewContext } from '@eb/core';
import { todayOf } from '../job/days.ts';
import { ageOn, type Case, convict, crime, type LawContext, type LawSlice, type LawView, sliceOf } from './state.ts';

/** The case whose hearing is open now: today's, within the court's hours, not yet a warrant. */
function today(view: LawView | LawContext): Case | undefined {
  if (sliceOf(view).cases.length === 0) return undefined;
  const day = view.fact('time.day') as number;
  const hour = view.fact('clock.hour') as number;
  const h = crime(view).hearing;
  if (hour < h.from || hour >= h.to) return undefined;
  return sliceOf(view).cases.find((k) => k.court === day && !k.warrant);
}

export const attend = {
  run(ctx: LawContext) {
    const k = today(ctx);
    if (!k) return ctx.refuse('no-hearing-now');
    ctx.modes.push('court', { case: k.id });
    ctx.emit('in-court', { case: k.id });
  },
  options: (view: LawView) => (today(view) ? [{}] : []),
};

/** The case the court is hearing: the court mode's. */
function caseInCourt(view: LawContext | OptionsView<LawSlice>): Case | undefined {
  const frame = 'modes' in view ? view.modes.current : view.mode;
  if (frame.id !== 'court') return undefined;
  const id = (frame.data as { case?: number } | undefined)?.case;
  return sliceOf(view as LawContext).cases.find((k) => k.id === id);
}

/** HYTA is offered on a first offence, below its age, to someone never on it before (D47). */
function hytaOffered(view: LawContext | LawView): boolean {
  const s = sliceOf(view as LawContext);
  return s.convictions === 0 && s.hyta === 'none' && ageOn(view.fact('time.day') as number) < crime(view).hyta.age;
}

const contestOdds = (view: LawContext | PreviewContext<LawSlice>, k: Case): number =>
  crime(view).contest[k.evidence === 'held' ? 'held' : 'camera'];

export const plead = {
  run(ctx: LawContext, action: Action) {
    const k = caseInCourt(ctx);
    if (!k) return ctx.refuse('no-case');
    const plea = action.plea;
    if (plea === 'hyta' && !hytaOffered(ctx)) return ctx.refuse('not-offered');
    if (plea !== 'guilty' && plea !== 'hyta' && plea !== 'contest') return ctx.refuse('bad-plea');
    const w = ctx.write();
    w.cases = w.cases.filter((x) => x.id !== k.id);
    ctx.modes.pop();
    ctx.emit('pleaded', { case: k.id, plea });
    if (plea === 'guilty') return convict(ctx, k.offence, 'plea');
    if (plea === 'hyta') return onProbation(ctx, k);
    ctx.apply({ effect: 'contest', case: k.id, chance: contestOdds(ctx, k), offence: k.offence });
  },
  options: (view: OptionsView<LawSlice>) => {
    if (!caseInCourt(view)) return [];
    const pleas = hytaOffered(view) ? ['guilty', 'hyta', 'contest'] : ['guilty', 'contest'];
    return pleas.map((plea) => ({ plea }));
  },
};

function onProbation(ctx: LawContext, k: Case): void {
  const h = crime(ctx).hyta;
  const day = todayOf(ctx).day;
  const w = ctx.write();
  w.hyta = 'on';
  w.probation = { until: day + h.days, next: day + h.every, offence: k.offence };
  ctx.emit('trainee', { case: k.id, until: day + h.days });
}

/** `contest`: rolled at the odds the evidence sets, which its preview shows. */
export const contest = {
  run(ctx: LawContext, effect: Effect) {
    const chance = effect.chance as number;
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance, effects: [{ effect: 'dismissed', case: effect.case }] },
        { chance: 100 - chance, effects: [{ effect: 'found-guilty', case: effect.case, offence: effect.offence }] },
      ],
    });
  },
  preview(ctx: PreviewContext<LawSlice>, effect: Effect) {
    const k = ctx.read().cases.find((x) => x.id === effect.case);
    return { chance: k ? contestOdds(ctx, k) : 0 };
  },
};

export const checkIn = {
  run(ctx: LawContext) {
    const p = ctx.read().probation;
    if (!p || p.next !== todayOf(ctx).day) return ctx.refuse('no-check-in');
    const h = crime(ctx).hyta;
    const w = ctx.write();
    w.probation = { ...p, next: p.next + h.every };
    w.owed.court += h.fee;
    ctx.emit('checked-in', { next: p.next + h.every });
  },
  options: (view: LawView) => {
    const p = view.state.probation;
    return p && p.next === (view.fact('time.day') as number) ? [{}] : [];
  },
};

const owedAll = (s: { owed: { demand: number; court: number } }) => s.owed.demand + s.owed.court;

/** `law/pay`: everything owed, once you have it. */
export const pay = {
  run(ctx: LawContext) {
    const owed = owedAll(ctx.read());
    if (owed === 0) return ctx.refuse('nothing-owed');
    if ((ctx.fact('economy.amount', { resource: 'cash' }) as number) < owed) return ctx.refuse('not-enough');
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: -owed });
    ctx.write().owed = { demand: 0, court: 0 };
    ctx.emit('paid', { owed });
  },
  options: (view: LawView) => {
    const owed = owedAll(view.state);
    return owed > 0 && (view.fact('economy.amount', { resource: 'cash' }) as number) >= owed ? [{}] : [];
  },
};

export const owedOf = owedAll;
