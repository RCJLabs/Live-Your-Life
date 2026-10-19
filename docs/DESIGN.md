# Design — Live Your Life (working title)

What the game is and how its systems work, as proposed. The decisions it rests on are in [decisions.md](decisions.md) by number. A number marked (tune) is a proposal; a number becomes a fact only as a reading in ROADMAP.md. Every system below is **proposed** until a milestone builds it and its gates pass.

## The pitch

An isometric life sim in a fictional Rust Belt city where you can do nearly anything a person can do, and the world answers the way the real one would. Start at eighteen with what your family gave you. Work, study, cook, steal, police, heal; rent, buy, marry, raise; age, die, and hand the city to your heir.

## Pillars

1. **Named people, never units.** Everyone you meet has a name, a home, a job, a history and a memory of you. If a system would read the same with numbered slots instead of people, it is the wrong system.
2. **The world answers like the real one.** Wages, rents, sentences, recovery times and odds trace to real figures ([CALIBRATION.md](CALIBRATION.md)). Consequences arrive at real speed: some tonight, some in years.
3. **Anything a person can do, and what it costs.** Every verb a person has is in: lawful and unlawful, kind and cruel. The brake is never a locked door; it is the response of the world. Cruelty is permitted and never optimal. This replaces the earlier RCJ Labs line "you don't kill anything", on purpose (D8).
4. **Aging is load-bearing; the family is the save.** Bodies wear, people die, children grow, the heir carries on in the same city. A life ends; the save does not.
5. **The sim decides; the stage renders.** Content is data, saves never break, nothing is placed by hand, numbers are readings. The habits every earlier RCJ Labs game proved.

## Non-goals

- Photoreal or 3D rendering. The look is stylized by construction (D6, D25).
- Multiplayer, a hosted backend, analytics, any runtime network.
- Time passing while the app is closed (D3).
- Real people, brands, companies or places.
- A playable prison (D19).
- Other cities as places, in release one (D5).
- Satire. The world is played straight (D12).

## The out list

Content that is never in, whatever the verb list says: sexual violence; minors in any sexual or violent content; real people, brands, companies or places; anything for real money. A content lint with a blocklist enforces the names; the rest is a rule for anyone writing content.

## The player and the life

- **Start** at 18 with a background pick (D21): family means, district, schooling outcome. What that gives you: a room or not, some money or some debt, a diploma or not, people who already know you.
- **Death** is real (D4): age, illness, accident, violence, as events the player sees coming where a real person would.
- **The heir** (D20): a child of 18 or over, then a spouse, then a close tie. A child under 18 becomes a ward of a named guardian and the save skips to their 18th birthday with a summary. If nobody qualifies, the chronicle closes and a new life can start in the same city, which keeps its state.
- **What carries:** money and property less debts and probate; the home if owned; the family's reputation by name; relationships by proximity; nothing of skills.

## The world

- One fictional Rust Belt or Midwest mid-size city, 250k–400k people (tune) (D15). Districts (tune): downtown, old industrial, the inner ring, suburbs, a commercial strip.
- Generated from the seed and the city's year: districts, arterials, a street grid, lots, buildings from templates, businesses assigned by district economics, households by income band. Changes are stored as diffs against the generated city, so a save stays small (Landnám's rule: if a fact can be computed, it does not go in the save).
- Authored by hand, and listed here when it happens: the hospital, the courthouse and precinct, city hall, the school. Everything else is generated.
- The map is the same renderer zoomed out, with district labels and tap-to-travel that costs the real route time.
- Release one: two districts live, the rest as statistics (cut ladder).

**Built in M1.1, one block** (`packages/content`, `packages/sim/src/city/`, `?block=generated`; D32, D33):

