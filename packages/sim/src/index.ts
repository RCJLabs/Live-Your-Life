/**
 * @lyl/sim: the game's rules, as modules on Engine-Builder's kernel. The calendar and the clock
 * (M0.1); needs, activities, rent and the week bots (M0.2); the tier-1 people the population
 * harness runs (M0.4); the block and its interiors (M1.1, M1.2); the job (M1.3). The plan is
 * ROADMAP.md; the design, docs/DESIGN.md.
 */

export { bossFor } from './boss-bot.ts';
export {
  REMEDY,
  RESERVE,
  randomFor,
  randomLifePolicy,
  SEEKING,
  STAGE_ONLY,
  seekerFor,
  steadyFor,
  steadyPolicy,
  WEEK,
} from './bot.ts';
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
  weight,
} from './chronicle.ts';
export { courtshipOf } from './circle/records.ts';
// The people you know and your family (M2.6).
export { type CircleSlice, newTie, partnered, type Status, type Tie } from './circle/state.ts';
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
export { dealModule } from './deal/module.ts';
export { chargeFor, type Lot, TRADE, type TradeRecord, tradeOf } from './deal/records.ts';
export { type DealSlice, heatOf, type Sighting } from './deal/state.ts';
export { buyerOdds, MOST_HELD, seenOdds } from './deal/trade.ts';
export { outNow, passingNow } from './deal/witnesses.ts';
export { dealerFor } from './dealer.ts';
export * from './dials.ts';
export { type EditionSlice, editionModule, FREE_DAYS, YEAR_END } from './edition/module.ts';
export { type Bill, BORROWING, type Borrow } from './education/aid.ts';
export {
  type Catalog,
  type CollegeSlice,
  meetings,
  slotsOf,
  type Term as CollegeTerm,
  type Which,
} from './education/college.ts';
export type { Loan } from './education/loans.ts';
// Your schooling (M2.8).
export { type EducationSlice, educationModule, SCHOOLING, type Schooling } from './education/module.ts';
export {
  type College,
  type EducationRecord,
  educationOf,
  type LawSchool,
  type University,
} from './education/records.ts';
export { type EventsSlice, eventsModule, LIFE_EVENT, MOST_WAITING } from './events/module.ts';
export {
  choiceOf,
  dayChance,
  type LifeChoice,
  type LifeEventRecord,
  type LifeOutcome,
  lifeEventOf,
  lifeEventsOf,
} from './events/records.ts';
export { endCost } from './family/module.ts';
export { pregnancyOf } from './family/records.ts';
export { type Child, type FamilySlice, type Pregnancy, YOU } from './family/state.ts';
export {
  createLifeGame,
  type LifeOptions,
  lifeModules,
  PEOPLE,
  PEOPLE_SHARES,
  REAL_TIME,
  startingTimers,
} from './game.ts';
// Illness, injury and care (M2.7 step 2).
export { type HealthSlice, healthModule } from './health/module.ts';
export { type Coverage, hospitalCost, type IllnessRecord, illnessOf, kindOf, visitCost } from './health/records.ts';
export { type HomeSlice, homeModule, RENT_TIMER } from './home.ts';
export { drawFrom, LEAST, MOST, oddsOf } from './job/events.ts';
export { type Hire, jobModule } from './job/module.ts';
export { PERIODS } from './job/pay.ts';
export { POST_OPEN_DAYS, postOpen } from './job/posts.ts';
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
  SHOPLIFTING,
} from './law/records.ts';
export { oddsAt, shopOn, stockOf } from './law/shop.ts';
export type { Case, Hold, LawSlice, Visit } from './law/state.ts';
export { ACTIVITY_TIMER, type LifeSlice, levelsNow, lifeModule } from './life.ts';
// Your life's length and the heir (M2.7).
export { type MortalityRecord, mortalityOf, yearChance } from './lives/records.ts';
export { type Employer, employersOf, hashOf, homeEmployer, SITES } from './market/employers.ts';
export {
  type Application,
  HOME_DISTRICT,
  type Listing,
  type MarketSlice,
  marketModule,
  type Offer,
} from './market/module.ts';
export { barred, hireOdds, OFFER_DAYS, PENDING, REPUTATION } from './market/odds.ts';
export { FILL, type Opening, openingOf, openingsOn } from './market/openings.ts';
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
export { careerRoster, rosterWith } from './people/careers.ts';
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
export { LINKED, mix, type Person, type Roster, rosterOf } from './people/roster.ts';
export { HOUSEHOLD, SHARED, SHIFTS, type ShiftTemplate, SLEEP, TIES } from './people/templates.ts';
export { meet, TIE_ROW } from './people/ties.ts';
export { ADULT } from './people/who.ts';
export { type WorkSlice, workModule } from './people/work.ts';
export { type PrisonSlice, paroleOdds, prisonModule, type Term } from './prison/module.ts';
export { PRISON, type PrisonRecord, prisonOf } from './prison/records.ts';
export {
  CLIMATE,
  type ClimateRecord,
  climateIn,
  climateOf,
  clocksOn,
  gasBill,
  holidayOn,
  nthWeekday,
  snowOn,
} from './season/climate.ts';
export { CLOCKS_TIMER, holidayToday, type SeasonSlice, seasonModule, snowy } from './season/module.ts';
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
export {
  type BusTrip,
  busTrip,
  type Grid as TransitGrid,
  type Transit,
  transitOf,
  WALK_PACE,
  walkMinutesBetween,
} from './travel/bus.ts';
export { type Ride, rideTrip } from './travel/rideshare.ts';
export { ALARM_MARGIN, LONGEST_WALK, NAMES, type YouSlice, youModule } from './you.ts';
