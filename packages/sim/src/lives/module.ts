/**
 * Your life's length (M2.7 step 1, D103). Your age is the start's and the days since, never
 * stored; each 30 days the life table's chance of dying within that month at your age and body is
 * rolled, raised while your health is let fall. A death ends the life: the world stops, and the
 * heir is the only way on (step 3, D20, D107): the estate is settled (heir.ts), every module hears
 * `succeeded` and sets aside what was yours alone, and the heir lives on as you.
 */
import { defineModule, type ModuleContext, type RecordStore } from '@eb/core';
import { populationOf } from '../circle/records.ts';
import { START_CASH } from '../dials.ts';
import { RENT_TIMER } from '../home.ts';
import { smallRoll } from '../odds.ts';
import { ADULT, carriesFor } from '../people/who.ts';
import { namePoolOf } from '../ties/records.ts';
import { MIDNIGHT_TIMER, midnightTimer } from '../timers.ts';
import { NAMES } from '../you.ts';
import { estateNow, heirOf } from './heir.ts';
import { mortalityOf, yearChance } from './records.ts';
import { inWardYears, WARD } from './ward.ts';

/** Days between the rolls: a month (tune). */
export const MONTH = 30;

export interface LivesSlice {
  /** The last day a month's chance was rolled through, or -1 until the first day is heard. */
  settled: number;
  /** The day you died, or -1. */
  died: number;
  /** The lives lived before this one in the family: 0 for the first (M2.7 step 3). */
  gen: number;
  /** The day you were born, counted from the life's first day: the start's age before it, or an heir's own. */
  born: number;
}

/** The first life's birthday: its age on the first day, before it. */
export const FIRST_BORN = -ADULT * 365;

type View = {
  readonly content: RecordStore;
  fact(id: string, args?: Readonly<Record<string, unknown>>): unknown;
};
type Ctx = ModuleContext<LivesSlice>;

/** A month's chance of dying now, per 100,000: the year's at your age and body over twelve, raised by low health. */
export function monthChance(v: View): number {
  const m = mortalityOf(v.content);
  const year = yearChance(m, v.fact('circle.your-age') as number, v.fact('circle.carries') === true);
  const low = (v.fact('life.need', { need: 'health' }) as number) < m.health.below;
  return Math.ceil(((low ? m.health.times : 1) * year) / 12);
}

function settle(ctx: Ctx): void {
  const s = ctx.read();
  if (s.died >= 0 || inWardYears(ctx)) return;
  const today = ctx.fact('time.day') as number;
  // Added to a save from before it: the months already lived aren't rolled again.
  if (s.settled < 0) {
    ctx.write().settled = today;
    return;
  }
  for (let d = s.settled + MONTH; d <= today; d += MONTH) {
    ctx.write().settled = d;
    ctx.apply(smallRoll(monthChance(ctx), [{ effect: 'die', cause: 'age' }]));
    if (ctx.read().died >= 0) return;
  }
}

/**
 * A ward's years (D108), passed as one wait to 8:00 on their 18th birthday. The midnight and rent
 * timers stop for them: nobody's job or flat runs while they are raised elsewhere, and the engine
 * fires at most 10,000 timers in one passage (open question 15). The life stays in the ward mode
 * until `begin`: the modules hear time pass after the action, and those that pass it a day or an
 * hour at a time see the mode and step over the years (ward.ts), so the city's people aren't lived
 * hour by hour for 18 years. Who died in them is the seed's, as on any day. The modules hear
 * `succeeded` after the action too, at the 18th birthday, so the heir's needs, health and the rest
 * are set aside then, and no illness or bill falls in the years.
 */
function wardYears(ctx: Ctx, born: number, guardian: number): void {
  const day = ctx.fact('time.day') as number;
  const minutes = (born + ADULT * 365 - day) * 1440 + 8 * 60 - (ctx.fact('time.of-day') as number);
  if (minutes <= 0) return;
  ctx.apply({ effect: 'cancel-timer', timer: MIDNIGHT_TIMER });
  ctx.apply({ effect: 'cancel-timer', timer: RENT_TIMER });
  // Raised by their other parent while they live, or by relatives the save doesn't hold (open question 93).
  ctx.modes.push(WARD, { from: day, guardian });
  ctx.apply({ effect: 'wait', minutes });
}

/** The ward's first morning of their own: the timers set again, and the months rolled from today. */
function begin(ctx: Ctx): void {
  const from = (ctx.modes.current.data as { from: number }).from;
  ctx.modes.pop();
  const day = ctx.fact('time.day') as number;
  ctx.apply({ effect: 'schedule', ...midnightTimer(1440 - (ctx.fact('time.of-day') as number)) });
  ctx.apply({ effect: 'rent-next' });
  ctx.write().settled = day;
  ctx.emit('came-of-age', { years: Math.floor((day - from) / 365) });
}

/**
 * A newcomer of 18 in the city, when nobody is left to carry on (D20): someone with nothing of the
 * life before. What you left goes to the state, debts and all, and the newcomer starts with a new
 * life's cash. Drawn from the name pool and the population's bands, as anyone is.
 */
