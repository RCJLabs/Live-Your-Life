/**
 * Life together (M2.6 step 3, D90, D95): staying the night, asking them to move in and sharing
 * the rent, proposing, Michigan's marriage licence and a ceremony in office hours, separating and
 * a divorce. Each ask is rolled at odds the record works out and the preview shows, as courting's
 * are (court.ts); the fees and waits trace to CALIBRATION.md.
 */
import type { Effect, ModuleContext, PreviewContext } from '@eb/core';
import { RENT } from '../dials.ts';
import { attraction, end, familiarity, minuteOfDay, name, roll, slice, tieOf, today } from './court.ts';
import { rosterNow } from './meet.ts';
import { courtshipOf, oddsOf, type Step } from './records.ts';
import { type CircleSlice, partnered, type Tie } from './state.ts';

type Ctx = ModuleContext<CircleSlice>;
type View = Parameters<typeof slice>[0];
type Act = Readonly<Record<string, unknown>>;

const minuteNow = (v: View) => today(v) * 1440 + minuteOfDay(v);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const write = (ctx: Ctx, person: unknown) => ctx.write().ties.find((t) => t.person === person) as Tie;

/** The odds of a step: the record's, and points for each 30 days you've been together. */
const stepOdds = (v: View, s: Step, t: Tie) =>
  attraction(v, t) === 0
    ? 0
    : Math.min(
        s.odds.high,
        oddsOf(s.odds, attraction(v, t), t.regard, familiarity(v, t)) + Math.floor((today(v) - t.since) / 30) * s.month,
      );
const stepReady = (v: View, s: Step, t: Tie) =>
  today(v) - t.since >= s.after && (t.proposed < 0 || today(v) - t.proposed >= s.again);

/** Within the clerk's or the court's hours on a weekday. */
function officeOpen(v: View): boolean {
  const l = courtshipOf(v.content).licence;
  const weekday = v.fact('time.weekday') as string;
  const hour = Math.floor(minuteOfDay(v) / 60);
  return weekday !== 'saturday' && weekday !== 'sunday' && hour >= l.opens && hour < l.closes;
}

const cash = (v: View) => v.fact('economy.amount', { resource: 'cash' }) as number;
const others = (v: View) => slice(v).ties;

// --- Staying the night (D90): after a date, or at home together late; fade to black. ---

function canStay(v: View, t: Tie): boolean {
  if (!partnered(t)) return false;
  const n = courtshipOf(v.content).night;
  if (t.dated >= 0 && minuteNow(v) - t.dated <= n.after) return true;
  const hour = Math.floor(minuteOfDay(v) / 60);
  return t.living && (hour >= 21 || hour < 2) && t.night !== nightOf(v);
}
/** The day whose night it is: past midnight, the night is still the evening before's. */
const nightOf = (v: View) => (minuteOfDay(v) < 2 * 60 ? today(v) - 1 : today(v));
const nightOdds = (v: View, t: Tie) => {
  const n = courtshipOf(v.content).night;
  return clamp(oddsOf(n.odds, attraction(v, t), t.regard, familiarity(v, t)) + (t.living ? n.living : 0));
};

export const stay = {
  run(ctx: Ctx, action: Act) {
    const t = tieOf(ctx, action.person);
    if (!t || !canStay(ctx, t)) return ctx.refuse('not-now');
    if (typeof action.protect !== 'boolean') return ctx.refuse('bad-protect');
    ctx.apply({ effect: 'night-roll', person: t.person, protect: action.protect });
  },
  // With protection or without (M2.6 step 4): the chance of a pregnancy is shown with each.
  options: (v: View) =>
    others(v)
      .filter((t) => canStay(v, t))
      .flatMap((t) => [
        { person: t.person, protect: true },
        { person: t.person, protect: false },
      ]),
};

