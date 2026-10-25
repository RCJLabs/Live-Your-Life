/**
 * Courting (M2.6 step 2, D93, D94): talking with someone where you both are, asking them out in
 * person, planning dates by phone once they've said yes, the date itself, and breaking up. Every
 * chance is worked out by the courtship record from their attraction to you, their regard and how
 * well you know each other (records.ts), previewed before it is rolled, so the odds on screen are
 * the odds rolled. Dating more than one person is allowed; on each date the others may find out.
 */
import type { Effect, FactView, ModuleContext, PreviewContext } from '@eb/core';
import { familiarityOf } from '../ties/memory.ts';
import { hauntsOf, nameOf, presentAt, rosterNow } from './meet.ts';
import { courtshipOf, oddsOf, populationOf } from './records.ts';
import { type CircleSlice, partnered, type Tie } from './state.ts';

type Ctx = ModuleContext<CircleSlice>;
type View = FactView<CircleSlice> | Ctx | PreviewContext<CircleSlice>;

export const slice = (v: View) => ('state' in v ? v.state : v.read());
const fact = (v: View, id: string, args?: Record<string, unknown>) => v.fact(id, args);
export const today = (v: View) => fact(v, 'time.day') as number;
export const minuteOfDay = (v: View) => fact(v, 'time.of-day') as number;
export const hourNow = (v: View) => today(v) * 24 + Math.floor(minuteOfDay(v) / 60);
export const tieOf = (v: View, person: unknown) => slice(v).ties.find((t) => t.person === person);
export const name = (v: View, person: number) => nameOf(v.content, fact(v, 'people.seed') as number, person);

/**
 * Where you are with others now: the third place you've gone out to, until you do something else
 * there than socialise; or your tier-1 workplace while a shift is on. An activity passes its whole
 * time in one action, so these are the moments between.
 */
function placeNow(v: View): number {
  if (slice(v).out >= 0) return slice(v).out;
  if (fact(v, 'job.on-shift') === true) return fact(v, 'market.place') as number;
  return -1;
}

/** The people you know who are where you are now. */
export function withYou(v: View): Tie[] {
  const place = placeNow(v);
  const roster = place >= 0 ? rosterNow(v) : null;
  if (!roster) return [];
  const weekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(
    fact(v, 'time.weekday') as string,
  );
  const here = presentAt(roster, fact(v, 'people.seed') as number, hourNow(v), weekday, place);
  return slice(v).ties.filter((t) => here.includes(t.person));
}

export const familiarity = (v: View, t: Tie) => familiarityOf(t.together, populationOf(v.content).ties.half * 60);
export const attraction = (v: View, t: Tie) => fact(v, 'circle.attraction', { person: t.person }) as number;

/** The chances, by the record (records.ts). Asking someone not drawn to you is always no. */
export const talkOdds = (v: View, t: Tie) =>
  oddsOf(courtshipOf(v.content).talk.odds, attraction(v, t), t.regard, familiarity(v, t));
export const askOdds = (v: View, t: Tie) =>
  attraction(v, t) === 0 ? 0 : oddsOf(courtshipOf(v.content).ask.odds, attraction(v, t), t.regard, familiarity(v, t));
export const dateOdds = (v: View, t: Tie) =>
  oddsOf(courtshipOf(v.content).date.odds, attraction(v, t), t.regard, familiarity(v, t));

/** The chance another partner finds out about a date at `place`: more when it's their third place too. */
export function foundOdds(v: View, other: Tie, place: number): number {
  const f = courtshipOf(v.content).found;
  const roster = rosterNow(v);
  const shared = roster?.people[other.person]?.third === place ? f.shared : 0;
  return Math.min(f.most, f.base + shared);
}

/** A roll at a chance, with what follows each way. */
export const roll = (ctx: Ctx, chance: number, yes: Effect[], no: Effect[]) =>
  ctx.apply({
    effect: 'roll',
    outcomes: [
      ...(chance > 0 ? [{ chance, effects: yes }] : []),
      ...(chance < 100 ? [{ chance: 100 - chance, effects: no }] : []),
    ],
  });

const canTalk = (v: View, t: Tie) => t.talked !== hourNow(v);
const canAsk = (v: View, t: Tie) => {
  const a = courtshipOf(v.content).ask;
  return (
    (t.status === 'known' || t.status === 'ex' || t.status === 'divorced') &&
    fact(v, 'circle.drawn', { person: t.person }) === true &&
    familiarity(v, t) >= a.familiarity &&
    (t.asked < 0 || today(v) - t.asked >= a.again)
  );
};

