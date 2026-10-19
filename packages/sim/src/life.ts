/**
 * The life module: the player's needs and what they are doing (docs/DESIGN.md, Needs and mood).
 * One verb so far, `life/do`: do an activity for some minutes. It ends what was going on, pays
 * what the new activity costs, sets a timer for its end, and lets the time pass: the routine
 * block, at speed 3. The real-time verb, which starts an activity and lets the stage's clock run
 * to its end, comes with M1.6; the end timer and `stop` already serve it.
 *
 * The slice holds levels settled at one tick and what is being done since; every reading works
 * the levels out to the present (needs.ts). Other modules are reached through facts and effects
 * only: the job says when there is a shift and takes the minutes worked, and the economy kit
 * holds the cash.
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { COSTS, MAX_ACTIVITY_MINUTES, STANDARD_MINUTES, START_LEVELS } from './dials.ts';
import {
  ACTIVITIES,
  type Activity,
  isActivity,
  type Levels,
  lowest,
  NEEDS,
  type Need,
  percentOf,
  settle,
} from './needs.ts';

export interface LifeSlice {
  activity: Activity;
  /** The tick the activity started. */
  since: number;
  /** The tick `levels` were settled at. */
  asOf: number;
  levels: Levels;
}

/** The named timer that ends the current activity. */
export const ACTIVITY_TIMER = 'activity';

const whole = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;

const tickOf = (reader: { fact(id: string): unknown }): number => reader.fact('time.tick') as number;

/** The levels as they are now, worked out from the last settle. */
export function levelsNow(
  slice: { readonly activity: Activity; readonly asOf: number; readonly levels: Readonly<Levels> },
  tick: number,
): Levels {
  return settle(slice.levels, slice.activity, tick - slice.asOf);
}

/** Ends what is being done, at this tick: the levels settle, and the minutes of a shift go to the job. */
function stop(ctx: ModuleContext<LifeSlice>): void {
  const now = tickOf(ctx);
  const slice = ctx.write();
  slice.levels = levelsNow(slice, now);
  slice.asOf = now;
  if (slice.activity === 'awake') return;
  const { activity, since } = slice;
  if (activity === 'work' && now > since) ctx.apply({ effect: 'paid-work', minutes: now - since });
  ctx.apply({ effect: 'cancel-timer', timer: ACTIVITY_TIMER });
  slice.activity = 'awake';
  slice.since = now;
  ctx.emit('ended', { activity, minutes: now - since });
}

function begin(ctx: ModuleContext<LifeSlice>, activity: Activity, minutes: number): void {
  const now = tickOf(ctx);
  const slice = ctx.write();
  slice.activity = activity;
  slice.since = now;
  ctx.apply({
    effect: 'schedule',
    timer: ACTIVITY_TIMER,
    after: { minutes },
    effects: [{ effect: 'end-activity' }],
  });
  ctx.emit('started', { activity, minutes });
}

// No return type: `return ctx.refuse(…)` tells TypeScript the handler stops there (engine sim.md).
function doActivity(ctx: ModuleContext<LifeSlice>, activity: unknown, minutes: unknown) {
  if (!isActivity(activity)) return ctx.refuse('bad-activity');
  if (!whole(minutes, 1, MAX_ACTIVITY_MINUTES)) return ctx.refuse('bad-minutes');
  if (activity === 'work') {
    if (ctx.fact('job.on-shift') !== true) return ctx.refuse('not-on-shift');
    if (minutes > (ctx.fact('job.shift-left') as number)) return ctx.refuse('past-the-shift');
  }
  if (COSTS[activity] > 0) ctx.apply({ effect: 'pay-cost', cost: { cash: COSTS[activity] } });
  stop(ctx);
  begin(ctx, activity, minutes);
  ctx.apply({ effect: 'wait', minutes });
}

const NEED_ARG = { need: { type: 'enum', values: NEEDS } } as const;

export const lifeModule = defineModule<LifeSlice>({
  id: 'life',
  init: () => ({ activity: 'awake', since: 0, asOf: 0, levels: { ...START_LEVELS } }),
  actions: {
    do: {
      run: (ctx, action) => doActivity(ctx, action.activity, action.minutes),
      // What a menu offers now: each activity for its usual time, the meal only if it can be
      // paid for, and work only during a shift, for the rest of it.
      options: (view) => {
        const cash = view.fact('economy.amount', { resource: 'cash' }) as number;
        const offered: { activity: Activity; minutes: unknown }[] = [];
        for (const activity of ACTIVITIES) {
          if (activity === 'work') {
            if (view.fact('job.on-shift') === true) offered.push({ activity, minutes: view.fact('job.shift-left') });
          } else if (COSTS[activity] <= cash) {
            offered.push({ activity, minutes: STANDARD_MINUTES[activity] });
          }
        }
        return offered;
      },
    },
  },
  effects: {
    'end-activity': (ctx) => stop(ctx),
  },
  facts: {
    need: {
      args: NEED_ARG,
      domain: { type: 'int', min: 0, max: 100 },
      label: 'need',
      read: (view, { need }) => percentOf(levelsNow(view.state, tickOf(view))[need as Need]),
    },
    lowest: {
      domain: { type: 'enum', values: NEEDS },
      label: 'the most pressing need',
      read: (view) => lowest(levelsNow(view.state, tickOf(view))),
    },
    activity: {
      domain: { type: 'enum', values: ACTIVITIES },
      label: 'what you are doing',
      read: ({ state }) => state.activity,
    },
  },
  modes: {
    // Out in the city, with time running. The stage's elapse and the menus' verbs are allowed here.
    world: { actions: ['time/*', 'clock/*', 'life/*', 'home/*'] },
  },
});