export const nightRoll = {
  run(ctx: Ctx, effect: Effect) {
    const t = tieOf(ctx, effect.person) as Tie;
    const protect = effect.protect === true;
    roll(
      ctx,
      nightOdds(ctx, t),
      [{ effect: 'night', person: t.person, yes: true, protect }],
      [{ effect: 'night', person: t.person, yes: false, protect }],
    );
  },
  // The chance they say yes, and in ten thousand the chance of a pregnancy if they do (the family's).
  preview: (ctx: PreviewContext<CircleSlice>, effect: Effect) => {
    const t = tieOf(ctx, effect.person);
    if (!t) return { refused: 'unknown' };
    const pregnancy = ctx.fact('family.chance', { person: t.person, protect: effect.protect === true }) as number;
    return { chance: nightOdds(ctx, t), pregnancy };
  },
};

export function night(ctx: Ctx, effect: Effect): void {
  const t = write(ctx, effect.person);
  // Asked once a date or a night: a no isn't asked again until the next.
  t.dated = -1;
  t.night = nightOf(ctx);
  if (effect.yes === true) {
    t.nights++;
    t.regard = clamp(t.regard + courtshipOf(ctx.content).night.regard);
    t.seen = today(ctx);
  }
  ctx.emit('stayed', { person: t.person, name: name(ctx, t.person), yes: effect.yes === true });
  if (effect.yes === true) ctx.apply({ effect: 'conceive-roll', person: t.person, protect: effect.protect === true });
}

// --- Moving in and proposing: asked of a partner, at odds that grow with time together. ---

const canAskIn = (v: View, t: Tie) =>
  partnered(t) && !t.living && !others(v).some((o) => o.living) && stepReady(v, courtshipOf(v.content).moveIn, t);
const canPropose = (v: View, t: Tie) => t.status === 'dating' && stepReady(v, courtshipOf(v.content).propose, t);

/** An ask of a partner: refused unless it can be asked, then rolled by its effect. */
const ask = (can: (v: View, t: Tie) => boolean, effect: string) => ({
  run(ctx: Ctx, action: Act) {
    const t = tieOf(ctx, action.person);
    if (!t || !can(ctx, t)) return ctx.refuse('cannot-ask');
    ctx.apply({ effect, person: t.person });
  },
  options: (v: View) =>
    others(v)
      .filter((t) => can(v, t))
      .map((t) => ({ person: t.person })),
});
export const askIn = ask(canAskIn, 'move-in-roll');
export const propose = ask(canPropose, 'propose-roll');

/** The roll of an ask, previewed, with its answer as `effect`. */
const stepRoll = (step: (v: View) => Step, answer: string) => ({
  run(ctx: Ctx, effect: Effect) {
    const t = tieOf(ctx, effect.person) as Tie;
    roll(
      ctx,
      stepOdds(ctx, step(ctx), t),
      [{ effect: answer, person: t.person, yes: true }],
      [{ effect: answer, person: t.person, yes: false }],
    );
  },
  preview: (ctx: PreviewContext<CircleSlice>, effect: Effect) => {
    const t = tieOf(ctx, effect.person);
    return t ? { chance: stepOdds(ctx, step(ctx), t) } : { refused: 'unknown' };
  },
});
export const moveInRoll = stepRoll((v) => courtshipOf(v.content).moveIn, 'moved-in');
export const proposeRoll = stepRoll((v) => courtshipOf(v.content).propose, 'proposal');

export function movedIn(ctx: Ctx, effect: Effect): void {
  const t = write(ctx, effect.person);
  const yes = effect.yes === true;
  t.proposed = today(ctx);
  if (yes) t.living = true;
  else t.regard = clamp(t.regard + courtshipOf(ctx.content).moveIn.no);
  ctx.emit('moved-in', { person: t.person, name: name(ctx, t.person), yes });
}

export function proposal(ctx: Ctx, effect: Effect): void {
  const t = write(ctx, effect.person);
  const yes = effect.yes === true;
  t.proposed = today(ctx);
  if (yes) t.status = 'engaged';
  else t.regard = clamp(t.regard + courtshipOf(ctx.content).propose.no);
  ctx.emit('proposed', { person: t.person, name: name(ctx, t.person), yes });
}

// --- The licence and the wedding (Michigan: CALIBRATION.md). ---

const licenceReady = (v: View, t: Tie) =>
  t.licence !== null && today(v) >= t.licence.from && today(v) <= t.licence.until;

