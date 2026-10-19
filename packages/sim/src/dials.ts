/**
 * The numbers Phase 0 runs on, each with what it means and why it is set there (Dirtbag's
 * sim/dials.ts). All are (tune), and none is calibrated: docs/CALIBRATION.md's ledger isn't filled
 * yet, and lists these as placeholders. The job and the rent move into content with the career
 * template (M1.3) and housing.
 */
import type { Activity, Levels } from './needs.ts';
import { PERCENT } from './needs.ts';

/** Money is whole cents: $300.00 is 30000. */
export const CENTS = 100;

/** What a life starts with, until the background pick (D21) sets it: a little saved, nothing owed. */
export const START_CASH = 300 * CENTS;

/** Just up at seven: rested, wanting breakfast and a wash (tune). */
export const START_LEVELS: Readonly<Levels> = {
  rest: 95 * PERCENT,
  food: 60 * PERCENT,
  hygiene: 70 * PERCENT,
  company: 70 * PERCENT,
  calm: 70 * PERCENT,
  health: 100 * PERCENT,
};

/** How long each activity lasts when it is chosen from a menu, in minutes. Work lasts the rest of the shift. */
export const STANDARD_MINUTES: Readonly<Record<Exclude<Activity, 'work'>, number>> = {
  awake: 30,
  sleep: 8 * 60,
  eat: 30,
  wash: 15,
  relax: 60,
  socialize: 2 * 60,
};

/** What an activity costs when it starts, in cents: a meal at home is groceries. */
export const COSTS: Readonly<Record<Activity, number>> = {
  awake: 0,
  sleep: 0,
  eat: 4 * CENTS,
  wash: 0,
  relax: 0,
  socialize: 0,
  work: 0,
};

/** The longest an activity may be asked to last: a day. */
export const MAX_ACTIVITY_MINUTES = 24 * 60;

/**
 * The one job of Phase 0: a line cook's evening shift, Tuesday to Saturday, 15:00 to 23:00, at
 * $15.00 an hour. A wage that divides by 60 pays whole cents a minute, so pay is exact.
 */
export const JOB = {
  wagePerHour: 15 * CENTS,
  days: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  from: 15 * 60,
  minutes: 8 * 60,
} as const;

/** Paid every Friday at 23:30, after the Friday shift: everything worked since the last payday. */
export const PAYDAY = { weekday: 'friday', at: 23 * 60 + 30 } as const;

/** A room in a shared house, due at midnight on the 1st of each month. */
export const RENT = 550 * CENTS;
