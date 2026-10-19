/**
 * The population on its own, as the harness runs it (M0.4): the engine's time module on the
 * game's calendar, and the people. Nothing else, so a reading is the people's cost and the
 * kernel's, not the player's.
 */
import { createGame, defineModule, type Game, type ScheduleSpec, timeModule } from '@eb/core';
import { DEFAULT_START, type LifeStart, lifeCalendar, MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../calendar.ts';
import { peopleModule, shareId, shareModule } from './module.ts';

/**
 * How the people are moved on. `hour`: everyone, every game hour. `day`: everyone, every
 * midnight, a whole day at once. `staggered`: everyone once a day, in 24 shares, one share each
 * hour, so an action copies a twenty-fourth of them.
 */
export const CADENCES = ['hour', 'day', 'staggered'] as const;
export type Cadence = (typeof CADENCES)[number];

/** How many shares each cadence keeps the people in. */
export const SHARES: Readonly<Record<Cadence, number>> = { hour: 1, day: 1, staggered: 24 };

export interface PeopleOptions {
  readonly n: number;
  readonly cadence: Cadence;
  readonly start?: LifeStart;
}

/** The timers that move the shares on: each due at its next hour, or its hour of the day, and then every one. */
export function peopleTimers(start: LifeStart, cadence: Cadence): ScheduleSpec[] {
  const minute = start.hour * MINUTES_PER_HOUR + start.minute;
  const of = SHARES[cadence];
  return Array.from({ length: of }, (_, k): ScheduleSpec => {
    const id = shareId(k, of);
    // The hourly share is due at the next whole hour; a daily one at its own hour of the day.
    const size = cadence === 'hour' ? MINUTES_PER_HOUR : MINUTES_PER_DAY;
    const at = cadence === 'staggered' ? k * MINUTES_PER_HOUR : 0;
    const after = (((at - minute) % size) + size) % size || size;
    return {
      timer: id,
      after: { minutes: after },
      every: cadence === 'hour' ? { hours: 1 } : { days: 1 },
      effects: [{ effect: `${id}-progress` }],
    };
  });
}

// The harness's one mode: only time moves.
const harnessModule = defineModule<Record<string, never>>({
  id: 'harness',
  init: () => ({}),
  modes: { run: { actions: ['time/*'] } },
});

export function createPeopleGame(options: PeopleOptions): Game {
  const start = options.start ?? DEFAULT_START;
  const of = SHARES[options.cadence];
  return createGame({
    modules: [
      timeModule({ calendar: lifeCalendar(start), timers: peopleTimers(start, options.cadence) }),
      peopleModule(options.n),
      ...Array.from({ length: of }, (_, k) => shareModule(options.n, k, of)),
      harnessModule,
    ],
    start: 'run',
  });
}
