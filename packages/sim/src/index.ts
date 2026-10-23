/**
 * @lyl/sim: the game's rules, as modules on Engine-Builder's kernel. The calendar and the clock
 * (M0.1); needs, activities, rent and the week bots (M0.2); the tier-1 people the population
 * harness runs (M0.4); the block and its interiors (M1.1, M1.2); the job (M1.3). The plan is
 * ROADMAP.md; the design, docs/DESIGN.md.
 */
export { REMEDY, RESERVE, randomFor, randomLifePolicy, STAGE_ONLY, steadyFor, steadyPolicy, WEEK } from './bot.ts';
export {
  BASE_YEAR,
  DEFAULT_START,
  daysToNextMonth,
  type LifeStart,
  lifeCalendar,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  MONTHS,
  minutesToMidnight,
  minutesToNextMonth,
  PHASES,
  SEASONS,
  WEEKDAYS,
  weekdayOf,
} from './calendar.ts';
export {
  dateOf,
  hours,
  type LineRecord,
  lineFor,
  lineRecord,
  money,
  type Names,
  QUIET,
} from './chronicle.ts';
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
export {
  CITY,
  type CityPlan,
  type CityRecord,
  type DistrictRecord,
  districtOf,
  lotFront,
  planCity,
} from './city/city.ts';
export { type CityTemplates, cityTemplates, lotDepthOf, planFace, type Side as FaceSide, toCity } from './city/face.ts';
export { faceProblems } from './city/faceCheck.ts';
export { type FixturePlan, furnish, type UsePlan } from './city/furnish.ts';
export { aroundHome, cityToHome, faceRect, type Home, homeOf, homeToCity, type NearFace } from './city/home.ts';
export { type InteriorPlan, planInterior, type UnitPlan } from './city/interior.ts';
export { interiorProblems } from './city/interiorCheck.ts';
export type {
  DoorRecord,
  DrawKind,
  Edge,
  FixtureRecord,
  FixtureRule,
  FloorKind,
  InteriorRecord,
  InteriorTemplates,
  PlaceActivity,
  RoomPlacement,
  RoomRecord,
  Side,
  UnitRecord,
  UsePose,
  UseRecord,
} from './city/interiorRecords.ts';
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
export {
  DOOR,
  type DoorPlan,
  FRONT_DOOR,
  type Frame,
  frameOf,
  OUTSIDE,
  type Rect,
  type RoomPlan,
  roomAt,
  WALL,
  type WallPlan,
} from './city/rooms.ts';
export { clear, inField, REACH, type ShopSight, type Spot, shopSight, type Watcher } from './city/sight.ts';
export { DOORWAY, type Facing, FOOTPRINT, type PropKind, type PropPlan, streetProps } from './city/street.ts';
export { type Streets, streetsOf } from './city/streets.ts';
export {
  type Around,
  CELL,
  cellAt,
  centreOf,
  doorStep,
  GROUND_COST,
  type Ground,
  groundAt,
  neighbours,
  reach,
  useCell,
  type WalkGrid,
  walkGrid,
  walkGridAround,
} from './city/walk.ts';
export { inFront, type StreetPoint, type Walk, walkBetween } from './city/walks.ts';
export { clockModule, minutesUntil } from './clock.ts';
export { LIFE_CONTENT, lifeSim } from './content.ts';
export * from './dials.ts';
export { createLifeGame, type LifeOptions, lifeModules, REAL_TIME, startingTimers } from './game.ts';
export { type HomeSlice, homeModule, RENT_TIMER } from './home.ts';
export { drawFrom, LEAST, MOST, oddsOf } from './job/events.ts';
export { type Hire, jobModule } from './job/module.ts';
export { PERIODS } from './job/pay.ts';
export {
  type CareerRecord,
  type Choice,
  careerOf,
  eventsFor,
  type Odds,
  type Outcome,
  type ShiftEventRecord,
  type ShiftKind,
  shiftEventOf,
  type TaxRecord,
  taxOf,
} from './job/records.ts';
export { type JobSlice, type SignUp, skillOf } from './job/state.ts';
export { type Paycheck, paycheck, payFor, withhold } from './job/withholding.ts';
export { type LawState, lawModule } from './law/module.ts';
export {
  type CrimeRecord,
  crimeOf,
  type FenceRecord,
  fenceOf,
  type Good,
  goodOf,
  goodsOn,
  type OffenceRecord,
  offenceFor,
  offenceOf,
} from './law/records.ts';
export { oddsAt, shopOn, stockOf } from './law/shop.ts';
export type { Case, Hold, LawSlice, Visit } from './law/state.ts';
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
export { type Placed, placeRoster } from './people/placed.ts';
export { mix, type Person, type Roster, rosterOf } from './people/roster.ts';
export { HOUSEHOLD, SHARED, SHIFTS, type ShiftTemplate, SLEEP, TIES } from './people/templates.ts';
export { meet, TIE_ROW } from './people/ties.ts';
export { thiefFor } from './thief.ts';
export { familiarityOf, KEPT, type Memory, NEUTRAL, remember } from './ties/memory.ts';
export { type Hired, tiesModule } from './ties/module.ts';
export { type Coworker, daysOff, drawCoworker, fill, theirShift, works } from './ties/person.ts';
export {
  type ActRecord,
  actOf,
  type Crew,
  type CrewActs,
  crewOf,
  type FavourRecord,
  favourOf,
  type NamePool,
  namePoolOf,
  type Pronouns,
} from './ties/records.ts';
export type { TiesSlice } from './ties/state.ts';
export { ALARM_MARGIN, LONGEST_WALK, NAMES, type YouSlice, youModule } from './you.ts';
