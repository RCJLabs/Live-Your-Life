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
  - **The courthouse and the precinct (M2.1).** Each is one building record, written by hand (`records/building/courthouse.json`, `precinct.json`), and listed in the city record's `institutions`. Where each stands is not authored: it takes the downtown lot nearest the city's centre that is as wide as its narrowest front, the courthouse first. Both are shells for now; their interiors come with the law's milestone (M2.4).
- The map is the same renderer zoomed out, with district labels and tap-to-travel that costs the real route time.
- Release one: two districts live, the rest as statistics (cut ladder).

**Built in M1.1, one block** (`packages/content`, `packages/sim/src/city/`, `?block=generated`; D32, D33):

- **The content** is an Engine-Builder project in `packages/content`. Record types for the street, facades, buildings and blocks sit in `types/`, and their records in `records/`, all JSON. The engine's compiler checks them in CI and builds the pack the sim and the page read.
- **The block** is one side of one street (D32), 6 to 8 lots (tune). The apartment house, the diner and a corner shop stand on every block, the shop at an end of the row. Storefronts, row houses and the odd vacant lot fill the rest, by weight. Across the street is a verge or a car park, the open side nearest the camera.
- **Facades** follow the grammar in their records. The ground floor is diner glass, a shopfront or a stoop. Above it are bays of single or paired windows, with sills or without, and a band, a bracketed band or a parapet on top. Wear runs from kept up to boarded. Signs and awnings go where the record allows. The seed picks within each record.
- **Street furniture stands by rule**: lamps along both curbs, a hydrant, a bench, trees on a verge, and a pole sign for a building that has one. None stands in a doorway.
- **The walk grid** is the block's ground in half-metre cells (tune). Stepping onto each costs 1 on a sidewalk, 1.1 on a lot, 1.2 on a verge and 1.4 on the roadway (tune), and there is no step under a building or a post. Routes are weighted A* with eight neighbours, ported from 2060TD.

**Built in M2.1, the city and its streets** (`packages/sim/src/city/city.ts`, `streets.ts`, `walks.ts`):

- **The city** is a square of 400 m cells (tune), each given a district by where it lies (D63–D66). A cell holds whole blocks of its district, stretched or squeezed from the record's size so they fill it, and its edges are the middles of streets the cells round it share.
- **The streets** are one network of street middles, built from the plan and never saved. A walk across the city follows them, shortest first, from the street in front of one door to the street in front of another.

- **Your block** (D67) is the slice's block, standing whole as the south face of the inner-ring block nearest downtown that holds it. Round it, the faces of the blocks within 60 m (tune) are drawn and can be walked; what stands between the camera and you is cut to its sills (D64).

**Built in M2.1, the city's faces** (`packages/sim/src/city/face.ts`):

- **A face** is one long side of one of the city's blocks, planned only when it is needed and the same way every time, from the city's seed, the block and the side. The city has already fixed each lot's frontage (city.ts); the district's frontage record picks a building for each lot by weight, among those whose narrowest front fits with a gangway to spare, or leaves it empty. The institutions stand on the lots the city gave them.
- **Downtown** fills with office blocks (4 to 10 storeys, a lobby of glass doors in a stone surround), storefronts, apartment houses and the odd diner (tune). **The inner ring** is the slice's street: row houses, apartment houses, storefronts, corner shops and diners (tune).
- **A face is a block plan** in its own frame, so the walk grid, the routes, the drawing and M1.1's and M1.2's checks take it unchanged. Lots run back 30 m in the inner ring and 38 m downtown, half the block less half the alley; the buildings stand at the front and the yards behind. Across the alley, the block's other face is its back row, seen from behind.

## Time