/** The date planned for today that you can still turn up to. */
function dateOpen(v: View, t: Tie): boolean {
  if (!partnered(t) || !t.date || t.date.day !== today(v)) return false;
  const m = minuteOfDay(v);
  return m >= t.date.minute && m <= t.date.minute + courtshipOf(v.content).date.window;
}

export const talk = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const t = withYou(ctx).find((w) => w.person === action.person);
    if (!t) return ctx.refuse('not-here');
    if (!canTalk(ctx, t)) return ctx.refuse('talked-this-hour');
    ctx.apply({ effect: 'talk-roll', person: t.person });
  },
  options: (v: View) =>
    withYou(v)
      .filter((t) => canTalk(v, t))
      .map((t) => ({ person: t.person })),
};

export const talkRoll = {
  run(ctx: Ctx, effect: Effect) {
    const t = tieOf(ctx, effect.person) as Tie;
    roll(
      ctx,
      talkOdds(ctx, t),
      [{ effect: 'talked', person: t.person, good: true }],
      [{ effect: 'talked', person: t.person, good: false }],
    );
  },
  preview: (ctx: PreviewContext<CircleSlice>, effect: Effect) => {
    const t = tieOf(ctx, effect.person);
    return t ? { chance: talkOdds(ctx, t) } : { refused: 'unknown' };
  },
};

export function talked(ctx: Ctx, effect: Effect): void {
  const c = courtshipOf(ctx.content).talk;
  const t = ctx.write().ties.find((w) => w.person === effect.person) as Tie;
  t.regard = Math.max(0, Math.min(100, t.regard + (effect.good ? c.good : c.bad)));
  t.together += c.minutes;
  t.talked = hourNow(ctx);
  t.seen = today(ctx);
  ctx.emit('talked', { person: t.person, good: effect.good === true });
}

export const askOut = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const t = withYou(ctx).find((w) => w.person === action.person);
    if (!t) return ctx.refuse('not-here');
    if (!canAsk(ctx, t)) return ctx.refuse('cannot-ask');
    ctx.apply({ effect: 'ask-roll', person: t.person });
  },
  options: (v: View) =>
    withYou(v)
      .filter((t) => canAsk(v, t))
      .map((t) => ({ person: t.person })),
};

export const askRoll = {
  run(ctx: Ctx, effect: Effect) {
    const t = tieOf(ctx, effect.person) as Tie;
    roll(
      ctx,
      askOdds(ctx, t),
      [{ effect: 'answered', person: t.person, yes: true }],
      [{ effect: 'answered', person: t.person, yes: false }],
    );
  },
  preview: (ctx: PreviewContext<CircleSlice>, effect: Effect) => {
    const t = tieOf(ctx, effect.person);
    return t ? { chance: askOdds(ctx, t) } : { refused: 'unknown' };
  },
};

/** Their answer: yes, and you are dating, with a first date planned for tomorrow; or no, for a while. */
export function answered(ctx: Ctx, effect: Effect): void {
  const a = courtshipOf(ctx.content).ask;
  const t = ctx.write().ties.find((w) => w.person === effect.person) as Tie;
  const yes = effect.yes === true;
  t.regard = Math.max(0, Math.min(100, t.regard + (yes ? a.yes : a.no)));
  t.asked = today(ctx);
  t.seen = today(ctx);
  if (yes) {
    t.status = 'dating';
    t.since = today(ctx);
    plan(ctx, t);
  }
  ctx.emit('asked-out', { person: t.person, name: name(ctx, t.person), yes });
}

/** A date tomorrow at the record's hour, at your first third place. */
function plan(ctx: Ctx, t: Tie): void {
  const roster = rosterNow(ctx);
  const seed = ctx.fact('people.seed') as number;
  const place = roster ? (hauntsOf(roster, seed, populationOf(ctx.content).ties.haunts)[0] ?? -1) : -1;
  t.date = { day: today(ctx) + 1, minute: courtshipOf(ctx.content).date.hour * 60, place };
  ctx.emit('planned', { person: t.person, day: t.date.day });
}

export const planDate = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const t = ctx.write().ties.find((w) => w.person === action.person);
    if (!t || !partnered(t)) return ctx.refuse('not-dating');
    if (t.date) return ctx.refuse('planned-already');
    plan(ctx, t);
  },
  options: (v: View) =>
    slice(v)
      .ties.filter((t) => partnered(t) && !t.date)
      .map((t) => ({ person: t.person })),
};

