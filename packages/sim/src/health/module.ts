/**
 * Being ill or hurt, and what care costs (M2.7 step 2, D104, D105). Each day a cold or the flu
 * may come at its yearly rate, and a shift may bring an injury at work's rate; while it lasts it
 * takes health a day and, for its first days, keeps you from work. A doctor's visit shortens what
 * medicine can shorten, at the price your coverage sets: the Healthy Michigan Plan below its
 * income line, or the full price. Health at nothing puts you in hospital for the record's days.
 */

import { defineModule, type ModuleContext } from '@eb/core';
import {
  COVERAGES,
  type Coverage,
  dayChance,
  hospitalCost,
  type IllnessRecord,
  illnessOf,
  kindOf,
  shiftChance,
  visitCost,
} from './records.ts';

export interface HealthSlice {
  /** What you have and when it ends, and the day it stops keeping you from work. */
  ill: { kind: string; until: number; off: number; seen: boolean } | null;
  /** The day a hospital stay ends, or -1. */
  hospital: number;
  settled: number;
  /** Care's bills unpaid, in cents. */
  owed: number;
}

type Ctx = ModuleContext<HealthSlice>;

/** What a hospital day sees to. */
const CARED = { rest: 100, food: 100, hygiene: 100 } as const;
type View = { fact(id: string, args?: Readonly<Record<string, unknown>>): unknown };
const day = (v: View) => v.fact('time.day') as number;

/** Medicaid when your gross month is under the line for your household (D105), or none. */
export function coverage(v: View, r: IllnessRecord): Coverage {
  // An employer's plan first: those who have one take it, whatever Medicaid would give.
  if (v.fact('job.insured') === true) return 'employer';
  const household = 1 + ((v.fact('circle.living') as number) >= 0 ? 1 : 0) + (v.fact('family.with-you') as number);
  const month = ((v.fact('job.employed') === true ? (v.fact('job.wage') as number) : 0) * r.medicaid.hours) | 0;
  return month < r.medicaid.one + (household - 1) * r.medicaid.each ? 'medicaid' : 'none';
}

/** Pays a bill, or owes what can't be paid. */
function bill(ctx: Ctx, cents: number): boolean {
  if (cents <= 0) return true;
  const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: cents } }));
  if (!paid.ok) ctx.write().owed = ctx.read().owed + cents;
  return paid.ok;
}

function fall(ctx: Ctx, r: IllnessRecord, id: string, d: number): void {
  const k = kindOf(r, id);
  ctx.write().ill = { kind: id, until: d + k.days, off: d + k.off, seen: false };
  ctx.emit('fell-ill', { kind: id });
}

/** A day of the hospital, of an illness, and of perhaps falling ill. */
function dayOf(ctx: Ctx, r: IllnessRecord, d: number): void {
  const s = ctx.read();
  if (s.hospital >= 0) {
    if (d >= s.hospital) {
      ctx.write().hospital = -1;
      // Sent home fed and washed, with the last day's care given.
      ctx.apply({ effect: 'adjust-needs', needs: { ...CARED, health: r.hospital.health } });
      if (ctx.modes.current.id === 'hospital') ctx.modes.pop();
      ctx.emit('discharged', {});
    } else {
      // Fed, rested and washed, as prison's day is, and treated: health given back by the day.
      ctx.apply({ effect: 'adjust-needs', needs: { ...CARED, health: r.hospital.health } });
      bill(ctx, hospitalCost(r, coverage(ctx, r)));
    }
  }
  const ill = ctx.read().ill;
  if (ill && d >= ill.until) {
    ctx.write().ill = null;
    ctx.emit('recovered', { kind: ill.kind });
  } else if (ill) {
    // Treated in hospital, it takes nothing more; and nobody falls ill twice at once.
    if (ctx.read().hospital < 0) ctx.apply({ effect: 'adjust-needs', needs: { health: -kindOf(r, ill.kind).health } });
  } else {
    const rng = ctx.rng('health');
    const k = r.kinds.find((x) => !x.work && rng.int(0, 99_999) < dayChance(x));
    if (k) fall(ctx, r, k.id, d);
  }
  // An illness or injury that brings health to nothing, out in the world: hospital. Neglect alone
  // raises the chance of dying (lives/), but a day unfed takes health to nothing at the needs'
  // pace, which isn't a real day's harm (open question 91); prison has its own infirmary.
  const sick = ctx.read().ill !== null && ctx.modes.current.id === 'world';
  if (sick && ctx.read().hospital < 0 && (ctx.fact('life.need', { need: 'health' }) as number) <= 0) {
    ctx.write().hospital = d + r.hospital.days;
    ctx.modes.push('hospital', {});
    ctx.emit('admitted', { days: r.hospital.days, coverage: coverage(ctx, r) });
  }
}

function settle(ctx: Ctx): void {
  const r = illnessOf(ctx.content);
  const today = day(ctx);
  const s = ctx.read();
  if (s.settled < 0 || !r) {
    if (s.settled !== today) ctx.write().settled = today;
    return;
  }
  for (let d = s.settled + 1; d <= today; d++) dayOf(ctx, r, d);
  if (today > s.settled) ctx.write().settled = today;
}