export const licence = {
  run(ctx: Ctx, action: Act) {
    const l = courtshipOf(ctx.content).licence;
    const t = tieOf(ctx, action.person);
    if (t?.status !== 'engaged' || t.licence) return ctx.refuse('cannot-apply');
    if (!officeOpen(ctx)) return ctx.refuse('clerk-closed');
    ctx.apply({ effect: 'pay-cost', cost: { cash: l.fee } });
    write(ctx, t.person).licence = { from: today(ctx) + l.wait, until: today(ctx) + l.valid };
    ctx.emit('licensed', {
      person: t.person,
      name: name(ctx, t.person),
      from: today(ctx) + l.wait,
      until: today(ctx) + l.valid,
    });
  },
  options: (v: View) => {
    const can = others(v).filter((t) => t.status === 'engaged' && !t.licence);
    if (can.length === 0 || !officeOpen(v) || cash(v) < courtshipOf(v.content).licence.fee) return [];
    return can.map((t) => ({ person: t.person }));
  },
};

export const marry = {
  run(ctx: Ctx, action: Act) {
    const w = courtshipOf(ctx.content).wedding;
    const t = tieOf(ctx, action.person);
    if (t?.status !== 'engaged' || !licenceReady(ctx, t)) return ctx.refuse('no-licence');
    if (!officeOpen(ctx)) return ctx.refuse('court-closed');
    ctx.apply({ effect: 'pay-cost', cost: { cash: w.fee } });
    ctx.apply({ effect: 'end-activity' });
    const m = write(ctx, t.person);
    m.status = 'married';
    m.licence = null;
    m.seen = today(ctx);
    ctx.emit('married', { person: m.person, name: name(ctx, m.person) });
    ctx.apply({ effect: 'wait', minutes: w.minutes });
  },
  options: (v: View) => {
    const can = others(v).filter((t) => t.status === 'engaged' && licenceReady(v, t));
    if (can.length === 0 || !officeOpen(v) || cash(v) < courtshipOf(v.content).wedding.fee) return [];
    return can.map((t) => ({ person: t.person }));
  },
};

// --- Separating and divorcing. ---

export const separate = {
  run(ctx: Ctx, action: Act) {
    const t = tieOf(ctx, action.person);
    if (t?.status !== 'married') return ctx.refuse('not-married');
    end(ctx, write(ctx, t.person), 'you');
  },
  options: (v: View) =>
    others(v)
      .filter((t) => t.status === 'married')
      .map((t) => ({ person: t.person })),
};

const canFile = (t: Tie) => (t.status === 'married' || t.status === 'separated') && t.hearing < 0;

export const fileDivorce = {
  run(ctx: Ctx, action: Act) {
    const d = courtshipOf(ctx.content).divorce;
    const t = tieOf(ctx, action.person);
    if (!t || !canFile(t)) return ctx.refuse('cannot-file');
    ctx.apply({ effect: 'pay-cost', cost: { cash: d.fee } });
    const w = write(ctx, t.person);
    if (w.status === 'married') end(ctx, w, 'you');
    w.hearing = today(ctx) + d.wait;
    ctx.emit('filed', { person: w.person, name: name(ctx, w.person), hearing: w.hearing });
  },
  options: (v: View) => {
    const can = others(v).filter(canFile);
    if (can.length === 0 || cash(v) < courtshipOf(v.content).divorce.fee) return [];
    return can.map((t) => ({ person: t.person }));
  },
};

/** A divorce's day in court, come: the judgment (days.ts). */
export function judged(ctx: Ctx, t: Tie): void {
  const w = write(ctx, t.person);
  w.status = 'divorced';
  w.hearing = -1;
  w.living = false;
  ctx.emit('divorced', { person: w.person, name: name(ctx, w.person) });
}

/** Rent day: the partner you live with pays their share, if they work (D95). */
export function shareRent(ctx: Ctx): void {
  const t = slice(ctx).ties.find((x) => x.living);
  if (!t) return;
  const working = (rosterNow(ctx)?.people[t.person]?.work ?? -1) >= 0;
  if (!working) return;
  const share = Math.floor((RENT * courtshipOf(ctx.content).share.rent) / 100);
  ctx.apply({ effect: 'add-resource', resource: 'cash', by: share });
  ctx.emit('shared-rent', { person: t.person, cents: share });
}