- 1 tick = 1 game minute (tune). Speed 1 = 2 game minutes a real second, so a day is 12 minutes (tune). Speed 2 = 4×. Speed 3 = run to the next event or the end of the routine block.
- The clock runs while the player is in the world and pauses on any menu, dialogue, a hidden tab and the home screen. Nothing passes while the app is closed (D3).
- Routines: sleep, shifts, school and commutes are blocks that run at speed 3 by default and stop on an interruption. Yesterday can be replayed as a plan (Dirtbag).
- **The alarm** (D57, built in M1.8): what you do ends 30 game minutes before your next shift, the walk to work (tune); during a shift the bed says you're due, and its sleep ends with the shift (D58).
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

A tier-2 person who is met becomes tier 1 and stays. On the town's sidewalks tier 2 is drawn as passers-by (D72): as many as the hour and the district's density give, the same at the same minute, and nothing saved. Stopping one to meet them waits for M2.6.

- **Generation:** name pools by the city's demographics; age from the district pyramid; traits (temperament, honesty, ambition, sociability, risk); skills by career; a look derived from the person once (Landnám's "one person, one look").
- **Schedules:** a template from job and household (work, school, sleep, errands); free time filled by utility over needs and relationships, where places advertise what they satisfy (The Sims' model; Space-Wrecked's utility scorer is the portfolio's seed). On screen, A* on the walk grid (2060TD's time-weighted pathfinding); off screen, jumps between blocks.
- **Memory:** people remember what you did to and for them (Ludus's `REGARD`, about 30 kinds of act, capped per person).

**Built in M0.4, the population harness** (`packages/sim/src/people/`, `tools/population`; docs/research/population.md):

- **Who they are** is worked out from the seed and never stored: households of one to four, a shift or none, a workplace, a third place, a bedtime, hours of sleep and a sociability. The templates are placeholders (tune; CALIBRATION.md), until M2.2's careers and households replace them.
- **Their hours** are each one of nine kinds (work, a break, sleep, the trip to work, rising, a meal, out, the evening, home). Each kind is pieces of the player's activities, so the needs are the player's needs at an hour's grain. Free time is the template's, not yet chosen by need.
- **Their needs** are settled with the player's own math, once for each run of one activity.
- **Their ties** grow at shared places. Each hour everyone there meets two others, and each meeting adds one to both people's ties. A person keeps 12 ties (24 until M2.2, D71), and a full list lets a stranger take the place of someone met only once.
- **Their state** is 30 numbers a person: six levels, and 12 ties of two numbers each (D71; 54 numbers and 24 ties in M0.4). It sits in 24 shares, one moved on a whole day each game hour (D30), because the kernel copies a module's whole slice in every action that writes to it.
- **What it costs**, with the CPU slowed four times in headless Chromium: 1,000 people take 4.2 ms an hour on average and 7.9 at the 95th, and a month passes in one action in about a second.

## Relationships

Per pair: familiarity, regard, attraction, resentment, and the memory above; ties grow from shared activity. Statuses as data: acquaintance, friend, dating, engaged, married, separated, divorced, estranged, enemy; family ties. Romance, affairs, breakups, custody and child support at real-shaped rates. Reputation by name and by district: standing changes prices, treatment and what people will do for you (Space-Wrecked's standing levels).

- **Built in M1.4: the other line cook** (`packages/sim/src/ties/`; the crew in `career/line-cook.json`, with `name-pool/`, `act/` and `favour/` records).
  - Who they are is drawn at hire from the seed and the name pool: a first name with the pronouns that go with it, a last name, an age from 19 to 52 (D41).
  - They work five days a week. Their two days off are worked out from their own seed and the week, not stored. On a day they work and you're on, they're on your shift.
  - Familiarity grows with minutes on the line beside them: half at 40 hours, 75 at 120.
  - Regard runs from 0 to 100 and starts at 50. Each act moves it by its weight, from −15 for telling on them to +16 for covering their shift (D44). 17 kinds of act, each with the line they remember it by.
  - What they remember is the last 8 kinds: the day each last happened and how many times.
  - Acts come from choices in shift events they're part of, from being late or missing a shift of theirs, and from favours (D42).
  - Favours: they ask on about one day in ten for one of their shifts 2 to 6 days on that you're free for. You can say yes or no until the day before; never answering counts too. You can ask them to cover one of yours on their day off, once a shift, at even odds and 50 points of regard either way (D43). Their yes costs your standing nothing.
  - A shift event choice that leans on them, such as asking them to take your eggs, gains or loses its regard points with regard. The odds shown are the odds rolled.
  - Lines about them use `{name}`, `{them}` and `{their}`. They name them rather than say "she" or "they", so no verb has to agree.

## Careers

- **One template for every career** (D9): skills × effort × conditions → pay, standing, fatigue; ladders and pay bands as data; a shared pool of shift events by tag. The catalogue aims at 100+ careers by release one and 30 in the first year (tune).
- **Built in M1.3: the line cook** (`packages/content/records/career/line-cook.json`, `packages/sim/src/job/`).
  - The diner runs two shifts a day, 06:00 to 14:00 and 14:00 to 22:00. Each Thursday it posts next week's: 3 to 6 of them by standing, one a day.
  - You sign up from tomorrow on, five a week at most, and can drop a shift a day or more ahead for a point of standing.
  - Standing runs from 0 to 100 and starts at 50 (D39):
    - a whole shift on time adds 2;
    - more than 5 minutes late takes 4;
    - more than 30 minutes missed once there takes 6;
    - a no-show takes 15 and is a warning, and two warnings in 28 days end the job;
    - so does standing at 0.
  - Skill is 100 × practice ÷ (practice + 400 hours), practice being the minutes worked and what some outcomes add. Fatigue is the rest need: it lowers the odds of a chancy choice.
  - In about half of shifts, an event stops the work at a minute drawn when you sign up (D40). A choice is certain, or has odds from a base, skill and tiredness, between 5% and 95%. The preview and the roll come from the same function.
  - Missing so far: effort as a choice, and ladders and promotion (M2.5).
- **The labor market** (Gridiron Eras' employer model): employers hold expectations against your real ability; heat gets you fired and resets per employer; reputation gets you hired and follows you; AI peers create vacancies; firing moves you, it never ends the game.
- **Built in M2.3: openings and applications** (D73–D75; `packages/sim/src/market/`, `apps/game/src/life/jobs.ts`, `trip.ts`).
  - The city's employers are the tier-1 workplaces, each working one career, a few tier-2 sites a career, and your block's diner. Each posts openings as often as its career's staff leave, by the federal turnover survey's separations; an opening stays up 10 to 28 days (tune). Nothing of it is saved.
  - You apply from the Jobs tab, the odds shown first: the career's base, less points with a conviction, and points either way for your reputation. The line cook takes 15 applicants in 100, 7 with a conviction (D76). The answer comes in one to three days and is rolled at those odds. An offer stands two days. A career can bar a record. At most five applications wait at once.
  - Reputation starts at 50: being let go takes 20, quitting 5, and each whole shift on time adds a point.
  - A job away from your block is worked off screen: the real walk along the streets at 80 m a minute (tune), the shift with its events, the walk home. The coworker is beside you only while you work at the diner.
  - Missing so far: the 29 careers' records, waiting on their wages; expectations against ability and heat per employer; the tier-1 people really leaving the jobs that open.
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
- Since M1.3, the line cook earns $14.73 an hour, Michigan's 25th percentile for restaurant cooks. Pay comes each Friday at 06:00 for every minute worked since the last payday. Federal income tax, Social Security, Medicare, Michigan's tax and the city's are withheld as a Michigan employer withheld them in 2025 (D37, D38). A full week of five shifts is $589.20 gross and $486.55 take-home. The sources are in CALIBRATION.md.
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
- **Built in M1.5: shoplifting** (`packages/sim/src/law/`; the corner shop's interior; `crime/`, `offence/`, `fence/` and `item/` records).
  - **The shop.** A clerk at the till and a camera watch the corner shop. Who sees each shelf is worked out on the walk grid: straight lines from the till all round, and from the camera a quarter turn either side of the way it faces. Shelves and coolers hide you; the counter doesn't (D45).
  - **The odds.** Taking from a shelf is held by the clerk at 45% where the clerk sees it, and 4% where nobody does. Where the camera sees it, it is known from the footage at 35%. Heat adds a point for every two, and halves in about a week. The odds are shown first and are the odds rolled.
  - **Being caught.** Held, you wait 20 to 40 minutes for the police. Known from the footage, the shop reviews it at 23:00, and the police come 2 to 5 days later, at a time you are told. Either way:
    - an appearance ticket with a court date 14 to 42 days on;
    - the shop's civil demand: ten times the price, between $50 and $200, and the price if the goods are gone;
    - a bar from the shop.
  - **Court.** On the date you go between 08:00 and 12:00, or it is a warrant at midnight and an arrest days later at a time you are told, then twelve hours in the cells and the hearing. You plead:
    - guilty: $200 fine and $125 costs;
    - HYTA: on a first offence below 26, six months' probation with a check-in and a $30 fee every 30 days, and no record when done; a missed check-in or a new offence ends it and enters the conviction;
    - not guilty: dismissed at 10% when you were held and 30% on footage.
  - **Goods and the fence.** What you take goes in your bag, through the engine's inventory kit. Food can be eaten. The fence behind the diner, from 22:00 to midnight, pays a quarter of the price; 3% of sales come back to you as receiving stolen property.

## Health and body

Sleep debt, hunger, fitness; illness incidence by age and habits; injury from work, violence and accidents, with recovery times; chronic conditions; addiction with real-shaped onset and relapse; mental health through stress. Care costs with and without insurance. Aging curves per attribute (Gridiron Eras' `careers.js`). Causes and ages of death from life-table shapes.

## Education

School → diploma or GED → community college → university → professional school, as ladders of time, money and schedule blocks, with grades from effort and aptitude. Adult entry at every step. Household children attend by default; the player can intervene (tutoring, moving districts for the school).

## Driving and travel

Walking, bus, bicycle, rideshare, and owned cars with price, insurance, fuel, maintenance and breakdowns (Dirtbag's van). Driving happens in the stage; only facts reach the sim: arrived, collided at a speed band, stopped by police, parked illegally. Licences, tickets, DUI, points, suspension. Map travel costs the route time; walking the block is for when being there matters. Owned-car driving is Phase 4 (cut ladder).

## Interiors (D18)

Walkable, generated from templates by building type, with cutaway walls when the player is inside or behind. Release one: homes, the restaurant, the precinct and courthouse, the hospital, the school. Other businesses open as a counter scene until their template exists. Fallback if the art spike fails its kill criterion: interiors as scenes inside the isometric city.

**Built in M1.2, two interiors** (`packages/content`'s fixture, room and interior records; `packages/sim/src/city/`; D34–D36):

- **The records.**
  - A fixture is one of the stage's drawings, a size, whether it takes up the floor, and how it is used: from which side, how far out, for which activities, in which pose.
  - A room places fixtures by rule in its own frame.
  - An interior lays rooms out from its footprint's edges and the front door, a later room cut out of the earlier ones. It names the doors between rooms or out, and the units the rooms make, each with the activities it must have a place for.
- **The flat** (D34) is a stair hall down the middle of the apartment house from the front door, with a studio either side. Each studio has a main room (bed, kitchenette, table, couch, television) and a bathroom (shower, toilet, sink). The second studio is the first mirrored. The apartment house is 10 to 11 m wide (tune).
- **The diner** (D35):
  - The line stands out from the back wall, the cook behind it facing the room.
  - The counter has its stools, and the tables stand by the windows.
  - A back room holds the dish pit and dry stores, with a staff toilet and a back door to the yard.
- **Walking inside.**
  - Walls and fixtures are no step.
  - A doorway is open at the cells whose middles lie in it, so one 0.9 m wide (tune) always lets a walker through.
  - A walk to a fixture ends in the nearest open cell on the side it is used from, in its room.
  - Passages are a metre or more, so a row of open cells runs through them however the grid falls (tune).
- **The cut**, for a building with rooms:
  - each room's floor;
  - the far walls, inside, in each room's colour;
  - the inside walls, cut low with the near ones;
  - a way out through a far wall, as an opening under a lintel.
- **When a building is cut:** when the walls are down, when someone is inside it, or when a corner of them falls inside its outline on the screen and the depth sort puts it nearer.
- **The walker** (D36) walks the commute round and round in stage seconds, at 1.3 m a second (tune), through the middle of every doorway.

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

**Built in M1.6, the life on the page** (`apps/game/src/life/`; D49–D52):

- **Tap-to-go.** You tap a place, or the ground, and walk there by the walk grid's route at 3.9 m a stage second, three times a walking pace, with the clock running: the commute is about 20 game minutes (D49). The sim hears nothing until you arrive.
- **Places.** Your flat's fixtures (one of the walk-up's, by the block's seed), the diner's, the shop's shelves with their goods, the fence behind the diner, and every front door. A place's menu offers what the game offers there now; a shelf's and the fence's show their odds from the preview.
- **Time.** Speed 1 is 2 game minutes a second and speed 2 four times that, with Pause. The clock stops while the panel, a menu, the map or a choice is open, in a shift event, held, in the cells and in court. An activity's time passes as a fast-forward of up to three seconds with you in its pose.
- **The bar** (D50): the time, the cash, the two lowest needs as meters with their word, Pause, the speed, a badge counting what waits on you, and the map. **The panel**: what waits, each with its day and what you can do about it now; the shifts posted; all six needs; the journal.
- **The chronicle** (D52): each entry shows once at the foot of the screen, then stays in the journal, by day.
- **The map** (D51): the block from above, its buildings named (a shop by its sign), you on it, and a button for each building.

## Saves

The engine's model: a checksummed snapshot plus an action log, per-module migrations, slots, backups and quarantine, in IndexedDB with a localStorage fallback. The city is derived; saves hold the diffs and the people. A fixture from every version must load.

**Built in M1.7** (`apps/game/src/life/keeper.ts`, `lives.ts`; D53, D54):

- **Where.** `life.rcjlabs.com`, under the engine's keys `eb/live-your-life/full/`, with IndexedDB first, then localStorage, then memory. Storage persistence is asked for at the first save.
- **When.** After every action but time passing, every game hour, on reaching a place, and when the page is hidden or closed. Saves queue, so two never cross. There is no saving or loading by hand: a slot is a life, and what happened stands.
- **Your lives.** Three slots. The first visit starts a life in the first; after that the page opens on the list: each life's name, date and money, to go on with or to end for good, with a confirm. The panel's "Your lives" goes back to it.
- **What a save holds.** The engine's snapshot and the actions since, compacted at 200. Beside it, the place you last reached (in its summary) and the journal, one key a day, each entry the event and the step it happened at. A load drops entries past the saved step, and a day that won't read costs only that day.
- **When a save won't load.** The engine copies it aside and tries the save before; if that loads, the life goes on and a line says so. If neither does, the list says the life couldn't be loaded and that a copy was kept, and the slot can be ended to free it.
- **Time in the log.** The page sends time in whole game minutes, so a session logs about two actions a second at speed 1, not one a frame.
- **The first fixture.** `packages/sim/test/fixtures/saves/life-v1.json`, a bot's week saved by this build, must load with nothing skipped and every slice in today's shape.

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
2. How much of the law is state-specific (theft thresholds, drug schedules, sentencing ranges). The state is Michigan (D37).
3. Whether children under 18 in the household are played at all, or only seen and raised.
4. The tick and speeds (set from M1.8).
5. Transit coverage by district, and whether the bicycle is a release-one verb.
6. How a tier-1 person who is met is settled to the minute from their plan, and when a met person's free time stops following a template (M2.2).
