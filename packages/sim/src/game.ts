/**
 * The game as the engine runs it (engine/docs/specs/sim.md): the engine's time module on this
 * game's calendar, the economy kit holding the cash, the engine's logic module for rolls, the
 * clock, the player's needs and activities, the job, the people you know, the home, and the law,
 * with the inventory kit holding what you carry. They reach each other only through facts,
 * effects and events.
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
import { economyKit, inventoryKit } from '@eb/kits';
import { DEFAULT_START, type LifeStart, lifeCalendar, minutesToMidnight, minutesToNextMonth } from './calendar.ts';
import { clockModule } from './clock.ts';
import { homeModule, RENT_TIMER } from './home.ts';
import { jobModule } from './job/module.ts';
import { lawModule } from './law/module.ts';
import { lifeModule } from './life.ts';
import { marketModule } from './market/module.ts';
import { peopleModule, shareModule } from './people/module.ts';
import { workModule } from './people/work.ts';
import { tiesModule } from './ties/module.ts';
import { youModule } from './you.ts';

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
  /** The tier-1 people (D31, M2.2): 1,000 by default; a test may want fewer. */
  readonly people?: number;
}

/** The tier-1 people a life holds (D31), and the shares they are moved on in, one an hour (D30). */
export const PEOPLE = 1000;
export const PEOPLE_SHARES = 24;

/** The timers a life starts with: the first rent, and every midnight's upkeep. */
export function startingTimers(start: LifeStart): ScheduleSpec[] {
  return [
    { timer: RENT_TIMER, after: { minutes: minutesToNextMonth(start) }, effects: [{ effect: 'rent-due' }] },
    // Midnight: the job's postings and payday (job/shifts.ts), the coworker's asks (ties/favours.ts),
    // then heat, warrants and probation (law/police.ts).
    {
      timer: 'midnight',
      after: { minutes: minutesToMidnight(start) },
      every: { days: 1 },
      effects: [{ effect: 'job-day' }, { effect: 'ties-day' }, { effect: 'law-day' }],
    },
  ];
}

/** The modules of a life, in the order they start: what `eb validate` checks content's facts against. */
export function lifeModules(options: LifeOptions = {}): Module[] {
  const start = options.start ?? DEFAULT_START;
  const hire = options.career === undefined ? undefined : { career: options.career, start };
  return [
    timeModule({ calendar: lifeCalendar(start), realTime: REAL_TIME, timers: startingTimers(start) }),
    inventoryKit,
    economyKit,
    logicModule,
    clockModule,
    lifeModule,
    jobModule(hire),
    tiesModule(hire),
    homeModule,
    lawModule,
    youModule,
    // The labor market (M2.3): added to a save from before it, it starts where the save's job is.
    marketModule(options.career),
    // The people (M2.2): each share hears time pass its hour, so a save from before them needs no timer.
    peopleModule(options.people ?? PEOPLE, true),
    // Who has left or changed jobs (M2.3): heard before the shares settle their hours.
    workModule,
    ...Array.from({ length: PEOPLE_SHARES }, (_, k) => shareModule(options.people ?? PEOPLE, k, PEOPLE_SHARES, true)),
  ];
}

export function createLifeGame(options: LifeOptions = {}): Game {
  return createGame({ modules: lifeModules(options), start: 'world' });
}
