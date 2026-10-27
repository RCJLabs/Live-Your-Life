/**
 * A crew of your own (M4.1 step 1, D145). In the supplier's crew, with their trust and little heat,
 * they introduce you to their connect, who sells weight at wholesale. You bring people you know into
 * a crew of your own, front each of them an ounce to sell on their own nights, and collect what
 * they owe as they sell it. A front unpaid by its day cuts them off; you can let them go, the debt
 * with them. Taken in on a corner, one may name you, more likely the less they think of you (D85).
 */
import type { Action, OptionsView } from '@eb/core';
import { TRADE, tradeOf } from './records.ts';
import { noStanding, noticed, runOff } from './rivals.ts';
import { type DealContext, type DealSlice, type DealView, earned, heatOf, type Member, sliceOf } from './state.ts';
import { cash, mostHeld, supplierHere } from './trade.ts';

const bossOf = (v: DealView) => tradeOf(v.content).boss;
const day = (v: DealView): number => v.fact('time.day') as number;
const memberOf = (v: DealView, person: number): Member | undefined =>
  sliceOf(v).members.find((m) => m.person === person) as Member | undefined;
const nameOf = (v: DealView, person: number): string => v.fact('circle.name', { person }) as string;
const known = (v: DealView): number[] => (v.fact('circle.people') as number[] | undefined) ?? [];

const connectHere = (v: DealView): boolean => {
  const h = bossOf(v).connect.hours;
  const hour = v.fact('clock.hour') as number;
  return sliceOf(v).connect && hour >= h.from && hour < h.to;
};

/** Why the supplier won't introduce you to their connect now, or null. */
function meetProblem(v: DealView): string | null {
  const s = sliceOf(v);
  if (!s.crew || !v.content.has('trade', TRADE)) return 'not-in-the-crew';
  if (s.connect) return 'met';
  if (!supplierHere(v)) return 'no-supplier-now';
  if (s.trust < bossOf(v).connect.trust) return 'not-trusted';
  if (heatOf(v) > bossOf(v).connect.heat) return 'too-hot';
  return null;
}

/** `deal/meet-connect`: the supplier's introduction, at their hours. */
export const meetConnect = {
  run(ctx: DealContext) {
    const problem = meetProblem(ctx);
    if (problem) return ctx.refuse(problem);
    ctx.write().connect = true;
    ctx.emit('met-connect', {});
  },
  options: (v: OptionsView<DealSlice>) => (meetProblem(v) === null ? [{}] : []),
};

const wholesaleLot = (v: DealView, id: unknown) => bossOf(v).connect.sells.find((l) => l.id === id);

function wholesaleProblem(v: DealView, id: unknown): string | null {
  const lot = wholesaleLot(v, id);
  if (!sliceOf(v).connect) return 'no-connect';
  if (!connectHere(v)) return 'no-connect-now';
  if (!lot) return 'no-such-lot';
  if (sliceOf(v).held + lot.grams > mostHeld(v)) return 'holding-too-much';
  if (cash(v) < lot.price) return 'short';
  return null;
}

/** `deal/wholesale {lot}`: weight from the connect, at their hours. */
export const wholesale = {
  run(ctx: DealContext, action: Action) {
    const problem = wholesaleProblem(ctx, action.lot);
    const lot = wholesaleLot(ctx, action.lot);
    if (problem || !lot) return ctx.refuse(problem ?? 'no-such-lot');
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: -lot.price });
    ctx.write().held += lot.grams;
    ctx.emit('wholesale', { lot: lot.id, grams: lot.grams, price: lot.price });
  },
  // Only with the connect: a world without the trade has no record to read.
  options: (v: OptionsView<DealSlice>) =>
    sliceOf(v).connect
      ? bossOf(v)
          .connect.sells.filter((l) => wholesaleProblem(v, l.id) === null)
          .map((l) => ({ lot: l.id }))
      : [],
};

/** Why `person` can't be brought into your crew now, or null. */
function takeOnProblem(v: DealView, person: number): string | null {
  const c = bossOf(v).crew;
  const s = sliceOf(v);
  if (!s.connect) return 'no-connect';
  if (!known(v).includes(person)) return 'not-known';
  if (memberOf(v, person)) return 'in-your-crew';
  if (s.members.length >= c.most) return 'crew-full';
  if ((v.fact('circle.familiarity', { person }) as number) < c.familiarity) return 'not-close-enough';
  if ((v.fact('circle.regard', { person }) as number) < c.regard) return 'not-enough-regard';
  return null;
}

/** `deal/take-on {person}`: someone you know, brought into your crew. */
export const takeOn = {
  run(ctx: DealContext, action: Action) {
    const person = Number(action.person);
    const problem = takeOnProblem(ctx, person);
    if (problem) return ctx.refuse(problem);
    ctx.write().members.push({
      person,
      since: day(ctx),
      held: 0,
      owed: 0,
      due: -1,
      taken: 0,
      cutOff: false,
      rival: noStanding(),
    });
    ctx.emit('took-on', { person, name: nameOf(ctx, person) });
  },
  options: (v: OptionsView<DealSlice>) =>
    sliceOf(v).connect
      ? known(v)
          .filter((p) => takeOnProblem(v, p) === null)
          .map((person) => ({ person }))
      : [],
};

function frontToProblem(v: DealView, person: number): string | null {
  const m = memberOf(v, person);
  if (!m) return 'not-in-your-crew';
  if (m.cutOff) return 'cut-off';
  if (m.owed > 0) return 'still-owed';
  if (sliceOf(v).held < bossOf(v).crew.front.grams) return 'not-enough-held';
  return null;
}

