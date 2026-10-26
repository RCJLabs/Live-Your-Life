/**
 * Life events (M2.10 step 4, D134, D135). Each midnight passed, one roll at the day's chance of
 * any event, the eligible events' daily chances summed; on a hit one is picked by its share. It
 * waits until you are free: awake, out in the world, between 08:00 and 22:00. Then the
 * `life-event` mode asks for a choice, its cost and odds shown from the preview the roll uses.
 * A choice is paid, rolled, and its time passes; what follows is told and written in the journal.
 */
import { defineModule, type ModuleContext, type PreviewContext } from '@eb/core';
import { MINUTES_PER_HOUR, MONTHS } from '../calendar.ts';
import { smallRoll } from '../odds.ts';
import { choiceOf, dayChance, type LifeEventRecord, type LifeOutcome, lifeEventOf, lifeEventsOf } from './records.ts';

export interface EventsSlice {
  /** The last day rolled; -1 until the first day is heard. */
  settled: number;
  /** Events drawn and not yet asked, oldest first. */
  waiting: string[];
}

type Ctx = ModuleContext<EventsSlice>;
type View = { readonly content: Ctx['content']; fact(id: string, args?: Readonly<Record<string, unknown>>): unknown };

export const LIFE_EVENT = 'life-event';
/** No more than this many wait at once: a long absence doesn't bring a pile of them back (tune). */
export const MOST_WAITING = 2;
const FROM = 8 * MINUTES_PER_HOUR;
const UNTIL = 22 * MINUTES_PER_HOUR;

const cashOf = (v: View): number => v.fact('economy.amount', { resource: 'cash' }) as number;
const monthOf = (v: View): number => MONTHS.findIndex((m) => m.id === v.fact('time.month')) + 1;

/** The events that can come today, with their day's chance per 100,000. */
function eligible(ctx: Ctx): [string, number][] {
  const month = monthOf(ctx);
  return lifeEventsOf(ctx.content)
    .filter(([, e]) => (!e.months || e.months.includes(month)) && (e.when === undefined || ctx.check(e.when) === true))
    .map(([id, e]) => [id, dayChance(e)]);
}

/** Whether you are free to be asked: awake, in the world, in the day's hours. */
function free(ctx: Ctx): boolean {
  const now = ctx.fact('time.of-day') as number;
  return ctx.modes.current.id === 'world' && ctx.fact('life.activity') === 'awake' && now >= FROM && now < UNTIL;
}

function settle(ctx: Ctx): void {
  const today = ctx.fact('time.day') as number;
  const s = ctx.read();
  // Added to a save from before it, or after a ward's years: nothing rolled for the days gone.
  if (s.settled < 0 || today - s.settled > 31) {
    ctx.write().settled = today;
  } else if (ctx.modes.current.id === 'world' || ctx.modes.current.id === LIFE_EVENT) {
    for (let d = s.settled + 1; d <= today; d++) {
      ctx.write().settled = d;
      const pool = eligible(ctx);
      const total = pool.reduce((n, [, c]) => n + c, 0);
      if (total > 0) ctx.apply(smallRoll(total, [{ effect: 'event-pick' }]));
    }
  } else ctx.write().settled = today;
  const next = ctx.read().waiting[0];
  if (next !== undefined && free(ctx)) {
    ctx.write().waiting.shift();
    ctx.modes.push(LIFE_EVENT, { event: next });
    ctx.emit('asked', { event: next });
  }
}

function outcomeNow(ctx: Ctx, o: LifeOutcome): void {
  if (o.cash !== undefined && o.cash > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: o.cash });
  if (o.cash !== undefined && o.cash < 0) {
    const lost = Math.min(-o.cash, cashOf(ctx));
    if (lost > 0) ctx.apply({ effect: 'pay-cost', cost: { cash: lost } });
  }
  if (o.needs) ctx.apply({ effect: 'adjust-needs', needs: o.needs });
}

/** What an outcome would do, without its words: for the preview. */
const stakes = (o: LifeOutcome | undefined) => (o ? { cash: o.cash ?? 0, needs: o.needs ?? {} } : null);

