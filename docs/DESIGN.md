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

## Time

- 1 tick = 1 game minute (tune). Speed 1 = 2 game minutes a real second, so a day is 12 minutes (tune). Speed 2 = 4×. Speed 3 = run to the next event or the end of the routine block.
- The clock runs while the player is in the world and pauses on any menu, dialogue, a hidden tab and the home screen. Nothing passes while the app is closed (D3).
- Routines: sleep, shifts, school and commutes are blocks that run at speed 3 by default and stop on an interruption. Yesterday can be replayed as a plan (Dirtbag).
- Fast-forward yields to the page between game hours (Gridiron Eras' 17.8 s lesson).

## Needs and mood

Six needs on 0–1 with real-shaped decay and recovery (tune):

| Need | Falls with | Recovers with | What it drives |
| --- | --- | --- | --- |
| Sleep | hours awake; debt accrues | sleep, by hours and quality | performance, health, mood |
| Hunger | hours since a meal | meals, by cost and quality | energy, health |
| Hygiene | time, work, weather | washing, laundry | social outcomes, work standing |
| Social | days alone | time with people, by regard | mood, relationships |
| Stress | work, money, law, grief | rest, leisure, people | health, mood, mistakes |
| Health and fitness | age, illness, injury, habits | care, exercise, time | everything else |

Money is a resource, not a need. Mood is derived, never stored: it drifts toward a target built from needs, relationships, work fit and recent events, scaled by a temperament trait (Landnám's `minds.ts`). No "fun" or "bladder" meters: leisure feeds stress and social. Every tier-1 person runs the same needs at their tier's cadence.

## People

Three tiers (D10):

| Tier | Who | Cadence | Count |
| --- | --- | --- | --- |
| 0 | the household | every tick | a few |
| 1 | named, persistent people with jobs, schedules, homes, relationships, aging | per game hour off screen, per tick on screen | a few hundred to about a thousand (tune; M0.4) |
| 2 | district statistics: population by age and income, the job market, crime rates | per game day | the city |

A tier-2 person who is met becomes tier 1 and stays.

- **Generation:** name pools by the city's demographics; age from the district pyramid; traits (temperament, honesty, ambition, sociability, risk); skills by career; a look derived from the person once (Landnám's "one person, one look").
- **Schedules:** a template from job and household (work, school, sleep, errands); free time filled by utility over needs and relationships, where places advertise what they satisfy (The Sims' model; Space-Wrecked's utility scorer is the portfolio's seed). On screen, A* on the walk grid (2060TD's time-weighted pathfinding); off screen, jumps between blocks.
- **Memory:** people remember what you did to and for them (Ludus's `REGARD`, about 30 kinds of act, capped per person).

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
2. Whether tier-1 people run needs per game hour or per schedule block off screen (a cost question for M0.4).
3. How much of the law is state-specific (theft thresholds, drug schedules, sentencing ranges), and which state the city borrows from.
4. Whether children under 18 in the household are played at all, or only seen and raised.
5. The tick and speeds (set from M1.8).
6. Transit coverage by district, and whether the bicycle is a release-one verb.