/** `deal/front-to {person}`: an ounce of what you hold, theirs to sell, owed back by a day. */
export const frontTo = {
  run(ctx: DealContext, action: Action) {
    const person = Number(action.person);
    const problem = frontToProblem(ctx, person);
    if (problem) return ctx.refuse(problem);
    const f = bossOf(ctx).crew.front;
    const w = ctx.write();
    w.held -= f.grams;
    const m = w.members.find((x) => x.person === person) as Member;
    m.held += f.grams;
    m.owed = f.price;
    m.due = day(ctx) + f.days;
    m.taken = 0;
    ctx.emit('fronted-to', { person, name: nameOf(ctx, person), grams: f.grams, owed: f.price, due: m.due });
  },
  options: (v: OptionsView<DealSlice>) =>
    sliceOf(v)
      .members.filter((m) => frontToProblem(v, m.person) === null)
      .map((m) => ({ person: m.person })),
};

/** `deal/let-go {person}`: out of your crew, with what they hold and what they owe. */
export const letGo = {
  run(ctx: DealContext, action: Action) {
    const person = Number(action.person);
    const m = memberOf(ctx, person);
    if (!m) return ctx.refuse('not-in-your-crew');
    const w = ctx.write();
    w.members = w.members.filter((x) => x.person !== person);
    ctx.emit('let-go', { person, name: nameOf(ctx, person), owed: m.owed, forgiven: m.owed > 0 });
  },
  options: (v: OptionsView<DealSlice>) => sliceOf(v).members.map((m) => ({ person: m.person })),
};

/** Whether a member sells on a day: `nights` days of the week, from the day after they joined. */
const sellsOn = (m: Member, d: number, nights: number): boolean => d > m.since && (d - m.since) % 7 <= nights - 1;

/**
 * A night of one member's: buyers through four hours, from what they hold; each sale may be seen.
 * Their takings go to what they owe you, which comes to you once it is met; the rest is theirs.
 */
function memberNight(ctx: DealContext, person: number): void {
  const t = tradeOf(ctx.content);
  const c = t.boss.crew;
  // Their corner first: run off it, they sell nothing; a holder who sees them warns or runs them off.
  const standing = ctx.write().members.find((x) => x.person === person) as Member;
  if (runOff(ctx, standing.rival) || noticed(ctx, standing.rival, person, person + 1)) return;
  const rng = ctx.rng('crew');
  let sold = 0;
  for (let k = 0; k < 24; k++) {
    const m = ctx.read().members.find((x) => x.person === person);
    if (!m || m.held < t.sale.grams) break;
    if (rng.int(0, 99) >= c.buyers) continue;
    sold++;
    const w = ctx.write().members.find((x) => x.person === person) as Member;
    w.held -= t.sale.grams;
    w.taken += t.sale.price;
    if (rng.int(0, 99) < c.seen) {
      memberArrested(ctx, person, sold);
      return;
    }
  }
  if (sold > 0) ctx.emit('member-sold', { person, name: nameOf(ctx, person), sales: sold });
  settleFront(ctx, person);
}

/** What a member owes, paid you once their takings cover it. */
function settleFront(ctx: DealContext, person: number): void {
  const m = ctx.read().members.find((x) => x.person === person);
  if (!m || m.owed === 0 || m.taken < m.owed) return;
  earned(ctx, m.owed);
  const w = ctx.write();
  w.takings += m.owed;
  const x = w.members.find((y) => y.person === person) as Member;
  ctx.emit('member-paid', { person, name: nameOf(ctx, person), paid: x.owed });
  x.taken -= x.owed;
  x.owed = 0;
  x.due = -1;
  // Paid late is still paid: the front settled, they can be fronted again.
  x.cutOff = false;
}

/** A member taken in: what they held is seized, they are out of the crew, and they may name you. */
function memberArrested(ctx: DealContext, person: number, sold: number): void {
  const t = tradeOf(ctx.content);
  const regard = ctx.fact('circle.regard', { person }) as number;
  const named = ctx.rng('crew').int(0, 99) < Math.max(0, t.boss.crew.named - regard);
  const w = ctx.write();
  w.members = w.members.filter((x) => x.person !== person);
  ctx.emit('member-arrested', { person, name: nameOf(ctx, person), sales: sold, named });
  if (!named) return;
  // Named: a statement against you, as good as two sales seen (law/drugs.ts builds the case), as the coworker's is.
  w.seen.push({ day: day(ctx), hour: 23, grams: t.sale.grams, passing: 0 });
  w.seen.push({ day: day(ctx), hour: 23, grams: t.sale.grams, passing: 0 });
  if (w.seen.length >= t.police.enough) ctx.apply({ effect: 'drug-case' });
}

/** Day `d` for your crew: a front come due unpaid cuts its member off; each selling member's night. */
export function bossDay(ctx: DealContext, d: number): void {
  const c = bossOf(ctx).crew;
  for (const m of ctx.read().members) {
    if (m.owed > 0 && m.due >= 0 && d > m.due && !m.cutOff) {
      (ctx.write().members.find((x) => x.person === m.person) as Member).cutOff = true;
      ctx.emit('member-unpaid', { person: m.person, name: nameOf(ctx, m.person), owed: m.owed });
    }
  }
  for (const m of [...ctx.read().members]) if (m.held > 0 && sellsOn(m, d, c.nights)) memberNight(ctx, m.person);
}
