/**
 * Your life's length (M2.7 step 1, D103). Your age is the start's and the days since, never
 * stored; each 30 days the life table's chance of dying within that month at your age and body is
 * rolled, raised while your health is let fall. A death ends the life: the world stops, and the
 * heir (step 3) is the only way on.
 */
import { defineModule, type ModuleContext, type RecordStore } from '@eb/core';
import { smallRoll } from '../odds.ts';
import { mortalityOf, yearChance } from './records.ts';

/** Days between the rolls: a month (tune). */
export const MONTH = 30;

export interface LivesSlice {
  /** The last day a month's chance was rolled through, or -1 until the first day is heard. */
  settled: number;
  /** The day you died, or -1. */
  died: number;
}

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
  if (s.died >= 0) return;
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

export const livesModule = defineModule<LivesSlice>({
  id: 'lives',
  version: 1,
  init: () => ({ settled: -1, died: -1 }),
  events: {
    died: { args: { cause: { type: 'enum', values: ['age'] }, age: { type: 'int', min: 0 } }, label: 'You died' },
  },
  facts: {
    'month-chance': {
      read: (v) => monthChance(v),
      domain: { type: 'int', min: 0 },
      label: 'a month’s chance of dying, per 100,000',
    },
    dead: { read: ({ state }) => state.died >= 0, domain: { type: 'bool' }, label: 'whether you have died' },
  },
  actions: {},
  effects: {
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
  // A death stops the world; nothing is offered until the heir (step 3).
  modes: { dead: { actions: [] } },
});
