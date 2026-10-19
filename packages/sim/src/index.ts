/**
 * @lyl/sim: the game's rules, as modules on Engine-Builder's kernel. The calendar and the clock
 * (M0.1); needs, activities, the job, rent and the week bots (M0.2). The plan is ROADMAP.md; the
 * design, docs/DESIGN.md.
 */
export { REMEDY, randomLifePolicy, STAGE_ONLY, steadyPolicy, WEEK } from './bot.ts';
export {
  BASE_YEAR,
  DEFAULT_START,
  daysToNextMonth,
  type LifeStart,
  lifeCalendar,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  MONTHS,
  minutesToNextMonth,
  minutesToWeekday,
  PHASES,
  SEASONS,
  WEEKDAYS,
} from './calendar.ts';
export { clockModule, minutesUntil } from './clock.ts';
export { LIFE_CONTENT, lifeSim } from './content.ts';
export * from './dials.ts';
export { createLifeGame, type LifeOptions, REAL_TIME, startingTimers } from './game.ts';
export { type HomeSlice, homeModule, RENT_TIMER } from './home.ts';
export { type JobSlice, jobModule, payFor } from './job.ts';
export { ACTIVITY_TIMER, type LifeSlice, levelsNow, lifeModule } from './life.ts';
export {
  ACTIVITIES,
  type Activity,
  FULL,
  HEALTH_PENALTY,
  HEALTH_RECOVERY,
  isActivity,
  type Levels,
  lowest,
  NEEDS,
  type Need,
  PERCENT,
  percentOf,
  RATES,
  settle,
  unitsPerMinute,
  VITAL,
} from './needs.ts';