const asked = (v: { mode: { data: unknown } } | { modes: { current: { data: unknown } } }): string =>
  ('mode' in v ? (v.mode.data as { event: string }) : (v.modes.current.data as { event: string })).event;

export const eventsModule = defineModule<EventsSlice>({
  id: 'event',
  init: () => ({ settled: -1, waiting: [] }),
  events: {
    asked: { args: { event: { type: 'text' } }, label: 'Something happened' },
    happened: {
      args: { event: { type: 'text' }, choice: { type: 'text' }, failed: { type: 'bool' } },
      label: 'What followed',
    },
  },
  facts: {
    cash: { read: (v) => cashOf(v), domain: { type: 'int', min: 0 }, label: 'your cash, in cents' },
    waiting: { read: ({ state }) => state.waiting.length, domain: { type: 'int', min: 0 }, label: 'events waiting' },
  },
  actions: {
    choose: {
      run: (ctx, action) => {
        const event = asked(ctx);
        const e = lifeEventOf(ctx.content, event);
        const c = e.choices.find((x) => x.id === action.choice);
        if (!c) return ctx.refuse('bad-choice');
        if ((c.cost ?? 0) > cashOf(ctx)) return ctx.refuse('cannot-afford');
        if (c.cost) ctx.apply({ effect: 'pay-cost', cost: { cash: c.cost } });
        ctx.modes.pop();
        ctx.apply({ effect: 'life-choice', event, choice: c.id });
        if (c.minutes) ctx.apply({ effect: 'wait', minutes: c.minutes });
      },
      // The choices you can pay for; the first costs nothing (D135), so there is always one.
      options: (v) => {
        const data = v.mode.data as { event?: string } | undefined;
        if (v.mode.id !== LIFE_EVENT || !data?.event) return [];
        const cash = cashOf(v);
        return lifeEventOf(v.content, data.event)
          .choices.filter((c) => (c.cost ?? 0) <= cash)
          .map((c) => ({ choice: c.id }));
      },
    },
  },
  effects: {
    // One of the events that can come today, by its share of the day's chance.
    'event-pick': (ctx) => {
      const pool = eligible(ctx);
      if (pool.length === 0 || ctx.read().waiting.length >= MOST_WAITING) return;
      const at = ctx.rng('life-events').weightedIndex(pool.map(([, c]) => Math.max(1, Math.round(c * 100))));
      ctx.write().waiting.push((pool[at] as [string, number])[0]);
    },
    // A choice made: rolled if it has odds. Its preview is what the page shows.
    'life-choice': {
      run: (ctx, effect) => {
        const event = effect.event as string;
        const c = choiceOf(ctx.content, event, effect.choice);
        const follow = (failed: boolean) => ({ effect: 'life-outcome', event, choice: c.id, failed });
        if (c.odds === undefined) return ctx.apply(follow(false));
        ctx.apply({
          effect: 'roll',
          outcomes: [
            { chance: c.odds, effects: [follow(false)] },
            { chance: 100 - c.odds, effects: [follow(true)] },
          ],
        });
      },
      preview: (ctx: PreviewContext<EventsSlice>, effect) => {
        const c = choiceOf(ctx.content, effect.event as string, effect.choice);
        return {
          chance: c.odds ?? 100,
          cost: c.cost ?? 0,
          minutes: c.minutes ?? 0,
          outcome: stakes(c.outcome),
          failure: stakes(c.failure),
        };
      },
    },
    'life-outcome': (ctx, effect) => {
      const c = choiceOf(ctx.content, effect.event as string, effect.choice);
      const failed = effect.failed === true;
      outcomeNow(ctx, (failed ? c.failure : c.outcome) as LifeOutcome);
      ctx.emit('happened', { event: effect.event as string, choice: c.id, failed });
    },
  },
  on: {
    'time/passed': (ctx) => settle(ctx),
    // The heir starts with nothing waiting (M2.7 step 3).
    'lives/succeeded': (ctx) => {
      ctx.write().waiting = [];
    },
  },
  modes: { [LIFE_EVENT]: { actions: ['event/choose'] } },
});

export type { LifeEventRecord };
