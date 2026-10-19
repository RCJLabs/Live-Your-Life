/**
 * @lyl/sim: the game's rules, as modules on Engine-Builder's kernel. The calendar and the clock
 * (M0.1); needs, activities, the job, rent and the week bots (M0.2); the tier-1 people the
 * population harness runs (M0.4). The plan is ROADMAP.md; the design, docs/DESIGN.md.
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
export {
  type BackPlan,
  type BlockPlan,
  type BuildingPlan,
  between,
  type FacadePlan,
  type LotPlan,
  planBlock,
  type StreetPlan,
} from './city/block.ts';
export { type Route, route } from './city/path.ts';
export {
  type Awning,
  type BlockRecord,
  type BlockTemplates,
  type BuildingRecord,
  blockTemplates,
  type CorniceKind,
  type FacadeRecord,
  type GroundKind,
  type OpenKind,
  type Paint,
  type Range,
  type StreetRecord,
  type Use,
  type WindowKind,
} from './city/records.ts';
export { DOORWAY, type Facing, FOOTPRINT, type PropKind, type PropPlan, streetProps } from './city/street.ts';
export {
  CELL,
  cellAt,
  centreOf,
  doorStep,
  GROUND_COST,
  type Ground,
  groundAt,
  neighbours,
  reach,
  type WalkGrid,
  walkGrid,
} from './city/walk.ts';
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
export { asleep, HOURS, type HourKind, hourOf, placeOf, type Segment, type Where, working } from './people/day.ts';
export {
  CADENCES,
  type Cadence,
  createPeopleGame,
  type PeopleOptions,
  peopleTimers,
  SHARES,
} from './people/game.ts';
export { type HourPlan, planAt } from './people/gather.ts';
export {
  type City,
  newShare,
  type PeopleSlice,
  peopleModule,
  progress,
  shareId,
  shareModule,
} from './people/module.ts';
export { mix, type Person, type Roster, rosterOf } from './people/roster.ts';
export { HOUSEHOLD, SHARED, SHIFTS, type ShiftTemplate, SLEEP, TIES } from './people/templates.ts';
export { meet, TIE_ROW } from './people/ties.ts';