function startOver(ctx: Ctx): void {
  const pool = namePoolOf(ctx.content, NAMES);
  const rng = ctx.rng('lives');
  const name = rng.pick(pool.first);
  const day = ctx.fact('time.day') as number;
  const pronouns = name.pronouns;
  const carries = carriesFor(populationOf(ctx.content), pronouns, rng.int(0, 999));
  const born = day - ADULT * 365;
  const was = ctx.fact('you.first') as string;
  const coworker = ctx.fact('ties.name') as string;
  const cash = ctx.fact('economy.amount', { resource: 'cash' }) as number;
  if (cash > START_CASH) ctx.apply({ effect: 'pay-cost', cost: { cash: cash - START_CASH } });
  else if (cash < START_CASH) ctx.apply({ effect: 'add-resource', resource: 'cash', by: START_CASH - cash });
  const gen = ctx.read().gen + 1;
  const w = ctx.write();
  w.died = -1;
  w.gen = gen;
  w.born = born;
  w.settled = day;
  while (ctx.modes.current.id !== 'world') ctx.modes.pop();
  ctx.emit('succeeded', {
    ...{ kind: 'newcomer', person: -1, child: -1, first: name.name, last: rng.pick(pool.last), pronouns, carries },
    ...{ born, gen, was, coworker, left: 0, debts: 0, probate: 0 },
  });
}

export const livesModule = defineModule<LivesSlice>({
  id: 'lives',
  // 2 (M2.7 step 3): the generation and the day you were born, for an heir.
  version: 2,
  migrate: { 2: (slice) => ({ ...(slice as object), gen: 0, born: FIRST_BORN }) },
  init: () => ({ settled: -1, died: -1, gen: 0, born: FIRST_BORN }),
  events: {
    died: { args: { cause: { type: 'enum', values: ['age'] }, age: { type: 'int', min: 0 } }, label: 'You died' },
    succeeded: {
      args: {
        kind: { type: 'enum', values: ['child', 'partner', 'ward', 'friend', 'newcomer'] },
        person: { type: 'int', min: -1 },
        child: { type: 'int', min: -1 },
        first: { type: 'text' },
        last: { type: 'text' },
        pronouns: { type: 'enum', values: ['she', 'he', 'they'] },
        carries: { type: 'bool' },
        born: { type: 'int' },
        gen: { type: 'int', min: 1 },
        // Who carried the chronicle's {you} and {coworker} until now: the journal's names for the life gone.
        was: { type: 'text' },
        coworker: { type: 'text' },
        left: { type: 'int', min: 0 },
        debts: { type: 'int', min: 0 },
        probate: { type: 'int', min: 0 },
      },
      label: 'Someone carried on',
    },
    'came-of-age': { args: { years: { type: 'int', min: 0 } }, label: 'A ward came of age' },
  },
  facts: {
    'month-chance': {
      read: (v) => monthChance(v),
      domain: { type: 'int', min: 0 },
      label: 'a month’s chance of dying, per 100,000',
    },
    dead: { read: ({ state }) => state.died >= 0, domain: { type: 'bool' }, label: 'whether you have died' },
    born: { read: ({ state }) => state.born, domain: { type: 'int' }, label: 'the day you were born' },
    gen: { read: ({ state }) => state.gen, domain: { type: 'int', min: 0 }, label: 'the lives before this one' },
  },
  actions: {
    begin: {
      run: (ctx) => (inWardYears(ctx) ? begin(ctx) : ctx.refuse('not-a-ward')),
      // Only the dead and ward modes allow the lives' actions; dead, it is the heir's turn instead.
      options: (v) => (v.state.died < 0 ? [{}] : []),
    },
    // With nobody to carry on, the chronicle closes and a new life starts in the same city (D20).
    'start-over': {
      run: (ctx) => {
        if (ctx.read().died < 0) return ctx.refuse('alive');
        if (heirOf(ctx)) return ctx.refuse('an-heir');
        startOver(ctx);
      },
      options: (v) => (v.state.died >= 0 && !heirOf(v) ? [{}] : []),
    },
    // The heir carries on (D20, D107); a ward after the jump to their 18th birthday (D108).
    succeed: {
      run: (ctx) => {
        if (ctx.read().died < 0) return ctx.refuse('alive');
        const h = heirOf(ctx);
        if (!h) return ctx.refuse('no-heir');
        // Wages owed are the estate's: the last paycheck is paid before it is settled.
        ctx.apply({ effect: 'payday' });
        const e = estateNow(ctx);
        if (e.cash > e.left) ctx.apply({ effect: 'pay-cost', cost: { cash: e.cash - e.left } });
        const gen = ctx.read().gen + 1;
        const was = ctx.fact('you.first') as string;
        const coworker = ctx.fact('ties.name') as string;
        const { kind, person, child, first, last, pronouns, carries, born } = h;
        const w = ctx.write();
        w.died = -1;
        w.gen = gen;
        w.born = born;
        w.settled = ctx.fact('time.day') as number;
        while (ctx.modes.current.id !== 'world') ctx.modes.pop();
        ctx.emit('succeeded', {
          ...{ kind, person, child, first, last, pronouns, carries, born, gen, was, coworker },
          ...{ left: e.left, debts: e.debts, probate: e.probate },
        });
        if (kind === 'ward') wardYears(ctx, born, h.other);
      },
      options: (v) => {
        if (v.state.died < 0) return [];
        const h = heirOf(v);
        return h ? [{}] : [];
      },
    },
  },
  effects: {
    // The estate and the heir as they would be now, for the page to show before you go on (D109).
    estate: {
      run: () => {},
      preview: (ctx) => ({ ...estateNow(ctx), heir: heirOf(ctx) }),
    },
    die: {
      run: (ctx, effect) => {
        if (ctx.read().died >= 0) return;
        ctx.write().died = ctx.fact('time.day') as number;
        ctx.emit('died', { cause: effect.cause as 'age', age: ctx.fact('circle.your-age') as number });
        ctx.modes.push('dead', {});
      },
      preview: (ctx) => ({ chance: monthChance(ctx) }),
    },
  },
  on: { 'time/passed': (ctx) => settle(ctx) },
  // A death stops the world; only the heir goes on.
  modes: { dead: { actions: ['lives/*'] }, [WARD]: { actions: ['lives/*'] } },
});
