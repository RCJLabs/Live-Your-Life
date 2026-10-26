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
import { circleModule } from './circle/module.ts';
import { clockModule } from './clock.ts';
import { dealModule } from './deal/module.ts';
import { editionModule } from './edition/module.ts';
import { educationModule } from './education/module.ts';
import { eventsModule } from './events/module.ts';
import { familyModule } from './family/module.ts';
import { healthModule } from './health/module.ts';
import { homeModule, RENT_TIMER } from './home.ts';
import { jobModule } from './job/module.ts';
import { lawModule } from './law/module.ts';
import { lifeModule } from './life.ts';
import { livesModule } from './lives/module.ts';
import { marketModule } from './market/module.ts';
import { peopleModule, shareModule } from './people/module.ts';
import { workModule } from './people/work.ts';
import { prisonModule } from './prison/module.ts';
import { CLOCKS_TIMER, seasonModule } from './season/module.ts';
import { tiesModule } from './ties/module.ts';
import { midnightTimer } from './timers.ts';
import { travelModule } from './travel/module.ts';
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
  /** Whether life events are drawn (M2.10 step 4): yes by default; a scripted test may not want them. */
  readonly events?: boolean;
  /** Whether the life starts unlocked (M2.11, D138): no by default, as the page starts every life. */
  readonly unlocked?: boolean;
}

/** The tier-1 people a life holds (D31), and the shares they are moved on in, one an hour (D30). */
export const PEOPLE = 1000;
export const PEOPLE_SHARES = 24;

/** The timers a life starts with: the first rent, every midnight's upkeep, and the season's clocks. */
export function startingTimers(start: LifeStart): ScheduleSpec[] {
  return [
    { timer: RENT_TIMER, after: { minutes: minutesToNextMonth(start) }, effects: [{ effect: 'rent-due' }] },
    midnightTimer(minutesToMidnight(start)),
    // A minute in, the season sets the night the clocks next change: the timer needs the climate record.
    { timer: CLOCKS_TIMER, after: { minutes: 1 }, effects: [{ effect: 'clocks-change' }] },
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
    // The street trade (M2.4): added to a save from before it, it starts with nothing held.
    dealModule,
    // Prison (M2.4, D81): it hears a prison sentence, and holds the life a day at a time.
    prisonModule,
    // The people you know (M2.6, D89): added to a save from before it, you know no one yet.
    circleModule,
    // A pregnancy and your children (M2.6 step 4): added to a save from before it, there are none.
    familyModule,
    // Your life's length (M2.7, D103): added to a save from before it, its months start that day.
    livesModule,
    // Illness, injury and care (M2.7 step 2, D104): added to a save from before it, you are well.
    healthModule,
    // Your schooling (M2.8, D112): added to a save from before it, you have a diploma.
    educationModule,
    // The bus and a hailed ride (M2.9, D118): added to a save from before it, no fares paid today.
    travelModule,
    // The season (M2.10 step 3): added to a save from before it, its first day is heard, not told.
    seasonModule,
    // Life events (M2.10 step 4, D134): added to a save from before it, nothing is rolled for the days gone.
    eventsModule(options.events ?? true),
    // The free year and the unlock (M2.11, D137): added to a save from before it, the save is free.
    editionModule(options.unlocked ?? false),
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