/** Open for a visit: a weekday in the clinic's hours, with something to see the doctor for. */
function canVisit(v: View, s: Readonly<HealthSlice>, r: IllnessRecord): boolean {
  if (!s.ill || s.ill.seen || s.hospital >= 0) return false;
  const hour = Math.floor((v.fact('time.of-day') as number) / 60);
  const weekday = v.fact('time.weekday') as string;
  return weekday !== 'saturday' && weekday !== 'sunday' && hour >= r.visit.opens && hour < r.visit.closes;
}

export const healthModule = defineModule<HealthSlice>({
  id: 'health',
  version: 1,
  init: () => ({ ill: null, hospital: -1, settled: -1, owed: 0 }),
  events: {
    'fell-ill': { args: { kind: { type: 'text' } }, label: 'Fell ill or was hurt' },
    recovered: { args: { kind: { type: 'text' } }, label: 'Got better' },
    'saw-doctor': { args: { cents: { type: 'int', min: 0 }, paid: { type: 'bool' } }, label: 'Saw a doctor' },
    admitted: {
      args: { days: { type: 'int', min: 1 }, coverage: { type: 'enum', values: COVERAGES } },
      label: 'Taken into hospital',
    },
    discharged: { args: {}, label: 'Let out of hospital' },
  },
  facts: {
    ill: {
      read: ({ state }) => state.ill?.kind ?? '',
      domain: { type: 'text' },
      label: 'what you are ill with, or nothing',
    },
    'off-work': {
      read: (v) => v.state.ill !== null && day(v) < v.state.ill.off,
      domain: { type: 'bool' },
      label: 'too ill or hurt to work',
    },
    'ill-until': {
      read: ({ state }) => state.ill?.until ?? -1,
      domain: { type: 'int', min: -1 },
      label: 'the day you get better',
    },
    coverage: {
      read: (v) => {
        const r = illnessOf(v.content);
        return r ? coverage(v, r) : 'none';
      },
      domain: { type: 'enum', values: COVERAGES },
      label: 'who pays for your care',
    },
    'visit-cost': {
      read: (v) => {
        const r = illnessOf(v.content);
        return r ? visitCost(r, coverage(v, r)) : 0;
      },
      domain: { type: 'int', min: 0 },
      label: 'what a doctor’s visit costs you',
    },
    'in-hospital': { read: ({ state }) => state.hospital >= 0, domain: { type: 'bool' }, label: 'in hospital' },
    'hospital-until': {
      read: ({ state }) => state.hospital,
      domain: { type: 'int', min: -1 },
      label: 'the day you leave hospital',
    },
    owed: { read: ({ state }) => state.owed, domain: { type: 'int', min: 0 }, label: 'care’s bills unpaid' },
  },
  actions: {
    'see-doctor': {
      run: (ctx) => {
        const r = illnessOf(ctx.content);
        if (!r || !canVisit(ctx, ctx.read(), r)) return ctx.refuse('no-visit');
        const ill = ctx.read().ill as NonNullable<HealthSlice['ill']>;
        const cents = visitCost(r, coverage(ctx, r));
        const paid = bill(ctx, cents);
        const k = kindOf(r, ill.kind);
        ctx.write().ill = {
          ...ill,
          seen: true,
          until: Math.max(day(ctx) + 1, ill.until - k.visit),
          off: Math.max(day(ctx), ill.off - k.visit),
        };
        ctx.apply({ effect: 'wait', minutes: r.visit.minutes });
        ctx.emit('saw-doctor', { cents, paid });
      },
      options: (v) => {
        const r = illnessOf(v.content);
        return r && canVisit(v, v.state, r) ? [{}] : [];
      },
    },
    // A day in hospital: what passes the time there, as prison's day does.
    rest: {
      run: (ctx) => {
        if (ctx.read().hospital < 0) return ctx.refuse('not-in-hospital');
        // Three stretches of eight hours, fed and rested at each: nobody goes hungry in hospital.
        for (let k = 0; k < 3 && ctx.read().hospital >= 0; k++) {
          ctx.apply({ effect: 'adjust-needs', needs: CARED });
          ctx.apply({ effect: 'wait', minutes: 8 * 60 });
        }
      },
      options: (v) => (v.state.hospital >= 0 ? [{}] : []),
    },
    'pay-bill': {
      run: (ctx) => {
        const owed = ctx.read().owed;
        if (owed <= 0) return ctx.refuse('nothing-owed');
        ctx.apply({ effect: 'pay-cost', cost: { cash: owed } });
        ctx.write().owed = 0;
      },
      options: (v) =>
        v.state.owed > 0 && (v.fact('economy.amount', { resource: 'cash' }) as number) >= v.state.owed ? [{}] : [],
    },
  },
  on: {
    'time/passed': (ctx) => settle(ctx),
    // An heir is well, and care's bills were the estate's (M2.7 step 3).
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), { ill: null, hospital: -1, settled: day(ctx), owed: 0 });
    },
    // A shift worked: an injury at work's chance for the minutes of it (D104).
    'job/worked': (ctx, event) => {
      const r = illnessOf(ctx.content);
      if (!r || ctx.read().ill) return;
      const minutes = event.minutes as number;
      const rng = ctx.rng('health');
      const k = r.kinds.find((x) => x.work && rng.int(0, 99_999) < shiftChance(x, minutes));
      if (k) fall(ctx, r, k.id, day(ctx));
    },
  },
  modes: { hospital: { actions: ['health/*', 'time/*'] } },
});