export const goOnDate = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const t = tieOf(ctx, action.person);
    if (!t || !dateOpen(ctx, t)) return ctx.refuse('no-date-now');
    const cost = courtshipOf(ctx.content).date.cost;
    if ((ctx.fact('economy.amount', { resource: 'cash' }) as number) < cost) return ctx.refuse('cannot-afford');
    ctx.apply({ effect: 'date-roll', person: t.person });
  },
  options: (v: View) => {
    const open = slice(v).ties.filter((t) => t.date && dateOpen(v, t));
    if (open.length === 0) return [];
    const cash = fact(v, 'economy.amount', { resource: 'cash' }) as number;
    return cash < courtshipOf(v.content).date.cost ? [] : open.map((t) => ({ person: t.person }));
  },
};

/** The others you're dating, and the chance each finds out about a date with `t`. */
const others = (v: View, t: Tie) =>
  slice(v)
    .ties.filter((o) => partnered(o) && o.person !== t.person)
    .map((o) => ({ person: o.person, chance: foundOdds(v, o, t.date?.place ?? -1) }));

export const dateRoll = {
  run(ctx: Ctx, effect: Effect) {
    const d = courtshipOf(ctx.content).date;
    const t = tieOf(ctx, effect.person) as Tie;
    // Read before anything changes, so they are the odds the preview showed.
    const chance = dateOdds(ctx, t);
    const found = others(ctx, t);
    ctx.apply({ effect: 'pay-cost', cost: { cash: d.cost } });
    ctx.apply({ effect: 'end-activity' });
    roll(
      ctx,
      chance,
      [{ effect: 'dated', person: t.person, good: true }],
      [{ effect: 'dated', person: t.person, good: false }],
    );
    for (const o of found) roll(ctx, o.chance, [{ effect: 'found-out', person: o.person }], []);
    ctx.apply({ effect: 'adjust-needs', needs: { company: d.company } });
    ctx.apply({ effect: 'wait', minutes: d.minutes });
  },
  preview: (ctx: PreviewContext<CircleSlice>, effect: Effect) => {
    const t = tieOf(ctx, effect.person);
    if (!t) return { refused: 'unknown' };
    return { chance: dateOdds(ctx, t), cost: courtshipOf(ctx.content).date.cost, found: others(ctx, t) };
  },
};

export function dated(ctx: Ctx, effect: Effect): void {
  const d = courtshipOf(ctx.content).date;
  const t = ctx.write().ties.find((w) => w.person === effect.person) as Tie;
  t.regard = Math.max(0, Math.min(100, t.regard + (effect.good ? d.good : d.bad)));
  t.together += d.minutes;
  t.seen = today(ctx);
  t.date = null;
  // When it ends: the date's hours are waited after this (dateRoll).
  t.dated = today(ctx) * 1440 + minuteOfDay(ctx) + d.minutes;
  ctx.emit('dated', { person: t.person, name: name(ctx, t.person), good: effect.good === true });
}

/** Another partner found out (D94): their regard falls hard, and below the record's line they end it. */
export function foundOut(ctx: Ctx, effect: Effect): void {
  const c = courtshipOf(ctx.content);
  const t = ctx.write().ties.find((w) => w.person === effect.person) as Tie;
  t.regard = Math.max(0, t.regard + c.found.regard);
  ctx.emit('found-out', { person: t.person, name: name(ctx, t.person) });
  if (t.regard < c.leave.regard) end(ctx, t, 'them');
}

/**
 * It's over: they're an ex and move out, and any date planned is off. A marriage isn't ended so: it
 * is separated, and a divorce ends it (together.ts).
 */
export function end(ctx: Ctx, t: Tie, by: 'you' | 'them'): void {
  t.status = t.status === 'married' ? 'separated' : 'ex';
  t.date = null;
  t.living = false;
  t.licence = null;
  if (by === 'you') t.regard = Math.max(0, t.regard + courtshipOf(ctx.content).split.regard);
  ctx.emit('broke-up', { person: t.person, name: name(ctx, t.person), by });
}

export const breakUp = {
  run(ctx: Ctx, action: Readonly<Record<string, unknown>>) {
    const t = ctx.write().ties.find((w) => w.person === action.person);
    if (t?.status === 'married') return ctx.refuse('married');
    if (t?.status !== 'dating' && t?.status !== 'engaged') return ctx.refuse('not-dating');
    end(ctx, t, 'you');
  },
  options: (v: View) =>
    slice(v)
      .ties.filter((t) => t.status === 'dating' || t.status === 'engaged')
      .map((t) => ({ person: t.person })),
};
