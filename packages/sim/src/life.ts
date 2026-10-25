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
  FULL,
  isActivity,
  type Levels,
  lowest,
  NEEDS,
  type Need,
  PERCENT,
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
  // The job hears the first start on a shift, to know whether you were late (D39).
  if (activity === 'work') ctx.apply({ effect: 'clock-in' });
}

/** A need's level moved by whole percent, kept from empty to full: what a shift event does to you (D40). */
function adjustNeeds(ctx: ModuleContext<LifeSlice>, needs: unknown): void {
  if (typeof needs !== 'object' || needs === null) throw new Error('adjust-needs: "needs" maps needs to percent');
  const now = tickOf(ctx);
  const slice = ctx.write();
  const levels = levelsNow(slice, now);
  for (const [need, by] of Object.entries(needs)) {
    if (!(NEEDS as readonly string[]).includes(need) || !whole(by, -100, 100)) {
      throw new Error(`adjust-needs: ${need} by ${String(by)}`);
    }
    levels[need as Need] = Math.min(FULL, Math.max(0, levels[need as Need] + by * PERCENT));
  }
  slice.levels = levels;
  slice.asOf = now;
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

/**
 * Minutes until the alarm (D57): your walk to work before the next shift (D61). Inside that walk
 * there's no time to set aside, so what you do runs to the shift's start and being late is yours
 * to choose.
 */
function alarm(view: { fact(id: string): unknown }): number | undefined {
  const soon = view.fact('job.next-shift-in') as number | undefined;
  if (soon === undefined) return undefined;
  const set = view.fact('you.alarm') as number;
  return soon > set ? soon - set : soon;
}

export const lifeModule = defineModule<LifeSlice>({
  id: 'life',
  init: () => ({ activity: 'awake', since: 0, asOf: 0, levels: { ...START_LEVELS } }),
  events: {
    // Heard by the people you know (M2.6): going out ends when you do something else.
    started: {
      args: { activity: { type: 'enum', values: ACTIVITIES }, minutes: { type: 'int', min: 0 } },
      label: 'Started doing something',
    },
    // Heard by the people you know (M2.6): an evening out is met in when it ends.
    ended: {
      args: { activity: { type: 'enum', values: ACTIVITIES }, minutes: { type: 'int', min: 0 } },
      label: 'Finished doing something',
    },
  },
  actions: {
    do: {
      run: (ctx, action) => doActivity(ctx, action.activity, action.minutes),
      // What a menu offers now: each activity for its usual time, or until it's time to walk to
      // the next shift if that comes first (D57's alarm), or until the shift under way ends (D58),
      // or until the court opens on a court day (D62), or a date begins (M2.6);
      // the meal only if it can be paid for; and work only during a shift, for the rest of it or
      // until something on it needs you.
      options: (view) => {
        const cash = view.fact('economy.amount', { resource: 'cash' }) as number;
        const onShift = view.fact('job.on-shift') === true;
        const shift = onShift ? (view.fact('job.shift-left') as number) : alarm(view);
        // D62: on a court day, what you do ends when the court opens, as it does for a shift.
        const court = view.fact('law.court-in') as number | undefined;
        const courtUntil = court !== undefined && court > 0 ? Math.min(shift ?? court, court) : shift;
        // M2.6: and when a date planned for today begins.
        const date = view.fact('circle.date-in') as number | undefined;
        const until = date !== undefined ? Math.min(courtUntil ?? date, date) : courtUntil;
        const offered: { activity: Activity; minutes: unknown }[] = [];
        for (const activity of ACTIVITIES) {
          if (activity === 'work') {
            if (onShift) offered.push({ activity, minutes: view.fact('job.shift-left') });
          } else if (COSTS[activity] <= cash) {
            const usual = STANDARD_MINUTES[activity];
            offered.push({ activity, minutes: until === undefined ? usual : Math.max(1, Math.min(usual, until)) });
          }
        }
        return offered;
      },
    },
  },
  effects: {
    'end-activity': (ctx) => stop(ctx),
    'adjust-needs': (ctx, effect) => adjustNeeds(ctx, effect.needs),
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
    // Out in the city, with time running. The stage's elapse and the menus' verbs are allowed
    // here; a shift event's choice is allowed only in its own mode (the job's).
    world: {
      actions: [
        'time/*',
        'clock/*',
        'life/*',
        'home/*',
        'job/sign-up',
        'job/drop',
        'job/quit',
        'market/*',
        'deal/*',
        'circle/*',
        'family/*',
        'ties/*',
        'you/*',
        'law/take',
        'law/attend',
        'law/check-in',
        'law/pay',
        'law/sell',
        'law/eat',
      ],
    },
  },
});
