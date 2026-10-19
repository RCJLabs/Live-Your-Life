/**
 * The numbers Phase 0 runs on, each with what it means and why it is set there (Dirtbag's
 * sim/dials.ts). All are (tune), and none is calibrated: docs/CALIBRATION.md lists these as
 * placeholders. The job moved into content with the career template (M1.3); the rent moves with
 * housing.
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

/**
 * The alarm (D57): what you do ends this long before your next shift, the walk to work. The
 * longest flat-to-diner walk on the slice's blocks is about 30 game minutes at D49's pace (tune).
 * The sim doesn't know where your flat is yet (ROADMAP open question 43); when it does, the walk
 * is your own.
 */
export const ALARM_MINUTES = 30;

/** The longest an activity may be asked to last: a day. */
export const MAX_ACTIVITY_MINUTES = 24 * 60;

/** A room in a shared house, due at midnight on the 1st of each month. */
export const RENT = 550 * CENTS;
