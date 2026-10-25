/**
 * The family module (M2.6 step 4, D96, D97): a pregnancy you're part of, from the night it
 * begins to a birth or its end, and the children born to you. It hears time pass and settles
 * each day; who people are, their bodies and ages, it reads from the circle's facts.
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { care, daycare, dayOfCare, givenOn, needOn } from './care.ts';
import { born, chanceWith, conceived, conceiveRoll, known } from './pregnancy.ts';
import { pregnancyOf } from './records.ts';
import { type FamilySlice, type FamilyView, familyOf, migrateFamily2, noFamily, type Pregnancy, YOU } from './state.ts';

type Ctx = ModuleContext<FamilySlice>;
type View = FamilyView;

const slice = familyOf;
const day = (v: { fact(id: string): unknown }) => v.fact('time.day') as number;
const weekOf = (v: View, p: Pick<Pregnancy, 'conceived'>) => Math.floor((day(v) - p.conceived) / 7);

/**
 * Each day since the last settled: the day before's care weighed (care.ts), and a pregnancy known
 * at its week, lost on its day, born when due.
 */
function settle(ctx: Ctx): void {
  const today = day(ctx);
  const s = ctx.read();
  if (today <= s.settled) return;
  const caring = s.children.some((c) => c.with === 'you') || s.report !== null;
  for (let d = s.settled + 1; d <= today; d++) {
    if (caring) dayOfCare(ctx, d - 1);
    if (ctx.read().pregnancy) pregnancyDay(ctx, d);
  }
  ctx.write().settled = today;
}

function pregnancyDay(ctx: Ctx, d: number): void {
  const rec = pregnancyOf(ctx.content);
  const p = ctx.read().pregnancy;
  if (!p) return;
  if (!p.known && d >= p.conceived + rec.known * 7) known(ctx);
  const after = ctx.read().pregnancy;
  if (!after) return;
  if (after.known && after.loss >= 0 && d >= after.loss) {
    ctx.write().pregnancy = null;
    ctx.emit('miscarried', { carrier: after.carrier === YOU ? 'you' : 'them', name: nameOf(ctx, after) });
    return;
  }
  // Past the legal limit undecided, it goes on (D97).
  if (after.choice === 'open' && d >= after.conceived + rec.end.limit * 7) {
    (ctx.write().pregnancy as Pregnancy).choice = 'continue';
  }
  if (d >= after.due) born(ctx);
}

const nameOf = (ctx: Ctx, p: Pregnancy) =>
  ctx.fact('circle.name', { person: p.carrier === YOU ? p.other : p.carrier }) as string;

/** A clinic's hours on a weekday. */
function clinicOpen(v: View): boolean {
  const e = pregnancyOf(v.content).end;
  const weekday = v.fact('time.weekday') as string;
  const hour = Math.floor((v.fact('time.of-day') as number) / 60);
  return weekday !== 'saturday' && weekday !== 'sunday' && hour >= e.opens && hour < e.closes;
}

/** Yours to choose: a pregnancy you carry, known, the choice still open. */
const yoursToChoose = (v: View) => {
  const p = slice(v).pregnancy;
  return p && p.carrier === YOU && p.known && p.choice === 'open' ? p : null;
};

/** What ending it costs now: pills up to their week, a procedure after, nothing past the limit. */
export function endCost(v: View): number | null {
  const p = yoursToChoose(v);
  if (!p) return null;
  const e = pregnancyOf(v.content).end;
  const week = weekOf(v, p);
  if (week > e.limit) return null;
  return week <= e.pills ? e.pillCost : e.clinicCost;
}

const cash = (v: View) => v.fact('economy.amount', { resource: 'cash' }) as number;

