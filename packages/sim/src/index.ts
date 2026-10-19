/**
 * @lyl/sim: the game's rules, as modules on Engine-Builder's kernel. So far the calendar and the
 * clock (M0.1). The plan is ROADMAP.md; the design, docs/DESIGN.md.
 */
export {
  BASE_YEAR,
  DEFAULT_START,
  type LifeStart,
  lifeCalendar,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  MONTHS,
  PHASES,
  SEASONS,
  WEEKDAYS,
} from './calendar.ts';
export { clockModule, minutesUntil } from './clock.ts';
export { createLifeGame, type LifeOptions, REAL_TIME } from './game.ts';