- **The content** is an Engine-Builder project in `packages/content`. Record types for the street, facades, buildings and blocks sit in `types/`, and their records in `records/`, all JSON. The engine's compiler checks them in CI and builds the pack the sim and the page read.
- **The block** is one side of one street (D32), 6 to 8 lots (tune). The apartment house, the diner and a corner shop stand on every block, the shop at an end of the row. Storefronts, row houses and the odd vacant lot fill the rest, by weight. Across the street is a verge or a car park, the open side nearest the camera.
- **Facades** follow the grammar in their records. The ground floor is diner glass, a shopfront or a stoop. Above it are bays of single or paired windows, with sills or without, and a band, a bracketed band or a parapet on top. Wear runs from kept up to boarded. Signs and awnings go where the record allows. The seed picks within each record.
- **Street furniture stands by rule**: lamps along both curbs, a hydrant, a bench, trees on a verge, and a pole sign for a building that has one. None stands in a doorway.
- **The walk grid** is the block's ground in half-metre cells (tune). Stepping onto each costs 1 on a sidewalk, 1.1 on a lot, 1.2 on a verge and 1.4 on the roadway (tune), and there is no step under a building or a post. Routes are weighted A* with eight neighbours, ported from 2060TD.

## Time

- 1 tick = 1 game minute (tune). Speed 1 = 2 game minutes a real second, so a day is 12 minutes (tune). Speed 2 = 4×. Speed 3 = run to the next event or the end of the routine block.
- The clock runs while the player is in the world and pauses on any menu, dialogue, a hidden tab and the home screen. Nothing passes while the app is closed (D3).
- Routines: sleep, shifts, school and commutes are blocks that run at speed 3 by default and stop on an interruption. Yesterday can be replayed as a plan (Dirtbag).
- Fast-forward yields to the page between game hours (Gridiron Eras' 17.8 s lesson).
- **The calendar** (D26, proposed; built in M0.1). Every year has 365 days, because the engine's calendars have no leap years; weekdays match the real ones until 2028, then run a day early per skipped 29 February. Morning from 06:00, afternoon from 12:00, evening from 18:00, night from 22:00. Seasons by the weather: spring from 1 March, summer 1 June, fall 1 September, winter 1 December.
- **Who owns time** (built in M0.1). The engine's time module owns the tick, timers and wall-clock time (`time/elapse`, at 500 ms a game minute with a 2 s cap, tune). This game's clock module adds hour and minute facts and one verb, wait until a time of day. The stage scales or stops the milliseconds it passes for speeds and pauses, so speed is never in the save.

## Needs and mood

Six needs on 0–1 with real-shaped decay and recovery (tune). The id in brackets is the sim's; every level is how much of the thing you have, so a full bar is a met need, and full calm is no stress.

| Need | Falls with | Recovers with | What it drives |
| --- | --- | --- | --- |
| Sleep (`rest`) | hours awake; debt accrues | sleep, by hours and quality | performance, health, mood |
| Hunger (`food`) | hours since a meal | meals, by cost and quality | energy, health |
| Hygiene (`hygiene`) | time, work, weather | washing, laundry | social outcomes, work standing |
| Social (`company`) | days alone | time with people, by regard | mood, relationships |
| Stress (`calm`) | work, money, law, grief | rest, leisure, people | health, mood, mistakes |
| Health and fitness (`health`) | age, illness, injury, habits | care, exercise, time | everything else |

**Rates, built in M0.2** (`packages/sim/src/needs.ts`; a test holds the code to this table). Percent an hour, by what the person is doing (tune):

| Activity | rest | food | hygiene | company | calm |
| --- | --- | --- | --- | --- | --- |
| awake | -5 | -6.25 | -4 | -2 | 0 |
| sleep | 12.5 | -2 | -1 | 0 | 4 |
| eat | -5 | 100 | -4 | -2 | 2 |
| wash | -5 | -6.25 | 400 | -2 | 2 |
| relax | -4 | -6.25 | -4 | -2 | 10 |
| socialize | -5 | -6.25 | -4 | 40 | 4 |
| work | -6.5 | -8 | -6 | 2 | -4 |

- Health recovers 0.5% an hour while neither food nor rest is at zero, and falls 4% an hour for each of them that is, from the minute it runs out.
- A working day balances: 8 hours awake, an 8-hour shift and 8 hours asleep cost 130% of food (three meals give 150%), 88% of hygiene (one wash gives 100%) and 92% of rest (the sleep gives 100%), and leave company and calm where they started.
- Health at zero has no consequence yet. Illness and death come with M2.7.
- Levels are whole numbers (100% is 6,000,000 units, so 1% an hour is 1,000 a minute) and are settled, never ticked: the level at any minute is worked out from the last change of activity, so passing time costs nothing.

Money is a resource, not a need. Mood is derived, never stored: it drifts toward a target built from needs, relationships, work fit and recent events, scaled by a temperament trait (Landnám's `minds.ts`). No "fun" or "bladder" meters: leisure feeds stress and social. Every tier-1 person runs the same needs at their tier's cadence.

## People

Three tiers (D10):

| Tier | Who | Cadence | Count |
| --- | --- | --- | --- |
| 0 | the household | every tick | a few |
| 1 | named, persistent people with jobs, schedules, homes, relationships, aging | off screen once a game day each, a twenty-fourth of them every game hour (D30); per tick on screen | 1,000 (tune; D31), re-measured at M2.2 |
| 2 | district statistics: population by age and income, the job market, crime rates | per game day | the city |

A tier-2 person who is met becomes tier 1 and stays.

- **Generation:** name pools by the city's demographics; age from the district pyramid; traits (temperament, honesty, ambition, sociability, risk); skills by career; a look derived from the person once (Landnám's "one person, one look").
- **Schedules:** a template from job and household (work, school, sleep, errands); free time filled by utility over needs and relationships, where places advertise what they satisfy (The Sims' model; Space-Wrecked's utility scorer is the portfolio's seed). On screen, A* on the walk grid (2060TD's time-weighted pathfinding); off screen, jumps between blocks.
- **Memory:** people remember what you did to and for them (Ludus's `REGARD`, about 30 kinds of act, capped per person).

**Built in M0.4, the population harness** (`packages/sim/src/people/`, `tools/population`; docs/research/population.md):

- **Who they are** is worked out from the seed and never stored: households of one to four, a shift or none, a workplace, a third place, a bedtime, hours of sleep and a sociability. The templates are placeholders (tune; CALIBRATION.md), until M2.2's careers and households replace them.
- **Their hours** are each one of nine kinds (work, a break, sleep, the trip to work, rising, a meal, out, the evening, home). Each kind is pieces of the player's activities, so the needs are the player's needs at an hour's grain. Free time is the template's, not yet chosen by need.
- **Their needs** are settled with the player's own math, once for each run of one activity.
- **Their ties** grow at shared places. Each hour everyone there meets two others, and each meeting adds one to both people's ties. A person keeps 24 ties, and a full list lets a stranger take the place of someone met only once.
- **Their state** is 54 numbers a person: six levels, and 24 ties of two numbers each. It sits in 24 shares, one moved on a whole day each game hour (D30), because the kernel copies a module's whole slice in every action that writes to it.
- **What it costs**, with the CPU slowed four times in headless Chromium: 1,000 people take 4.2 ms an hour on average and 7.9 at the 95th, and a month passes in one action in about a second.

## Relationships

Per pair: familiarity, regard, attraction, resentment, and the memory above; ties grow from shared activity. Statuses as data: acquaintance, friend, dating, engaged, married, separated, divorced, estranged, enemy; family ties. Romance, affairs, breakups, custody and child support at real-shaped rates. Reputation by name and by district: standing changes prices, treatment and what people will do for you (Space-Wrecked's standing levels).

## Careers

- **One template for every career** (D9): skills × effort × conditions → pay, standing, fatigue; ladders and pay bands as data; a shared pool of shift events by tag. The catalogue aims at 100+ careers by release one and 30 in the first year (tune).
- **The labor market** (Gridiron Eras' employer model): employers hold expectations against your real ability; heat gets you fired and resets per employer; reputation gets you hired and follows you; AI peers create vacancies; firing moves you, it never ends the game.
- **Signature careers with their own loop** (D14):

| Career | Ladder | What it owns |
| --- | --- | --- |
| Crime | dealing → crew → organization | heat, police response, courts, prison, the record |
| Law | patrol → detective → federal agent | the same case files from the other side; federal assignments abstract the field, keep the consequences |
| Food and business | line cook → chef → owner | staff, suppliers, rent, inspections, payroll |
| Medicine | EMT → nurse → physician | the hospital; the body model; the long education ladder |

Release one ships crime to crew, law to detective, food to chef. Medicine and federal law follow per the cut ladder.

## Money

Wages net of tax; rent, utilities, groceries, transit, phone, insurance, debt, fines, tuition, childcare. Banks, loans at real rates, credit as a score that gates rent and cars. Eviction, repossession and bankruptcy as processes with notice. A ledger the player can read. Every number formatted from the rules; none typed into text.

**Built in M0.2, with placeholder figures** (`packages/sim/src/dials.ts`; not calibrated, and listed in [CALIBRATION.md](CALIBRATION.md)):

- Cash is the engine's economy kit's resource, counted in whole cents, and never goes below zero.
- One shift, Tuesday to Saturday from 15:00 to 23:00, at $15 an hour before tax. It is paid each Friday at 23:30 for the minutes worked since the last payday.
- A meal costs $4, and is not offered without the cash.
- Rent of $550 is due at midnight on the 1st; the month a life starts in is already paid. Rent that can't be paid is owed, not refused, and can be paid off once the cash covers all of it. Nothing follows from owing yet: part payments, the notice and eviction come with housing.
- A life starts with $300.

## Crime, law and consequence

- Every crime verb carries: witnesses as facts (tier-1 people present, cameras on a lot); a detection chance previewed as odds; heat per person and per crew with a half-life in days (tune; Spliceworld's exponential decay is the shape); evidence accruing on a case file.
- Police response is a scheduled event the player sees before it counts (a knock, a stop, a warrant), never a per-tick ambush (Spliceworld's fairness rule).
- Arrest → charges → bail → a court date → plea or trial with odds from the evidence and the lawyer you can afford → sentence.
- A record (misdemeanour, felony) gates jobs, housing and licences by real-shaped rules; probation; expungement later.
- Prison (D19): time passes with sparse choices: a job, visits, letters, a parole hearing, a standing meter with factions; health and skills drift. Outside, rent lapses, relationships cool, a business runs or fails without you.
- The law career builds the same case files: patrol generates facts, detectives build files, federal work targets organizations.

## Health and body

Sleep debt, hunger, fitness; illness incidence by age and habits; injury from work, violence and accidents, with recovery times; chronic conditions; addiction with real-shaped onset and relapse; mental health through stress. Care costs with and without insurance. Aging curves per attribute (Gridiron Eras' `careers.js`). Causes and ages of death from life-table shapes.

## Education

School → diploma or GED → community college → university → professional school, as ladders of time, money and schedule blocks, with grades from effort and aptitude. Adult entry at every step. Household children attend by default; the player can intervene (tutoring, moving districts for the school).

## Driving and travel

Walking, bus, bicycle, rideshare, and owned cars with price, insurance, fuel, maintenance and breakdowns (Dirtbag's van). Driving happens in the stage; only facts reach the sim: arrived, collided at a speed band, stopped by police, parked illegally. Licences, tickets, DUI, points, suspension. Map travel costs the route time; walking the block is for when being there matters. Owned-car driving is Phase 4 (cut ladder).

## Interiors (D18)

Walkable, generated from templates by building type, with cutaway walls when the player is inside or behind. Release one: homes, the restaurant, the precinct and courthouse, the hospital, the school. Other businesses open as a counter scene until their template exists. Fallback if the art spike fails its kill criterion: interiors as scenes inside the isometric city.

## Presentation

- Isometric 2D (D2), a fixed angle, zoom only (D7). Smooth vector drawn in code (D25): one renderer, one palette, one light direction.
- People: a procedural rig with facings and mirroring; outfits, age and body as parameters. Faces do not carry emotion at this size; bubbles, panels and the chronicle do.
- Buildings: footprints extruded to isometric boxes with facade grammars by type (windows, doors, signs, awnings, wear); roofs hidden and walls cut when needed.
- Vehicles: a handful of parametric body types. Trees, weather, night lighting (the best-looking thing in Dirtbag v0.956).
- Input: tap-to-go first; an optional stick; keyboard and gamepad with spatial focus.
- Mobile first: 360 and 390 px portrait, landscape, 44 px targets.
- Sound: synthesized, as in every earlier game.

**Built in M0.3, the art spike** (`packages/stage`; docs/research/art-spike.md):

- **The view** is a true orthographic camera, 45° round and 30° down. A ground tile is a diamond twice as wide as tall, and a vertical metre draws √1.5 times a ground step. A tile is a metre.
- **People** are a 3D skeleton viewed through the same camera, so every facing comes free.
  - Knees and elbows bend by two-bone IK toward a pole.
  - The head and limbs are drawn about a sixth larger than life, as a comic figure is (tune). The figures stand at true scale against the buildings.
  - Poses are targets for the hips, feet and hands: stand, walk, sit, eat, lie, cook, argue.
- **The ink** (the Mix): people and bubbles are inked; buildings, ground and furniture are flat colour shaded by one sun. The ink is 0.7 to 1.6 px, heavier closer in.
- **The cutaway**:
  - Near walls are cut to 0.55 m, below a standing person's hips, with a gap at the door.
  - The far walls stand a storey high, showing their inside.
  - Storeys above and roofs are hidden.
  - Only a building with an interior template is ever cut (D18).
- **Night** lays a dark layer, 74% at its deepest, over the picture, and lets light through at lit windows, lamps' pools, the signs and lit rooms. Everything lights at 30% dark, and twilight runs on placeholder times (CALIBRATION.md).
- **Drawing.** The still picture is kept between frames. Each frame draws what moves over it, then, clipped to each mover, the still pieces the depth sort puts in front of it. This was 2.4 times faster with the CPU slowed four times (ROADMAP.md, Readings), and a browser check holds it to the full painter's order.

## Saves

The engine's model: a checksummed snapshot plus an action log, per-module migrations, slots, backups and quarantine, in IndexedDB with a localStorage fallback. The city is derived; saves hold the diffs and the people. A fixture from every version must load.

## Editions and the gate (D17)

The free edition is the first in-game year, whole, with a last card at the birthday. The full game unlocks once, on the web and through Play Billing with the acknowledger. Content past the first year lives in `*.full` modules with `*.demo` twins, and CI diffs the builds. Steam later through the Electron shell.

## The first slice (Phase 1)

One week, one apartment, one job (line cook), one relationship (a coworker), one crime (shoplifting) with a possible police response. One block drawn, two interiors. The gates are in ROADMAP.md.

## The first year (Phase 2)

Two districts; 30 careers on the template; crime to crew and law to detective; food to chef; relationships, romance, marriage, children; aging, death, the heir; education to community college; walking, bus, rideshare; the year's events; the demo/full split.

## Cut ladder, most cuttable first

1. Medicine (becomes a template career).
2. Law above detective.
3. Interiors beyond home, restaurant and precinct.
4. Owned-car driving.
5. Districts beyond two.
6. Education beyond community college.
7. Crime above the crew tier.

The floor: the first year whole, crime to crew, law to detective, food to chef, two districts, three interiors, aging and the heir intact.

## Defaults unless vetoed

Base year 2025 dollars on a fixed in-game calendar. A per-district trend (growing, stable, declining) seeded per city, with closures and openings as events. The slice's crime is shoplifting. Package id `com.rcjlabs.liveyourlife`, pending the title. No licence file until decided. Saves on the engine's model. The demo/full split from the first content commit. A content lint with a blocklist.

## Open questions

1. Which needs show as meters and which only through mood and the chronicle.
2. How much of the law is state-specific (theft thresholds, drug schedules, sentencing ranges), and which state the city borrows from.
3. Whether children under 18 in the household are played at all, or only seen and raised.
4. The tick and speeds (set from M1.8).
5. Transit coverage by district, and whether the bicycle is a release-one verb.
6. How a tier-1 person who is met is settled to the minute from their plan, and when a met person's free time stops following a template (M2.2).