export const familyModule = defineModule<FamilySlice>({
  id: 'family',
  // 2 (M2.6 step 4b): a child's care.
  version: 2,
  migrate: { 2: migrateFamily2 },
  init: noFamily,
  events: {
    conceived: { args: {}, label: 'A pregnancy began, not yet known' },
    pregnant: {
      args: { carrier: { type: 'enum', values: ['you', 'them'] }, name: { type: 'text' } },
      label: 'Found out about a pregnancy',
    },
    'their-choice': { args: { name: { type: 'text' }, continue: { type: 'bool' } }, label: 'A partner chose' },
    chose: { args: { continue: { type: 'bool' }, week: { type: 'int', min: 0 } }, label: 'Chose about a pregnancy' },
    miscarried: {
      args: { carrier: { type: 'enum', values: ['you', 'them'] }, name: { type: 'text' } },
      label: 'A miscarriage',
    },
    born: {
      args: { name: { type: 'text' }, other: { type: 'text' }, carrier: { type: 'enum', values: ['you', 'them'] } },
      label: 'A child was born',
    },
    'paid-bill': { args: { cents: { type: 'int', min: 0 } }, label: 'Paid the birth’s bill' },
    cared: { args: { minutes: { type: 'int', min: 1 } }, label: 'Cared for your child' },
    short: { args: { day: { type: 'int', min: 0 } }, label: 'A day your child went without enough care' },
    reported: { args: { closes: { type: 'int', min: 0 } }, label: 'Reported to child protective services' },
    investigated: { args: { found: { type: 'bool' } }, label: 'An investigation closed' },
    daycare: { args: { cents: { type: 'int', min: 0 }, paid: { type: 'bool' } }, label: 'Paid for daycare' },
  },
  facts: {
    pregnant: {
      read: ({ state }) => state.pregnancy?.known === true,
      domain: { type: 'bool' },
      label: 'a pregnancy you know of',
    },
    week: {
      read: (v) => (v.state.pregnancy?.known ? weekOf(v, v.state.pregnancy) : -1),
      domain: { type: 'int', min: -1 },
      label: 'its week, or -1',
    },
    children: { read: ({ state }) => state.children.length, domain: { type: 'int', min: 0 }, label: 'your children' },
    owed: {
      read: ({ state }) => state.owed,
      domain: { type: 'int', min: 0 },
      label: 'a birth’s or daycare’s bill unpaid',
    },
    'care-left': {
      read: (v) => Math.max(0, needOn(v, v.fact('time.day') as number) - givenOn(v, v.fact('time.day') as number)),
      domain: { type: 'int', min: 0 },
      label: 'minutes of care your children still need today',
    },
    findings: {
      read: ({ state }) => state.findings,
      domain: { type: 'int', min: 0 },
      label: 'investigations that found care wanting',
    },
    chance: {
      args: { person: { type: 'int', min: 0 }, protect: { type: 'bool' } },
      read: (v, { person, protect }) => chanceWith(v, person as number, protect === true),
      domain: { type: 'int', min: 0, max: 10000 },
      label: 'a night’s chance in ten thousand of a pregnancy',
    },
  },
  actions: {
    // Yours to choose (D97): to go on, or to end it at a clinic, in its hours, while the law allows.
    continue: {
      run: (ctx) => {
        const p = yoursToChoose(ctx);
        if (!p) return ctx.refuse('nothing-to-choose');
        (ctx.write().pregnancy as Pregnancy).choice = 'continue';
        ctx.emit('chose', { continue: true, week: weekOf(ctx, p) });
      },
      options: (v) => (yoursToChoose(v) ? [{}] : []),
    },
    end: {
      run: (ctx) => {
        const cost = endCost(ctx);
        const p = yoursToChoose(ctx);
        if (cost === null || !p) return ctx.refuse('cannot-end');
        if (!clinicOpen(ctx)) return ctx.refuse('clinic-closed');
        ctx.apply({ effect: 'pay-cost', cost: { cash: cost } });
        ctx.write().pregnancy = null;
        ctx.emit('chose', { continue: false, week: weekOf(ctx, p) });
      },
      options: (v) => {
        const cost = endCost(v);
        return cost !== null && clinicOpen(v) && cash(v) >= cost ? [{}] : [];
      },
    },
    care,
    'pay-bill': {
      run: (ctx) => {
        const owed = ctx.read().owed;
        if (owed === 0) return ctx.refuse('nothing-owed');
        ctx.apply({ effect: 'pay-cost', cost: { cash: owed } });
        ctx.write().owed = 0;
        ctx.emit('paid-bill', { cents: owed });
      },
      options: (v) => (v.state.owed > 0 && cash(v) >= v.state.owed ? [{}] : []),
    },
  },
  effects: { 'conceive-roll': conceiveRoll, conceived },
  on: {
    'time/passed': (ctx) => settle(ctx),
    // A shift worked: daycare for a young child, unless a partner is home (care.ts).
    'job/worked': (ctx) => daycare(ctx),
  },
});
