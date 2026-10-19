/**
 * The game as the engine runs it (engine/docs/specs/sim.md): the engine's time module on this
 * game's calendar, the economy kit holding the cash, the clock, the player's needs and activities,
 * the job and the home. They reach each other only through facts and effects.
 */
import { createGame, type Game, type RealTime, type ScheduleSpec, timeModule } from '@eb/core';
import { economyKit } from '@eb/kits';
import { DEFAULT_START, type LifeStart, lifeCalendar, minutesToNextMonth, minutesToWeekday } from './calendar.ts';
import { clockModule } from './clock.ts';
import { PAYDAY } from './dials.ts';
import { homeModule, RENT_TIMER } from './home.ts';
import { jobModule } from './job.ts';
import { lifeModule } from './life.ts';

/**
 * Wall-clock time into game time at speed 1: half a second a game minute, so a day lasts 12
 * real minutes (tune; docs/DESIGN.md, Time). The stage scales the milliseconds it passes for the
 * faster speeds and passes none while paused or hidden, so the cap only has to absorb a stalled
 * frame; anything longer was not time the player meant to spend.
 */
export const REAL_TIME: RealTime = { msPerTick: 500, maxElapseMs: 2000 };

export interface LifeOptions {
  readonly start?: LifeStart;
}

/** The timers a life starts with: the first payday, then weekly, and the first rent. */
export function startingTimers(start: LifeStart): ScheduleSpec[] {
  return [
    {
      timer: 'payday',
      after: { minutes: minutesToWeekday(start, PAYDAY.weekday, PAYDAY.at) },
      every: { weeks: 1 },
      effects: [{ effect: 'payday' }],
    },
    { timer: RENT_TIMER, after: { minutes: minutesToNextMonth(start) }, effects: [{ effect: 'rent-due' }] },
  ];
}

export function createLifeGame(options: LifeOptions = {}): Game {
  const start = options.start ?? DEFAULT_START;
  return createGame({
    modules: [
      timeModule({ calendar: lifeCalendar(start), realTime: REAL_TIME, timers: startingTimers(start) }),
      economyKit,
      clockModule,
      lifeModule,
      jobModule,
      homeModule,
    ],
    start: 'world',
  });
}
