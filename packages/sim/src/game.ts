/**
 * The game as the engine runs it (engine/docs/specs/sim.md): the engine's time module on this
 * game's calendar, the economy kit holding the cash, the engine's logic module for rolls, the
 * clock, the player's needs and activities, the job, the people you know and the home. They
 * reach each other only through facts, effects and events.
 */
import {
  createGame,
  type Game,
  logicModule,
  type Module,
  type RealTime,
  type ScheduleSpec,
  timeModule,
} from '@eb/core';
import { economyKit } from '@eb/kits';
import { DEFAULT_START, type LifeStart, lifeCalendar, minutesToMidnight, minutesToNextMonth } from './calendar.ts';
import { clockModule } from './clock.ts';
import { homeModule, RENT_TIMER } from './home.ts';
import { jobModule } from './job/module.ts';
import { lifeModule } from './life.ts';
import { tiesModule } from './ties/module.ts';

/**
 * Wall-clock time into game time at speed 1: half a second a game minute, so a day lasts 12
 * real minutes (tune; docs/DESIGN.md, Time). The stage scales the milliseconds it passes for the
 * faster speeds and passes none while paused or hidden, so the cap only has to absorb a stalled
 * frame; anything longer was not time the player meant to spend.
 */
export const REAL_TIME: RealTime = { msPerTick: 500, maxElapseMs: 2000 };

export interface LifeOptions {
  readonly start?: LifeStart;
  /** The career record a life starts hired into: the slice's is `line-cook`. Without one, no job. */
  readonly career?: string;
}

/** The timers a life starts with: the first rent, and every midnight's upkeep. */
export function startingTimers(start: LifeStart): ScheduleSpec[] {
  return [
    { timer: RENT_TIMER, after: { minutes: minutesToNextMonth(start) }, effects: [{ effect: 'rent-due' }] },
    // Midnight: the job's postings and payday (job/shifts.ts), then the coworker's asks (ties/favours.ts).
    {
      timer: 'midnight',
      after: { minutes: minutesToMidnight(start) },
      every: { days: 1 },
      effects: [{ effect: 'job-day' }, { effect: 'ties-day' }],
    },
  ];
}

/** The modules of a life, in the order they start: what `eb validate` checks content's facts against. */
export function lifeModules(options: LifeOptions = {}): Module[] {
  const start = options.start ?? DEFAULT_START;
  const hire = options.career === undefined ? undefined : { career: options.career, start };
  return [
    timeModule({ calendar: lifeCalendar(start), realTime: REAL_TIME, timers: startingTimers(start) }),
    economyKit,
    logicModule,
    clockModule,
    lifeModule,
    jobModule(hire),
    tiesModule(hire),
    homeModule,
  ];
}

export function createLifeGame(options: LifeOptions = {}): Game {
  return createGame({ modules: lifeModules(options), start: 'world' });
}
