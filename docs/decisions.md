# Decisions

Every choice that shapes the product, with the options considered, the reason and the date. Status is LOCKED, PROPOSED or OPEN. A LOCKED decision changes only by a new entry that names the old one. Product calls are Evan's; each entry says so.

Numbers here are proposals unless ROADMAP.md's Readings say otherwise. Paths in other repositories are in docs/research/portfolio-survey.md.

---

### D1. The view: top-down 3/4 with a city map. LOCKED, 2026-10-18 (Evan's call)

**Decision.** The player looks at the city from above at an angle and has a map.

**Options considered.** (a) A living city map with scenes and panels, Dirtbag's current form. (b) A real-time 2D world, walked and driven, at a fixed tick. (c) 3D third person on three.js and Rapier. The recommendation was (a): the portfolio had never run a real-time world, and Dirtbag's audit had retired a walkable town. Evan reaffirmed the view: "Top down 3/4 view. So not fully top down but at an angle. With a map. That's the vision."

**Cost.** Touch movement, pathfinding at city scale, vehicles, a clock that runs while you move and a streaming map renderer are all new work. The audit's lesson is kept as a rule: nothing is placed by hand.

### D2. Isometric 2D. LOCKED, 2026-10-18 (Evan's call)

**Decision.** The 3/4 look is isometric 2D, as in The Sims 1 and Project Zomboid.

**Options considered.** Square-grid 3/4 (Stardew Valley, Zelda), with 4-direction sprites, the largest tooling ecosystem and the lowest cost; recommended. Isometric; chosen. Low-poly 3D under a fixed 3/4 camera, with no sprite multiplication but no phone reading.

**Cost.** Both reference games draw 3D characters over 2D tiles for the reason that animated people in eight directions are prohibitive as hand-made sprites; that made D6 the next question. Depth sorting of sprites larger than a tile, occlusion by walls and roofs, screen-to-grid projection for touch. Pathfinding is unaffected: the grid stays orthogonal in data.

### D3. Time: ticks while the player is in the world, pausable, with speeds. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** The clock moves only on actions (Dirtbag, Landnám), fully deterministic but the city reads as frozen while you walk. Ticks with pause and speeds (The Sims); chosen. Real-world time with offline catch-up (Spliceworld), natural on a phone and hostile to living a whole life.

**Consequences.** Nothing passes while the app is closed. Fast-forward yields to the page between game hours. The tick length and speeds are (tune), set from the slice's bot reading.

### D4. One controlled life, real death, an heir continues. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** One life then an heir (Dirtbag shipped it; Ludus models it; "aging is load-bearing" in the studio's design DNA); chosen. A household you switch between (The Sims). A single protagonist who cannot die (GTA).

**Consequences.** Household members run on the same NPC sim. The family line is the long record. Inheritance is D20.

### D5. One mid-size fictional US city for release one. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** One small town at Dirtbag's scale (deep per place, a thin job market). One mid-size city; chosen. A region with several cities (the content-volume trap the Three Winters concept warned about).

**Consequences.** Seed-generated districts, blocks and lots; template businesses and households; a few authored institutions; other cities abstracted. Two districts live in release one (cut ladder). The region is D15.

### D6. Characters: procedural figures drawn in code. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Pre-rendered from 3D models in a build step (CC0 rigs, headless Blender in CI, outfits as layers: the Fallout and Diablo method as a code pipeline); recommended. Procedural figures drawn in code, Dirtbag's rig re-posed for the 3/4 camera; chosen. 3D characters over 2D tiles in WebGL, the actual Sims 1 and Zomboid method, with three.js in the download and no phone reading. AI-generated sprite sheets, where consistency across directions and frames is the weak point.

**Consequences.** Unlimited variety and visible aging at zero asset cost, no licence risk, a tiny download, outfits as data. Stylized by construction, which caps visual realism (accepted). Faces do not carry emotion at this size; bubbles, panels and the chronicle do. The rig needs facings with mirroring and per-facing draw order.

### D7. Camera: a fixed isometric angle, zoom only. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Fixed angle; chosen: one drawing per object, back faces never drawn. Four rotations (The Sims 1, Zomboid): four drawings per object, or a 3D source.

**Consequences.** Cutaway walls or hidden roofs when the player is inside or behind something. The map is the same renderer zoomed out.

### D8. Verbs: all of them; realistic consequences are the only brake. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** All of it, with police, courts, prison, injury and social fallout as the limits, tuned so cruelty is never the optimal play (Ludus's rule); chosen. Crime and vice but no killing by the player, keeping the studio line "you don't kill anything". Lawful life only, with crime as events that happen to you.

**Consequences.** Theft, robbery, assault, murder, dealing, fraud, sex work and gambling are in. The out list stands regardless: sexual violence, minors, real people and brands, anything for real money. This replaces a DNA line on purpose; the pillars say so. Rating expectation, unverified: Mature on Play through the IARC questionnaire, with violence, drugs and simulated gambling declared.

### D9. Jobs: one data template for every career, plus signature careers with their own loop. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** One template plus 3–5 signature careers; chosen. Breadth only: every career a shift with card events. Depth only: 5–10 deep careers and nothing abstract.

**Consequences.** Skills × effort × conditions → pay, standing, fatigue; ladders and pay bands as data; a shared pool of shift events by tag; a labor market after Gridiron Eras' employer model (expectations against ability, heat separate from reputation, firing that moves you, peers who create vacancies). The signature careers are D14.

### D10. Population: three tiers. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Three tiers; chosen. Everyone named and persistent (Zomboid, Dwarf Fortress), the main-thread risk the portfolio has already hit. A household plus a small cast, the city as backdrop.

**Consequences.** Tier 0 the household, every tick. Tier 1 named, persistent people with jobs, schedules, homes, relationships and aging, progressed in batches off screen; a few hundred to about a thousand (tune), set by the M0.4 reading. Tier 2 district statistics from which a named person materializes on contact and then persists. A met person is promoted, never discarded.

### D11. Realism: numbers, consequences and body; not space and time, not visuals. LOCKED, 2026-10-18 (Evan's call)

**Options considered** (several could be chosen). Numbers: wages, rents, prices, taxes, time budgets as dated tables; chosen. Consequences: law, health, money, relationships, employment at real-shaped rates; chosen. Body: sleep debt, hunger, illness, injury, aging curves, causes of death; chosen. Space and time: real distances, commutes, hours, daylight by season; not chosen. Visuals were out by D6.

**Consequences.** docs/CALIBRATION.md is a ledger with sources, like an asset provenance log. Realism bars become tests. Distances, commutes and hours are tuned for play.

### D12. Tone: earnest drama. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Dirtbag's register: dry, wry, second person, never jokey, the world played straight; recommended. Satire, GTA's heightened America. Earnest drama: poverty, crime, illness and death treated seriously, no comedy register; chosen. Deadpan system narration (RimWorld, Dwarf Fortress).

**Consequences.** The house voice rule does not carry over; docs/VOICE.md is written before events are written at volume. Facts and consequences carry the drama, not adjectives. Never glamorise; never moralise either: the world responds, the text does not judge.

### D13. The sim on Engine-Builder's pure core; the stage and UI in this repo. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** The sim as modules and kits on `@eb/core` from the first commit, with the isometric renderer, input and UI here until the engine's Phase 4 (runtime UI) and Phase 7 (2D stages) catch up; chosen. Standalone, like Dirtbag: fastest to a loop, the shared core rebuilt a twenty-first time. Waiting for the engine and building the game in its editor.

**Consequences.** The purity rules apply to the sim. The first slice is bot-playable headless with `eb sim`. Content is JSON validated by schemas. The engine's packages are private and export raw TypeScript, so it comes in as a pinned git submodule in a pnpm workspace. Built 2026-10-19 (M0.1): pinned at `ca92793`; only the engine packages this repo uses join the workspace. The engine's lint-boundaries resolves the engine's own root, so `tools/purity` applies the same rules (`@eb/purity`) to this repo's pure packages. Open: whether this game becomes an engine proof, which would reopen Engine-Builder's build order (3D before 2D); which kits a life sim lacks and when they move back.

### D14. Signature careers for release one: crime, law, food and business, medicine. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Crime (dealing → crew → organization), law (patrol → detective → federal agent), food and business (line cook → chef → owner), medicine (EMT → nurse → physician); all four chosen. Politics, law practice, tech and trades stay template careers.

**Consequences.** Four institutions exist as places and systems: the street economy, the precinct and courthouse, a restaurant and its supply chain, the hospital and a school. "CIA agent" is the top of the law ladder, with field work as assignments whose outcomes are abstracted and whose consequences are real. Release one ships crime to crew, law to detective, food to chef; medicine and federal law follow per the cut ladder.

### D15. Setting: a fictional Rust Belt or Midwest mid-size city, 250k–400k people. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Rust Belt or Midwest; chosen: cheap rents make a life from nothing credible, car-dependent sprawl makes driving matter, real winters feed the body model, and the whole range from poverty to wealth exists in one city. Sunbelt or Texas. Mountain West (Dirtbag's register). Deliberately generic.

**Consequences.** Calibration against that metro class. Open: the city's name, the base year (proposal: 2025 dollars on a fixed in-game calendar), and whether the district trend is on by default.

### D16. Voice: second person in the interface; a third-person past-tense chronicle for the record. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Second person in the UI and a third-person chronicle; chosen. Second person everywhere (Dirtbag). Named characters in third person throughout.

**Consequences.** Prompts, costs and choices address "you", continuous across heirs. The journal records what happened with names, in plain past tense (Landnám's saga voice). docs/VOICE.md covers both.

### D17. Channels: a free first year of life, a one-time unlock; web PWA and Play TWA; Steam later. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Dirtbag's model; chosen. Fully free. Paid up front with a web demo. Steam first, mobile later.

**Consequences.** Dirtbag's gate, Play Billing acknowledger, demo/full content split with a CI diff, and Electron shell are the templates. From the first content commit, content past the first year lives in `*.full` modules with `*.demo` twins, and the first year is whole on its own with a last card.

### D18. Interiors: walkable, generated from templates by building type, phased in. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Walkable and generated, phased in; chosen. Exteriors walkable and every interior a scene and panel (Dirtbag's form indoors). Only the home walkable.

**Consequences.** Release one: homes, the restaurant, the precinct and courthouse, the hospital and the school as walkable cutaway interiors; other businesses open as a counter scene until their template exists. Fallback if the art spike fails its kill criterion: interiors as scenes inside the isometric city.

### D19. Prison: time passes with sparse choices. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Time passes with sparse choices; chosen. Playable prison life, a second game. A summary card only.

**Consequences.** A prison job, visits, letters, a parole hearing, a standing meter with factions; health and skills drift. Outside, rent lapses, relationships cool, a business runs or fails without you. Not a playable world.

### D20. The heir: a child of 18 or over, then a spouse, then a close tie; a ward skips to 18. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** This order with the ward rule; chosen. Any household member, no age rule, no skip. Blood descendants only.

**Consequences.** A child under 18 becomes a ward of a named guardian and the save skips to their 18th birthday with a summary of the years. If nobody qualifies the chronicle closes and a new life can start in the same city, which keeps its state. What carries: money and property less debts and probate, the home if owned, the family's reputation by name, relationships by proximity, nothing of skills.

### D21. Start at 18 with a background pick; the free first year is in-game year one. LOCKED, 2026-10-18 (Evan's call)

**Options considered.** Age 18 with a background pick (family means, district, schooling outcome); chosen. Full creation at any adult age with money and history. Starting as a child or teen.

**Consequences.** Childhood is lived only by heirs born in-game, which bounds the education systems at launch. The unlock comes at the first in-game birthday.

### D22. Docs first; code only after Phase 0's gates are written and agreed. LOCKED, 2026-10-19 (Evan's call)

**Options considered.** Write the design docs now and continue the brainstorm on top of them; chosen. Keep brainstorming in chat first. Stop for the day.

### D23. Bootstrap: one push to `main` for the first commit; all later work on a branch with a pull request. LOCKED, 2026-10-19 (Evan's explicit yes)

**Why.** The remote was empty, so the first push created the default branch, and a pull request needs a base. The first commit on `main` holds only the README and `.gitignore`; the design docs arrived by pull request.

### D24. The title. OPEN, 2026-10-19 (Evan's call)

"Live Your Life" is a working name. The docs and the repository use it as a placeholder; the package id waits on the title.

### D25. Art: smooth vector drawn in code, Dirtbag's Mix extended to isometric. LOCKED, 2026-10-19 (Evan's call)

**Options considered.** Smooth vector; chosen: it scales freely for the zoom-only camera, the comic line and flat colour exist in Dirtbag's painters, and aging and outfits are parameters. Pixel art rendered procedurally: the classic isometric register, integer zoom steps and pixel snapping, harder to draw in code at variety.

### D26. The calendar: 365-day years, four parts of the day, meteorological seasons. PROPOSED, 2026-10-19

Built with M0.1 in `packages/sim/src/calendar.ts`; Evan's to accept or change.

**Proposal.**
- One tick is one game minute, read through the engine's calendars.
- Every year has 365 days, with the real months; there is no 29 February.
- Parts of the day: morning from 06:00, afternoon from 12:00, evening from 18:00, night from 22:00 through to 06:00.
- Seasons by the weather, not the solstices: spring from 1 March, summer from 1 June, fall from 1 September, winter from 1 December.
- Weekdays are anchored on 1 January 2025, a Wednesday.
- A default life starts on Monday 2 June 2025 at 07:00, the first weekday after a school year ends (tune). A background pick (D21) will set its own start.

**Why.** The engine's calendars have no leap years by design: whole-number arithmetic, the same on every device (engine `docs/specs/time.md`). Working around that would mean a calendar of the game's own beside the engine's. Meteorological seasons are the ones weather follows, and the body model reads the cold.

**Cost.** Weekdays match the real ones until 2028's skipped 29 February, then run a day early for each one skipped. Nobody in the game is born on 29 February.

**Options considered.** This proposal. A leap-year calendar of the game's own, which duplicates the engine's and needs a rule for 29 February birthdays. Astronomical seasons (21 March and so on), which put the first cold weeks of December in fall.

### D27. The art spike builds two interiors: a diner and a studio flat. LOCKED, 2026-10-19 (Evan's call)

**Decision.** M0.3's scope named one interior with a cutaway. It builds two, both from templates.

**Why.** The kill criterion asks a stranger to find someone working and someone sleeping, and those happen in different buildings. The second interior is a second template, not a second system.

**Options considered.** Two interiors; chosen. One, the diner, with the sleeper outside on a bench, which reads as homelessness and is a tone choice. One, the flat, with the worker outside at the diner's door, a weaker reading of "working".

### D28. How the art spike's kill criterion is judged. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The game as designed, with bubbles on. One stranger's answers decide, as the criterion is written; up to three are asked and each is recorded. A screenshot with posture only, no bubbles, is shown first and recorded as a second reading.

**Why.** DESIGN.md gives emotion to posture, bubbles and the chronicle, not to faces, and speech bubbles are part of Dirtbag's Mix (D25). Showing posture only first keeps the bubbles from leading that answer.

**Options considered.** Bubbles on, one stranger; chosen. Posture only, a stricter test of the figures alone. Bubbles on with three strangers who must all pass, a stronger reading that changes the criterion as written.

### D29. The art spike replaces the placeholder page. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The game's page becomes the spike: the block, full screen, with its controls.

**Why.** The installed app opens to it, which is the simplest way to take the fps reading on a phone and to show a stranger. Whatever the kill criterion decides, the isometric city view stays (D18's fallback moves only interiors into scenes), so the page is not thrown away.

**Options considered.** Replace the placeholder; chosen. A separate page under `/spikes/art/`, as Engine-Builder serves its 3D spike, kept out of the offline cache.

### D30. Tier-1 people are moved on once a day, a twenty-fourth of them each hour. PROPOSED, 2026-10-19

Built with M0.4 in `packages/sim/src/people/`; the readings are in [research/population.md](research/population.md). It answers DESIGN.md's open question on cadence. It is a cost choice, not a product one: off screen, nothing the player sees changes. Evan's to accept or change.

**Proposal.** The people are kept in 24 shares. Each game hour one share is moved on a whole day, its needs settled once for each run of one activity (a schedule block), its ties from that day's meetings. On screen, a person runs every tick (DESIGN.md, People).

**Why.** The kernel copies and freezes a module's whole slice in every action that writes to it. At 1,000 people with the CPU slowed four times, that copy is 15.4 ms of an hourly batch's 22. A share is a twenty-fourth of it. The staggered batch is 4.2 ms on average, 7.9 at the 95th; moving everyone every hour is 22 and 37.5, and a whole day at midnight 47 and 55. The levels and ties come out the same at every cadence; the tests hold them to that.

**Cost.** A person off screen can be up to a day behind. When one is met, their state is settled to the minute from their plan, as the player's levels are (M2.2). Like the hourly cadence, it fires a timer every hour, so the engine's cap of 10,000 firings an advance means one action passes at most about 416 days.

**Options considered.** Staggered; proposed. Everyone every game hour: DESIGN.md's first proposal, five times the cost at 1,000 people. Everyone once a day at midnight: one write a day, but the largest batch.

### D31. The tier-1 count: 1,000. LOCKED, 2026-10-19 (Evan's call)

M0.4's [you] gate. The readings are in [research/population.md](research/population.md), at D30's cadence, with the CPU slowed four times in headless Chromium.

**Decision.** 1,000 tier-1 people (tune), the recommendation. It is the top of D10's range. Its batch is 7.9 ms at the 95th, a quarter of a 30 fps frame, and 18.4 ms at worst. A month passes in one action in 1.05 s, and the people take 187 kB of a save.

**Consequence.** It is a ceiling, to re-measure at M2.2 when people hold their real state, and cut to 500 if that reading needs it.

**Options considered.**

- 500: 5.7 ms at the 95th, 10.6 at worst, 0.56 s a month, 93 kB. The most room for M2.2.
- 1,000: recommended.
- 3,000: 17.1 ms at the 95th, over a 60 fps frame already; 49.7 at worst; 2.87 s a month; 601 kB.
- A few dozen, risk 2's fallback. Not needed: at 500 the batch is inside the frame budget (research/population.md, "Risk 2's verdict").

### D32. The slice's block is one side of one street. LOCKED, 2026-10-19 (Evan's call)

**Decision.** M1.1 generates 6 to 8 lots (tune) on the far side of one street, their fronts to the camera. Among them are the slice's buildings: the apartment house, the diner, and a corner shop for M1.5's shoplifting. The near side stays open, a verge or a car park, so nothing hides the street.

**Why.** The camera is fixed (D7), so on any street the side nearer the camera shows its backs and hides the street. The slice needs one street that reads, not a city. How the city deals with the near side is M2.1's question (ROADMAP, open questions).

**Options considered.** One side of one street; chosen. Both sides, the near side drawn from the back and cut to sill height while the player is on the street, as Project Zomboid hides what stands in front: the answer M2.1 needs anyway, built and tested now, with more stage work. A whole block, four streets and an alley with corner lots: closest to M2.1's generator, needing the near-side cut too, and mostly off screen at 390 px.

### D33. The page stays M0.3's spike until its gates are taken. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The live page draws exactly M0.3's art spike, so the phone reading and the stranger test still measure what they were written for, and the tester brief's links still work. M1.1's generated block draws on the same page with `?block=generated`. It becomes the default once M0.3's gates are taken.

**Options considered.** Keep the spike for now; chosen. Replace it now, with the spike kept at `?spike=1` and the tester brief's links changed to it.

### D34. The slice's flat is a ground-floor studio with a bathroom, off the stair hall. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The player's apartment is a studio on the apartment house's ground floor: one main room with a bed, a kitchenette, a table and a couch, and a bathroom with a shower. It opens off the building's stair hall. The stairs are drawn, but nobody climbs them yet.

**Layout, proposed with it.** The hall runs from the front door to the back, down the middle of the building, with a studio on either side. The player's is one of the two, by the seed. The other is a neighbour's, furnished from the same rooms.

**Why.** It is the smallest home that is real. M0.2's wash gets its shower. Someone at the wage floor rents a studio or a room, not a one-bedroom (CALIBRATION.md, bar B2). And a ground floor needs no levels in the walk grid or the cutaway.

**Options considered.** A ground-floor studio with a bathroom; chosen. A ground-floor one-bedroom: roomier, but more than bar B2 says the floor of the market affords alone. A studio upstairs, up walkable stairs: it needs a cutaway by storey and a walk grid with levels. The hospital and school will need those later, but they would make M1.2 about twice the work (an estimate).

### D35. The diner keeps its line and counter and gains a back room with a back door. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The diner keeps the spike's room: the kitchen line behind the counter, stools along it, tables by the windows. Behind it is a back room with the dish pit and dry storage, a staff toilet, and a back door to the yard and the alley, for staff and deliveries.

**Why.** It is where M1.3's line cook works, and it is how a real diner's back of house runs: staff come and go by the back, the dishes are washed there and the stock is kept there. The back door also gives the alley a second way in, for deliveries and later for crime.

**Options considered.** The line, the counter and a back room; chosen. The spike's one room, with everyone using the front door. A closed kitchen, the line behind a wall with a pass window and a swing door; the cutaway would show it anyway.

### D36. One walker on the commute at `?block=generated`. LOCKED, 2026-10-19 (Evan's call)

**Decision.** A person from the seed walks from the flat's bed to the diner's griddle and back on the walk grid's routes. The building they are inside or behind is cut away.

**Proposed with it.** They walk at a walking pace in the stage's seconds, not the game's minutes, until M1.6 settles how walking time and the clock relate (ROADMAP, open questions).

**Why.** It shows in the browser that both interiors can be walked, door to door, and it gives a frame-rate reading with someone moving. M1.6's tap-to-go reuses the route following.

**Options considered.** One walker on the commute; chosen. Nobody until M1.6, with the routes checked only in tests.

### D37. The city borrows Michigan's tax and law. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The fictional city is in Michigan for everything a state decides: the minimum wage now, income tax from M1.3, and the theft law M1.5's shoplifting follows.

**What follows.** Michigan's minimum wage was $12.48 an hour from 21 February 2025, so bar B2's floor is that. Its income tax is a flat 4.25%, less $5,800 a year for each exemption. About two dozen Michigan cities levy an income tax of their own under the Uniform City Income Tax Act, most of them the old industrial ones, and the city is one of them (D38). The line cook's wage comes from Michigan's restaurant cooks (CALIBRATION.md).

**Options considered.**

- Ohio, recommended: several Rust Belt metros of the right size, $10.70 in 2025, no state tax to $26,050 and 2.75% above it, and city income taxes everywhere.
- Michigan; chosen. A higher wage floor makes bar B2 harder to meet than in Ohio.
- Pennsylvania: the federal $7.25, a flat 3.07%, local wage taxes.
- Indiana: the federal $7.25, about 3% flat, a tax in every county.

### D38. Pay is withheld from M1.3: federal, Social Security, Medicare, Michigan and the city. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Each paycheck withholds what a Michigan employer withheld in 2025:

- federal income tax, by the IRS's percentage method for automated payroll (Publication 15-T), standard withholding;
- Social Security, 6.2% of pay up to $176,100 a year;
- Medicare, 1.45%;
- Michigan's income tax, 4.25% of pay less the exemption;
- the city's income tax.

**Proposed with it.**

- The city levies the Act's standard rates: 1% of a resident's pay less $600 a year, half that for people who work there and live outside. Most Michigan cities with the tax use them; Detroit's 2.4% and Grand Rapids' 1.5% are the exceptions (tune).
- The player files single with one exemption: an 18-year-old with no dependants.
- The taxes are content records (`packages/content/records/tax/`), and a career names the ones its employer withholds.
- Withholding is not the tax owed. The return, with its refund or bill, comes with the money milestone. The extra 0.9% Medicare on pay over $200,000 a year isn't withheld; nobody in the slice comes near it.

**Why.** Rent is paid from take-home pay. For the line cook it is about a sixth under gross (CALIBRATION.md).

**Cost.** The figures come from secondary sources. The build environment can't reach irs.gov, ssa.gov, michigan.gov or bls.gov, so each figure is marked in CALIBRATION.md to check against its primary source.

**Options considered.** Withhold now; chosen (recommended). Gross pay until the money milestone, written down as a departure, with the slice's money about 15% rich until then.

### D39. Two no-shows in 28 days end the job. LOCKED, 2026-10-19 (Evan's call)

**Decision.** A no-show, a shift signed up for and never started, is a warning. A second within 28 days, and you're let go. A warning lapses 28 days after it was given. Being late costs standing, but it isn't a no-show.

**Proposed with it** (tune). These are the employer's habits, tuned for play; there is nothing to calibrate them against.

- Standing runs from 0 to 100 and starts at 50.
  - A whole shift worked on time adds 2.
  - Starting more than 5 minutes late takes 4.
  - Missing more than 30 minutes of a shift once there takes 6: leaving early, or a long break.
  - A no-show takes 15.
  - Dropping a shift a day or more ahead takes 1.
- Standing at 0 also ends the job, so lateness adds up to something.
- Standing sets how many shifts you're offered: 3 a week at 0, 6 at 100.
- Let go means let go in M1.3. Finding the next job is M2.3's labour market.

**Options considered.** Two in 28 days; chosen (recommended), as in VOICE.md's "Two no-shows in a month". Three, as in Dirtbag: two warnings, then the third. One, and the job ends at once.

### D40. A shift event pauses the shift for a choice. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Mid-shift, the routine stops (DESIGN.md: interruptions are the play) and you choose. Each choice shows its odds and what it risks. You go back to work when you choose to.

**Proposed with it** (tune).

- At most one event a shift, in about half of them, at a minute drawn when you sign up.
- The pool is shared by tag (D9):
  - a career lists the tags it draws from, and an event the tags it belongs to;
  - an event's condition (`when`) is checked against the game's facts when it is drawn;
  - events are weighted and drawn without repeats until every event the career can draw has come up: a deck, as in Rule or Drool.
- A choice is either certain or has odds, between 5% and 95%:
  - a base chance;
  - points added at full skill;
  - points taken away when exhausted.

  The preview a player is shown and the roll come from the same function, and the roll is the engine's `roll`.
- Certain choices are listed before chancy ones, so the gamble is never the first thing a thumb lands on (Landnám's rule).
- An outcome can:
  - change standing, skill, needs and cash;
  - send you home, with nothing lost for the rest of the shift.
- The events are drafts for the voice pass (M2.10).

**Why.** Dirtbag's audit found that random effects on a shift, unannounced, "read as arbitrary".

**Options considered.**

- A choice that pauses the shift; chosen (recommended).
- Told after the shift, for the chronicle: fewer taps, and no play.
- Small events told and big ones asked, with a rule in each record for which is which.

### D41. The slice's coworker is the other line cook. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The slice's one relationship is with the other line cook at the diner. Who they are comes from the seed: a name from the city's name pool, the pronouns that go with it, and an age.

**Proposed with it** (tune).

- They work five days a week, with two days off drawn from the seed each week.
- The diner pairs its two cooks: on a day they work and you're on, they're on your shift. That is about five of your shifts in seven.
- The shift events about them are drawn only while they're beside you, and they name them. "The rush" and "Short-handed" keep "the other cook" for the days they're off.

**Why.** You share the line most days, and the shift events already had "the other cook" in them.

**Options considered.** The other line cook; chosen (recommended). A server: tips, customers and the floor come with a server's career later. The owner: standing already stands for what the owner thinks of you.

### D42. Your acts reach them through shift events and favours. LOCKED, 2026-10-19 (Evan's call)

**Decision.** What you choose in a shift event they're part of is an act they remember. So is not showing up for a shift they're on, or showing up late. And there are favours both ways: they ask you to cover a shift, and you can ask them to cover yours.

**Proposed with it** (tune).

- They ask on about one day in ten. The shift is one of theirs two to six days ahead, on a day you're free and with room in your week.
- A request waits for your answer until the day before its shift. Never answering is an act of its own.
- You can ask them to cover a shift of yours on one of their days off, before it starts, once for each shift. If they say yes, the shift is theirs and your standing loses nothing: a swap the owner doesn't mind.

**Options considered.** Shift events and favours; chosen (recommended). Shift events only, with regard changing nothing yet. Events, favours and a verb to talk on a break or after a shift, the start of M2.6's social verbs.

### D43. Regard changes what they'll do for you. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Regard sets the odds that they cover a shift you ask them to, and the odds of event choices that lean on them, such as asking them to take your eggs in a rush. Standing stays the owner's alone.

**Proposed with it** (tune). Regard runs from 0 to 100 and starts at 50. A choice's odds gain a share of its regard points: all of them at 100, none at 50, and they lose all of them at 0. Asking for a cover starts from even odds, with 50 regard points either way. All odds stay between 5% and 95% (D40), and the preview the player sees is the roll's.

**Options considered.** What they'll do for you; chosen (recommended). That and your standing, as the owner hears from them: closer to a real kitchen, but it counts one thing twice. Nothing yet: remembered and shown only, until M2.6.

### D44. They remember kinds of act, as in Ludus. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Each act moves regard by its weight, every time it happens. It is remembered by its kind: what it was, the day it last happened, and how many times. A repeat counts up rather than piling up, and the last 8 kinds are kept. Each kind has the line they remember it by, such as "You covered her Saturday close." (Ludus's `REGARD` and `remember()`).

**Proposed with it** (tune). Familiarity is apart from regard. It grows with minutes on the line beside them, more slowly the more there is: half at 40 hours. Nothing fades yet.

**Options considered.** Kinds of act; chosen (recommended). Every act with its day, up to 30: a fuller chronicle, bigger saves, repeats piling up. A number only: the cheapest, with nothing to say what is between you.

### D45. Shoplifting happens in the corner shop, a third walkable interior. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The corner shop gets an interior from the same records as the flat and the diner: aisles of shelves, a till, a clerk behind it. Who sees you depends on where you stand. This answers ROADMAP open question 20.

**Proposed with it** (tune).

- The clerk sees along the walk grid in straight lines from the till, and shelves block sight.
- A camera covers cells of its own, fixed by the interior record.
- The odds of being noticed come from what sees your cell: the clerk, a camera, both, or nothing. They are shown before you take anything, and they are the odds rolled.

**Options considered.** A corner-shop interior; chosen (recommended). A counter scene (D18's fallback): cheaper, but sight lines become a number rather than a place.

### D46. The law answers both ways, as it does in Michigan. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Caught in the act, the clerk holds you and the police write an appearance ticket with a court date. Seen only on camera, the police come later, at a time you are shown first (Spliceworld's rule: no ambush). Theft also leaves heat: what the shop remembers of you.

**Proposed with it** (tune).

- **When the police come.** Held in the act: they come in 20 to 40 minutes. Seen on camera: the shop reviews the footage at close, and a visit is scheduled 2 to 5 days later. You are told it is coming, and when.
- **The court date.** The appearance ticket sets one 2 to 6 weeks on. Missing it is a bench warrant.
- **Heat.** Heat at a shop raises its odds of noticing you, and halves every 7 days.
- **The offence.** Goods under $200, with no prior conviction, are retail fraud in the third degree, a misdemeanour: up to 93 days, and a fine of $500 or three times the value, whichever is greater (MCL 750.356d). A prior conviction makes it the second degree.
- **Civil demand.** Apart from the court, the shop can claim damages: the value of anything not recovered, plus ten times the retail price, at least $50 and at most $200 (MCL 600.2953). It comes as a letter, and an unpaid one goes to collections at M2's money.
- **How often a thief is caught.** The figure usually cited is once in 48 thefts, with half of those caught handed to the police. It comes from shoplifters' own reports (NASP), so it is a weak anchor. A walkable shop with one clerk will catch more; the departure is written down beside it.

**Found while building, proposed with it** (tune).

- **The bar.** A shop that catches you, in the act or from the footage, bars you for good, as a trespass notice does. Without it, the thief bot was held at the same till twenty times in eight weeks and owed $15,000 in civil demands.
- **What it is charged as.** A theft is charged when the ticket is written, from its value and the convictions already on the record: a prior conviction makes it the second degree (MCL 750.356d).
- **One visit at a time.** A visit that falls while you are held or in court comes the next day instead, with a new notice. Otherwise an arrest could stack on a hold and leave no way out.

**Options considered.** Both ways, as real; chosen (recommended). Only in the act: no delayed consequence, which D7 leans on. Only later: loses the moment of being held.

### D47. A first offence is fined, or offered HYTA. LOCKED, 2026-10-19 (Evan's call)

**Decision.** At the court date you plead. A first offence under 26 is offered Michigan's Holmes Youthful Trainee Act: probation, and no public record once it is done. Otherwise, a later offence or a broken probation leaves a conviction on the record, with fines and costs.

**Proposed with it** (tune).

- The hearing is a scene at the courthouse, with its outcome shown as it would be decided. Its odds and costs come from the preview.
- **HYTA.** Probation lasts 6 months with a monthly fee. A new offence or a missed check-in ends it, and the conviction enters.
- **The record.** It is a fact the rest of the game can read: M2's hiring and housing read it.

**Options considered.** A fine, or HYTA if offered; chosen (recommended). A fine and a record every time: harsher than Michigan treats an 18-year-old's first theft. Court as a summary letter: the cheapest, with no courthouse in the slice.

### D48. Anything can be stolen, and a fence buys it. LOCKED, 2026-10-19 (Evan's call; I had recommended food and small goods, with no fence yet)

**Decision.** The shop's goods are records with a retail price. What you take goes into an inventory: the engine's inventory kit. Food can be eaten. Anything can be sold to a fence for a share of its value.

**Proposed with it** (tune).

- **Who the fence is.** A person drawn from the seed, found at one place on the block at set hours. The place waits on M2.1's city, so for the slice it is the back of the diner's lot after close.
- **The fence's share.** About a quarter of retail. The figure comes from a source in CALIBRATION.md, or is marked as a departure.
- **Selling is a crime of its own.** Selling stolen goods has odds too, low for the slice. The fence's own risk waits on M2's crime ladder.
- **Crime should never pay better than work (D7).** It is held to a reading, not assumed: the bots' sweeps compare a week of theft and fencing with a week of shifts, money against the expected fines, costs and lost shifts.

**Found while building, proposed with it** (tune). Each shelf holds one line of goods, rotated by the block's seed, and every good is on one shelf. Offering every good on every shelf made a turn 62% dearer: the engine checks each option it offers, and the shop offered 53.

**Why I recommended against.** A fence brings an economy the slice doesn't have: goods with prices, a buyer, a place, and the risk that crime pays. Evan chose it to open the crime ladder now.

**Options considered.** Food and small goods, no fence (recommended): theft saves money rather than makes it. Anything, with a fence; chosen. Food only: theft only from need.


### D49. A brisk walk, and the clock runs while you walk. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The clock runs at its speed while you walk, as it does in The Sims. People walk about three times a real pace on screen, so the 42.5 m commute from the flat to the griddle takes about 20 game minutes. This answers ROADMAP open question 18, as D10 allows: distances and commutes are tuned for play.

**Proposed with it** (tune). People walk 3.9 m a stage second on screen, three times 1.3. The sim hears only that you arrived, and the time the walk took has passed on the clock as any time does.

**Options considered.** Brisk walk, clock runs; chosen (recommended). Real pace: a walk costs half a game minute, so people cross the block in a blink. The clock slowed to real time while you walk: natural on screen and in game minutes, but the clock's speed changes under the player.

### D50. The HUD is one compact bar, with panels on tap. LOCKED, 2026-10-19 (Evan's call)

**Decision.** One bar, sized for 360 px:
- the time and speed;
- the cash;
- the two lowest needs;
- a badge when something waits on you: a favour asked, a notice from the law, a court date, a shift choice.

Tapping opens a panel with all six needs, the week's shifts, and what is pending, each with its day.

**Options considered.** A compact bar, panels on tap; chosen (recommended). All six needs always, as The Sims shows them: nothing hidden, but a fifth of a portrait screen. Text cues only: earnest, but hard to plan a day by.

### D51. The playable life is the page, with a map of the block now. LOCKED, 2026-10-19 (Evan's call; I had recommended leaving the map for M2.1's city)

**Decision.** The playable life on the generated block becomes the default page. M0.3's art spike moves to `?spike`, so its open gates can still be taken there. The map is in now: the block seen from above, its places named, tap one to go there.

**Why I recommended waiting.** With one block, the map shows what the screen already does. Building it now sets its shape before the city it is for exists (M2.1). Evan chose to set it now.

**Options considered.** The life as the page, the map later (recommended). The life as the page, the map now; chosen. Keep the spike as the page, the life at `?life`: the safest for the art test, but the life is harder to find.

### D52. The chronicle is a journal, with each entry shown once as a line. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Each entry shows briefly as one line at the foot of the screen, then lands in a journal you can read back by day. Entries are third person, past tense (VOICE.md). Lines name people rather than use "she" or "they" as the subject, as M1.4's lines do, so no verb has to agree (ROADMAP open question 29).

**Proposed with it** (tune).
- **Your name.** Third person needs a name for you. Until the background pick at the start (D20) is built, it is drawn from the seed and the name pool, as the coworker's is.
- **The lines are content.** Each comes from a line record keyed by what happened, with its placeholders filled. Something that happens with no line is a failing check, not a silent gap.

**Options considered.** A journal plus one-line toasts; chosen (recommended). A running feed of the last three entries over the city: keeps the drama in view, but covers the picture on a phone. The journal only: quietest, and entries are easy to miss.

### D53. The game lives on life.rcjlabs.com, before any save is kept. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Saves wait for a domain of the game's own, and the domain carries no title: `life.rcjlabs.com`, served from the root path. A browser keeps storage per origin, so a save made on `rcjlabs.github.io` would stay behind when the game moved, and the TWA's `assetlinks.json` has to sit at an origin's root (ROADMAP open question 9). A subdomain without the title outlives any change to it (D24).

**Proposed with it.**
- **The ids in storage.** Saves are kept under the engine's keys, `eb/live-your-life/full/`, from the project's id. Storage keys are never renamed, so these stay whatever the game is called.
- **The switch.** Evan adds the record (`life` CNAME `rcjlabs.github.io.`) and sets the custom domain in the repo's Pages settings; the build's base path becomes `/`.

**Options considered.** Saves on `rcjlabs.github.io` now, with save codes to carry a life across later: saves sooner, one manual step for each player at the move. Saves there with a warning they may reset: least work, loses testers' lives at the move. The domain first; chosen. Then: a subdomain without the title; chosen (recommended). One named for the title: reads better in a listing, moves again if the title changes. Settle the title first: M1.7 waits on it.

### D54. Saves are automatic, and a slot is one life. LOCKED, 2026-10-19 (Evan's call)

**Decision.** There is no saving or loading by hand. The game saves after everything the player does and as time passes, so what happened stands: a conviction or a bad roll can't be undone by loading an earlier save, which is what D7's consequences rest on. Three slots hold three separate lives.

**Proposed with it** (tune).
- **When it saves.** After every action but time passing; every game hour; and when the page is hidden or closed.
- **Ending a life.** A slot's life can be ended from the start screen, after a confirm, to free the slot.

**Options considered.** Autosave only, a few lives; chosen (recommended). Autosave plus saves by hand: familiar from The Sims, and every bad roll is undoable. Autosave with one point a day to go back to: still lets a player dodge an arrest.

### D55. The browser bot plays a steady week, and a thief's case. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The tap budget is read from a bot that plays the page by taps, as a player would, on a phone's screen with the CPU slowed four times. Its main reading is the everyday loop: sign up for shifts, eat, sleep, walk to work and work, pay rent. A second reading takes once from a shelf and plays until the case is over, because being held, a court date and a plea are taps too.

**Proposed with it.**
- **The bot's rules are the steady bot's** (`packages/sim/src/bot.ts`), with one addition the page needs: it sets off for the diner 40 game minutes before a shift, since the walk takes time the sim's menu doesn't know about.
- **What counts.** Taps, pans (the camera brought round to a place) and real minutes per game day. The bot takes no time to think, so its minutes are the least a player could spend.

**Options considered.** A steady worker plus a thief run; chosen (recommended). The steady worker only: cheaper, leaves the law's taps unmeasured. A random player: finds stuck states, but its count says little about a player's.

### D56. The tap budget is read before "run to the next thing" is built. LOCKED, 2026-10-19 (Evan's call)

**Decision.** M1.8 measures the game as it stands; speed 3 or a "wait until" (ROADMAP open question 39) is decided after, with the reading in hand (CLAUDE.md: measure before tuning).

**Options considered.** Measure first; chosen (recommended). Build speed 3 first: one round fewer, but the reading never shows what it saves.

### D57. An alarm: what you do ends in time to walk to work. LOCKED, 2026-10-19 (Evan's call)

**Decision.** Sleep, and every other activity, ends a walk's time before your next shift, not at its start. M1.8's reading put the steady player late for all 12 of its shifts, by 7 to 85 minutes, because sleep ran to the shift's start and the walk to the diner takes about 20 game minutes (D49); the thief, living the same way, was let go.

**Proposed with it** (tune).
- **The walk set aside is 30 game minutes**, the longest flat-to-diner walk the slice's blocks give (12 to 30). The sim doesn't know where your flat is yet (ROADMAP open question 43); when it does, the walk is your own.
- **Within the walk of a shift**, an activity still runs to the shift's start: being late is then a choice made with the clock in view.

**Options considered.** An alarm; chosen (recommended). Speed 3, run to the next thing: larger, touches the loop and the bar; still possible later. Both now. Leave lateness to the player: realistic, but the reading says a steady player is fired within weeks without knowing why.

### D58. The bed and the court say when you're due. LOCKED, 2026-10-19 (Evan's call)

**Decision.** During a shift, the bed's menu says you're due at the diner, and sleep ends when the shift does rather than running through it to the next one. On the morning of a court date, a line says you're due in court by noon, and to go from the panel. Both traps caught the browser bot (ROADMAP open questions 50, 51).

**Options considered.** Each was offered on its own, or neither until the playtests; both were chosen (recommended).

### D59. The tap budget waits for the playtests. LOCKED, 2026-10-19 (Evan's call)

**Decision.** The bot's taps a day are kept as a reading, not a gate, until M1.9's playtests give a player's number to set it from. The reading is a median of 16 taps a day, 29 at most, against Dirtbag's 20.

**Options considered.** A median of 20 or fewer with no day over 35 (recommended): today's reading passes and a change that adds taps fails. Hold today's 16 and 30. Decide after the playtests; chosen.

### D60. The alarm drops the clock to 1×. LOCKED, 2026-10-20 (Evan's call)

**Decision.** When the alarm goes off, a walk's time before a shift (D57), the page sets the clock to 1×, once for each shift, with a line saying it's time to walk to the diner. With the alarm alone, the browser bot was still 8 to 13 minutes late to nearly every shift, because at 4× a real second is 8 game minutes; the thief was let go after 8 late starts in a row (ROADMAP open question 53).

**Options considered.** Drop to 1× at the alarm; chosen (recommended). A 45-minute alarm: the smallest change, with time to wait at the diner. Lateness under a quarter of an hour not counted against standing: changes the job's rules, not the clock.

### D61. The alarm sets aside your own walk to work. LOCKED, 2026-10-20 (Evan's call)

**Decision.** The alarm (D57) sets aside the walk from your bed to where you work, as the page measures it on your block at D49's pace, and 10 minutes more (tune). With D60's drop to 1× and a fixed 30 minutes, the browser bot was still 6 minutes late to most shifts: the walk to the griddle on those blocks is about 36 game minutes, longer than the 30 set aside.

**How.** The walk is the stage's to measure, as movement is (CLAUDE.md): the page routes from your bed to the griddle once and tells the sim, `you/commute`, a verb only the stage sends. The sim keeps it in your slice, now at version 2, with a migration; until the stage has said, the alarm sets aside 30 minutes. When M2.2 puts your home in the sim (ROADMAP open question 43), the sim can measure it itself.

**Options considered.** Your own walk; chosen (recommended). A fixed 45 minutes: one line, wrong on a block with a longer walk. Leave 30: six minutes late stays the player's to fix, and the bot is still let go.

### D62. A court alarm: on a court day, what you do ends when the court opens. LOCKED, 2026-10-23 (Evan's call)

**Decision.** On the day of a court date, sleep and every other activity end at 08:00, when the court opens, the clock drops to 1× and the morning's line says you're due by noon, as a shift's alarm does (D57, D60). Work is not cut short: leaving a shift for court is the player's to choose. With the line alone (D58), the browser bot's thief still missed court once: a night's sleep ran through the window in one step, with no moment to act.

**Options considered.** A court alarm; chosen (recommended). A warning in the bed's menu only: sleep still runs its length. Leave it: oversleeping a court date is a real consequence.

### D63. The first two districts are the inner ring and downtown. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Of DESIGN.md's districts (downtown, old industrial, inner ring, suburbs, a commercial strip), the inner ring and downtown are walkable in Phase 2; the rest exist as statistics (cut ladder). The slice's block (walk-ups, the diner, the corner shop) is inner ring; downtown brings the courthouse and the precinct the law already needs, and later the hospital.

**Options considered.** Inner ring and downtown; chosen (recommended). Inner ring and old industrial: grittier, the institutions stay panels. Inner ring and suburbs: the contrast of means, but car-dependent before M2.9's travel.

### D64. The near side of a street is cut to sill height near you. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Buildings between the fixed camera and you are drawn cut down to their window sills while you are close, as Project Zomboid hides what stands in front. Answers ROADMAP open questions 16 and 19 for M2.1's city.

**Options considered.** Cut to sill height; chosen (recommended). Fade them: a faded facade is muddy on a phone. Keep the near side of each street low: no drawing rule, but every street looks half built.

### D65. The whole city is generated from the start. LOCKED, 2026-10-23 (Evan's call; I had recommended starting at about 12 blocks a district and growing by the readings)

**Decision.** M2.1 generates every district's streets and lots from the seed at once, with two districts walkable (D63). Its cost has not been read: the largest reading so far is one block. M2.1's first gate is the reading of the whole city's generation time, memory and save size on a phone profile; if it doesn't fit, the fallback is to generate districts as they're reached.

**Options considered.** Set by readings, starting at about 12 blocks a district (recommended). The whole city now; chosen.

### D66. The city is Ridgefield. LOCKED, 2026-10-23 (Evan's call)

**Decision.** The fictional city's name is Ridgefield (the open item since D15). It lives in one content record, so signs, the map and the chronicle read it from there.

**Note.** Small towns named Ridgefield exist in Connecticut, Washington and New Jersey. CLAUDE.md's out list bars real places; this city is a Rust Belt city of 250,000 to 400,000 (D4, D14), not any of them. The content lint's blocklist should not list it, and a store listing should not tie it to a real state.

### D67. The slice's block stands whole in the city. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Your life's block, with your flat, the diner and the corner shop, is planned from its own seed as M1.1 planned it, and stands as one face of an inner-ring block: the one nearest downtown whose lots it fits. A save from before the city gains that address by a migration. The walk to work stays on that block. Spreading homes, workplaces and shops across the city waits for M2.2's households and M2.3's careers.

**Options considered.** The slice's block kept whole (recommended, chosen): the smallest migration, and the job, the shop's crime, the alarm's walk (D61) and the bot's readings stay as they are. Spread across the city: your flat, the diner and the shop as generated buildings on different faces, with the commute across blocks; more of a city now, a larger migration, and D61's walk and the bot's readings re-taken. Spread two blocks apart: the commute crosses streets, while the walk stays short.

### D68. The tier-1 people are spread across the city. LOCKED, 2026-10-23 (Evan's call; I had recommended those nearest your block)

**Decision.** M2.2's 1,000 tier-1 people (D31) come from every district, by its share of the city's people, with homes on its lots and work at its workplaces. Most live where you can't yet walk (ROADMAP open question 60); they are met as the city opens up.

**Options considered.** Nearest your block (recommended): the people you can meet on foot are the ones simulated in full. Spread across the city (chosen): truer to the city as a whole. Re-measure first: build on real buildings and decide the spread from the reading.

### D69. The tier-1 people walk the town. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Anyone whose hour puts them within the town round your block is drawn there, walking or standing where their plan says. The frame rate is read again with them.

**Options considered.** In the town (recommended, chosen). The sim only, the streets empty until travel (M2.9).

### D70. The coworker and the fence become tier-1 people. LOCKED, 2026-10-23 (Evan's call)

**Decision.** The coworker (M1.4) and the fence (M1.5) are two of the 1,000, with homes and hours like everyone's, and keep their names, regard and memory. Saves from before migrate, with a version bump and a fixture (CLAUDE.md, Saves never break). Answers ROADMAP open questions 31 and 38.

**Options considered.** Now, with a migration (recommended, chosen). Later, with no save change this milestone.

### D71. A tier-1 person keeps 12 ties, not 24. LOCKED, 2026-10-23 (Evan's call)

**Decision.** With the 1,000 people in a life, a save was 172 kB and took 224 ms to write with the CPU slowed four times, against 4.8 kB and 28 ms before; three quarters of it was ties, 24 a person of two numbers each. A person now keeps 12 (tune): their strongest, the weakest forgotten sooner. All 1,000 stay.

**Options considered.** Fewer ties a person (recommended, chosen). 500 people, revisiting D31. Saving less often than after every action (D54), at more risk of a reload undoing a choice. Accepting the cost until Evan's phone reads it.

### D72. Tier-2 passers-by fill the town's sidewalks. LOCKED, 2026-10-23 (Evan's call)

**Decision.** With the 1,000 tier-1 people spread across the city (D68), someone was in view in the town for 12 minutes of a day. The page now also draws passers-by: anonymous people walking the town's sidewalks, as many as the hour and the district's density give (tune), more at the rush hours and few at night. They are the city's statistics (D9) made visible and hold nothing in the save; meeting one, and their becoming tier-1, is a later milestone's.

**Options considered.** Tier-2 passers-by (recommended, chosen). More of the tier-1 people's errands and evenings out drawn: true to the sim, still sparse. Tier-1 homes nearer you, revisiting D68. Empty streets until travel and more of the city open up.

### D73. Careers are worked anywhere in the city, off screen. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Each career is worked at a workplace on one of the city's lots (M2.2's places). You can walk only your own town until travel (M2.9), so going to work elsewhere is a choice on the map. It costs the real walking time on the street network (walks.ts), and the shift plays as a block of time with its shift events, as sleep does. Afterwards you are back at your door. The diner and the corner shop stay walkable; a job there is worked as now.

**Options considered.** Anywhere, worked off screen (recommended, chosen). Only careers whose building stands in your town, which leaves the 30 to what a seed puts near you. Pulling M2.9's travel forward and drawing a town round any block, a milestone's work before any career.

### D74. You are hired through openings and applications. LOCKED, 2026-10-23 (Evan's call)

**Decision.** The labor market is Gridiron Eras' employer model. The tier-1 people hold careers from the same catalogue. Openings come up at the city's workplaces when one of them leaves, at real-shaped turnover rates (tune), and a Jobs panel lists them. You apply, and the odds are shown first, from the requirements you meet, your record and your reputation. The answer comes in one to three days, and the odds shown are the odds rolled. Being let go, or quitting, leaves you looking, never ends the life. Reputation follows you from employer to employer.

**Options considered.** Openings and applications (recommended, chosen). Hired on the spot by any career whose requirements you meet. Openings that come and go, with no hiring roll.

### D75. The first 30 careers are entry-level, and you hold one job at a time. LOCKED, 2026-10-23 (Evan's call)

**Decision.** The first 30 are what someone of eighteen with a diploma can get in a Rust Belt city in their first year: food service, retail, warehouse, cleaning, care aides, trades helpers, security, call centres and the like. Each has Michigan's wages, real shifts and real requirements, traced in CALIBRATION.md. You hold one job at a time; a second job is an idea for later.

**Options considered.** Entry-level, one job (recommended, chosen). The same 30 with up to two jobs at once. A spread up the ladders, with degree and licence jobs the first year can't reach, held by the tier-1 people and later the heir.

### D76. The line cook takes 15 applicants in 100. LOCKED, 2026-10-23 (Evan's call)

**Decision.** At one in two, a jobless bot was working in a median of 3.3 game days. The line cook's base odds drop to 15 in 100. A conviction's penalty drops from 25 points to 8, so a record still halves the odds, as in Pager's audit study, rather than sinking them to the floor of 5. At 15, the bot is hired in a median of 9.8 days, still quicker than the household survey's 9.6-week median spell of unemployment (not the same measure).

**Options considered.** 15 in 100 (recommended, chosen): near a callback rate times an offer rate. Longer answers. Fewer applications at once. Keeping one in two until the 30 careers are in.

### D77. M2.4 starts while M2.3 waits on its wages. LOCKED, 2026-10-23 (Evan's call)

**Decision.** M2.3's 29 careers need Michigan's wage figures, which the build environment can't reach (bls.gov is blocked by its network policy). M2.4 starts now; M2.3 stays open, its other [auto] gates passed, until the wages come and Evan plays a week of it.

**Options considered.** Start M2.4 early (recommended, chosen). Write the 29 careers with placeholder wages, marked to replace. Pause until the wages can be read.

### D78. The first crime toward the crew is street dealing. LOCKED, 2026-10-23 (Evan's call)

**Decision.** M2.4's crime is dealing: buy from a supplier, sell to buyers in the town, mostly at night, with witnesses, heat and the police's attention, on D13's ladder (dealing, then the crew, then the organization). Its quantities, prices, offences and sentences trace to Michigan's controlled-substance law and published figures in CALIBRATION.md, and it never glamorises (VOICE.md).

**Options considered.** Street dealing (recommended, chosen). Burglary: a felony that reaches prison, but leads to no crew. Robbery: violent, and harder to keep from glamorising; later.

### D79. You join a crew, then grow it. LOCKED, 2026-10-23 (Evan's call)

**Decision.** A tier-1 person who deals brings you in once your trust and heat allow; you work under them. Later you recruit tier-1 people you have ties with. Crews are named people, using the ties you already have.

**Options considered.** Join one, then grow it (recommended, chosen). Start your own from the first. The crew as numbers on a panel, with no named members yet.

### D80. You join the police as a sponsored recruit. LOCKED, 2026-10-23 (Evan's call)

**Decision.** Police officer is a career on the market, with real requirements (over 18, no felony). A hire is paid through a sponsored academy, time passing with its checks, then works patrol shifts. Patrol arrests come from the same crimes and case files as the crime side. Detective is a promotion by standing.

**Options considered.** Hired as a recruit (recommended, chosen). Patrol now, detective with M2.5's ladders. Crime first, the police in a milestone of their own.

### D81. Prison is a sentence, time, and parole. LOCKED, 2026-10-23 (Evan's call)

**Decision.** A felony sentence passes as days with sparse choices: a prison job, visits, letters, a parole hearing, and a standing meter. Outside, rent lapses and ties cool. The page passes it a day a frame (ROADMAP open question 65), never in one blocking action. Factions wait.

**Options considered.** Sentence, time and parole (recommended, chosen). County jail only, prison later. Full prison with factions.

### D82. The street trade is in cocaine. LOCKED, 2026-10-23 (Evan's call)

**Decision.** You deal cocaine, bought by weight from a supplier and sold in small amounts. Delivery or possession with intent, under 50 g, is MCL 333.7401(2)(a)(iv); possession alone is MCL 333.7403(2)(a)(v). Either is a felony that can reach prison (D81). Overdose and delivery causing death (MCL 750.317a) are left out of this milestone.

**Options considered.** Cocaine (recommended, chosen): it can reach prison, without an overdose system to write. Heroin or fentanyl: the most realistic trade for the region in 2025, with overdoses and the grimmest register. Unlicensed cannabis: low stakes, undercut by Michigan's legal dispensaries. An unnamed product: nothing real to trace.

### D83. Michigan's law is traced from secondary sources until the statute sites can be read. LOCKED, 2026-10-23 (Evan's call)

**Decision.** legislature.mi.gov and courts.michigan.gov are blocked by the build environment's network policy, as bls.gov is. The dealing offences, sentences, parole and bail are traced from secondary sources (law-firm summaries, NORML, benchbook excerpts, agency reports on other hosts). Each row in CALIBRATION.md is marked "secondary" until it is checked against the statute's text.

**Options considered.** Secondary now, recheck later (recommended, chosen). Wait for the hosts to be allowed, building the mechanics with empty offence rows.

### D84. Working under a dealer is being fronted. LOCKED, 2026-10-24 (Evan's call)

**Decision.** Once in the crew (D79), the dealer fronts you weight on credit at the crew's price. You pay it back from your sales by a due date, so the debt and the risk are yours, as street-level supply usually goes.

**Options considered.** Fronted on credit (recommended, chosen). A cut of each sale to them. A daily wage to stand the corner, as Levitt and Venkatesh's foot soldiers were paid.

### D85. The first recruit is the coworker. LOCKED, 2026-10-24 (Evan's call)

**Decision.** You can bring in the one person you have ties with, the coworker, if their regard and familiarity are high enough. They then sell on their own nights from what you hold, and you keep a share. Arrested, they may name you, more likely the less they think of you. More recruits wait for M2.6's relationships.

**Options considered.** The coworker, for now (recommended, chosen). Any tier-1 person you have met. Joining only, with recruiting in M2.6.

### D86. An unpaid front cuts you off, with no violence yet. LOCKED, 2026-10-24 (Evan's call)

**Decision.** A front not paid back by its due date ends the dealer's fronting, and their trust falls; the debt stands until it is paid. Violence waits for injury and health.

**Options considered.** Cut off, no violence yet (recommended, chosen). A threat you are warned of, with a placeholder injury.

### D87. A detective earns a patrol officer's wage, as a placeholder. LOCKED, 2026-10-24 (Evan's call)

**Decision.** No detective's rate could be read (bls.gov blocked; Grand Rapids' 2025–28 contracts were reported without rates). The detective rank pays the patrol officer's sourced $28.28 an hour, marked as a placeholder in CALIBRATION.md until a contract or the occupational survey is read.

**Options considered.** The officer's wage, marked (recommended, chosen). The rank built with no promotion into it until a wage is sourced. Detective left to M2.5.

### D88. Relationships come before food. LOCKED, 2026-10-24 (Evan's call)

**Decision.** M2.6 is worked before M2.5. Relationships need few wage figures, and M2.7's heir needs a family to inherit. The CURRENT MILESTONE marker moves to M2.6, and the [you] gates still open are listed at the top of ROADMAP.md so none is lost.

**Options considered.** M2.6 Relationships (recommended, chosen). M2.5 Food, on secondary wage sources. M2.7 Lives, without the heir. M2.9 Travel. For the marker: move it and list the open gates (recommended, chosen), or leave it at M0.3.

### D89. You meet the people where you are. LOCKED, 2026-10-24 (Evan's call)

**Decision.** Anyone among the 1,000 tier-1 people can become a tie of yours: you meet whoever shares your place and hour, as they meet each other (D71), and keep up to 12 ties, each grown from time together. The coworker is one of them, with their regard and memory kept. Nobody under 18 can be courted, whatever else changes.

**Options considered.** People you meet (recommended, chosen). The linked people only (the coworker, the fence, the supplier). People you meet plus a dating app showing strangers from the 1,000.

### D90. Intimacy fades to black. LOCKED, 2026-10-24 (Evan's call)

**Decision.** A choice such as staying the night, then the morning. The chronicle says only that they spent the night. Pregnancy can follow at real odds, with or without contraception. Nothing is shown.

**Options considered.** Fade to black (recommended, chosen). Off screen entirely, with pregnancy only from a couple's choice to try for a child.

### D91. Attraction is drawn for each person. LOCKED, 2026-10-24 (Evan's call)

**Decision.** Each tier-1 person's orientation is drawn from the seed at real US survey shares, traced in CALIBRATION.md. You pick yours at the start, and can change it later in settings. Attraction runs both ways and follows both people's.

**Options considered.** Drawn per person (recommended, chosen). Anyone attracted to you, whatever your gender.

### D92. Relationships move at a real-shaped pace. LOCKED, 2026-10-24 (Evan's call)

**Decision.** Dating to moving in and to marriage take real median times, about one to three years, traced in CALIBRATION.md, so a marriage in the free first year is rare but possible. A pregnancy carried to birth fits in a year. The heir (M2.7) gets children who were born in play.

**Options considered.** Real-shaped (recommended, chosen). Compressed about four times, written as a departure.

### D93. You ask someone out in person; dates are planned by phone after. LOCKED, 2026-10-24 (Evan's call)

**Decision.** The first ask is made where you both are: at the third place you've gone out to, or at a tier-1 workplace while a shift is on. Once they've said yes, later dates are planned by phone at any hour.

**Options considered.** In person, then texts (recommended, chosen). Anywhere by phone, to anyone you've met.

### D94. You can date more than one person, and they can find out. LOCKED, 2026-10-24 (Evan's call)

**Decision.** Dating more than one person at a time is allowed. On each date, every other partner may find out, at odds shown before you go: more when the date is at their own third place. Finding out costs their regard hard, and below the courtship record's line they end it. This is the start of affairs (DESIGN.md, Relationships).

**Options considered.** Yes, with consequences (recommended, chosen). One at a time, with affairs left for later.

### D95. Life together: half the rent from a partner who works, a magistrate's wedding, and a divorce without dividing property yet. LOCKED, 2026-10-25 (Evan's call)

**Proposal.** A partner who moves in pays half the rent on the 1st if they hold a job, and nothing if they don't. A wedding is a ceremony before a magistrate in office hours, after Michigan's licence and its wait; larger weddings and their costs wait. A divorce is the uncontested kind with no children: the fee, the 60 days, the judgment. Who keeps what is not divided yet, since the game keeps one purse, yours. Built this way in M2.6 step 3 and confirmed as proposed; property division waits until there is property to divide (ROADMAP open question 80).

**Options considered.** Half the rent from a working partner (built, chosen), a share by each one's pay, or none. A magistrate's wedding (built), or a choice of weddings with their costs. A divorce without property (built), or Michigan's equitable division of what was earned in the marriage.

### D96. Bodies are a trait of each person. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Each person, you included, has a body that can or can't carry a pregnancy, drawn from the seed to match their pronouns at real shares (CALIBRATION.md). You pick yours at the start, and can change it in settings. A pregnancy can follow a night only between one body that can carry and one that can't.

**Options considered.** A trait per person (recommended, chosen). Following pronouns: anyone who uses she can carry.

### D97. A pregnancy comes with Michigan's real options. LOCKED, 2026-10-25 (Evan's call)

**Decision.** A pregnancy you carry is yours to go on with or to end at a clinic, as Michigan's constitution has allowed since 2022, at its real costs and weeks, told plainly in the chronicle. A partner who carries chooses for themself. Miscarriage comes at the real rate.

**Options considered.** Michigan's real options (recommended, chosen). Always continuing, apart from miscarriage.

### D98. A child asks for hours and money. LOCKED, 2026-10-25 (Evan's call)

**Decision.** A child takes care hours each day, shared with a partner you live with; childcare costs its real weekly price while you work; a child left without care has consequences later, a report to child protective services among them. Built in step 4b.

**Options considered.** Hours and money (recommended, chosen). Money only.

### D99. Couples first; adoption and other routes later. LOCKED, 2026-10-25 (Evan's call)

**Decision.** In M2.6, a child comes of a pregnancy between partners. Adoption, fostering and donor routes wait for a later milestone, listed in ROADMAP's ideas.

**Options considered.** Couples now, others later (recommended, chosen). Adoption through an agency in this step too.

### D100. When parents part, the child stays with whoever cared more. LOCKED, 2026-10-25 (Evan's call)

**Decision.** A child who lived with you both stays with the parent who gave more of their care, as a court weighs the established home; the other has Michigan's standard parenting time, alternate weekends and about 73 nights a year. Child support follows the shape of Michigan's formula, with its offset for the nights each parent has the child. Contesting custody in court waits for later.

**Options considered.** Who cared most (recommended, chosen). Who gave birth. You choose and they accept.

### D101. Chemistry falls 2 points a year of age gap past 5, not 4. LOCKED, 2026-10-25 (Evan's call)

**Decision.** How drawn someone is to you falls 2 points for each year of age between you past the first 5 (`population/ridgefield.json`, `chemistry.per`). At 4, a life that starts at 18 found 837 of 997 people feeling nothing for it, and in a year out every evening 28% of the suitor bot's lives dated, below the 40 to 80 proposed (M2.6 step 6). At 2, a 25-year-old still feels something for an 18-year-old; a 40-year-old mostly doesn't. The age shares stay a placeholder until the Census can be read.

**Options considered.** Soften the age gap (recommended, chosen). Keep it and lower the bar, taking a young life's small pool as real. Read the Census's age shares first.

### D102. A finding of neglect opens a safety plan; more days short of care within it move the child. LOCKED, 2026-10-25 (Evan's call)

**Decision.** When a child protective services investigation finds a child's care wanting (D98), a safety plan opens, with check-ins over its term. More days short of care within the plan move the child to the other parent, or into foster care when there is none to take them; the chronicle records it. This is the shape of Michigan's process, to be traced in CALIBRATION.md when built. Answers ROADMAP open question 83.

**Options considered.** A safety plan, then removal (recommended, chosen). The finding on your record only, for now. Removal at once.

### D103. Death follows real life tables. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Each year of life carries the chance of dying that the US period life table gives for that age and body, raised by what a life does: health let fall, violence, prison, untreated illness. An 18-year-old's year is about 1 in 1,000, so a first year rarely ends in death; death comes mostly from choices and from age. The table's figures trace to CALIBRATION.md; the ones that couldn't be read from the build environment are marked there.

**Options considered.** Real life tables (recommended, chosen). The same tables with a way to pass years quietly to old age. Compressed odds so lives turn over in a few years, a departure from D10.

### D104. Acute illness and injury now; chronic conditions later. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Colds, flu and injuries from work or violence, each with real recovery days, missed shifts and care costs. Health at zero puts you in hospital. Chronic conditions and addiction wait for a later milestone.

**Options considered.** Acute now, chronic later (recommended, chosen). Acute and chronic together. No named illnesses, only the health need raising the death risk.

### D105. Care is paid by Michigan's real rules. LOCKED, 2026-10-25 (Evan's call)

**Decision.** The Healthy Michigan Plan (Medicaid) covers a household below 138% of the federal poverty line; a job that carries coverage covers you through the employer; otherwise you pay the uninsured price. Prices trace to CALIBRATION.md (a birth: $2,655 insured, $15,712 not). Answers ROADMAP open question 81.

**Options considered.** Michigan's real rules (recommended, chosen). Everyone uninsured for now. Everyone insured for now.

### D106. The city's people age and die too, and newcomers take their place. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Each tier-1 person ages a year every 365 days and dies by the same tables as you. Someone new moves into the city in their place, so the count holds. A partner, a friend or a child's other parent can die; what follows (widowhood, custody to you, ties ended) is the sim's.

**Options considered.** Yes, with newcomers (recommended, chosen). Only you and your household age and die.

### D107. The heir can be an adult child, a spouse or live-in partner, or a close friend. LOCKED, 2026-10-25 (Evan's call)

**Decision.** D20's order, with each kind as the sim holds it. A child born in play, 18 or over, the eldest first. Then a spouse, or a partner who lived with you: the tier-1 person you become. Then a child under 18, as a ward (D108). Then a close friend: someone you know at the highest regard, past a bar (tune). You become them: their name, age and body, with nothing of your skills, your job or your record.

**Options considered.** A child, a spouse and a close friend (recommended, chosen). A child and a spouse only. Children only for now.

### D108. A ward's years pass as a jump to their 18th birthday, with a summary. LOCKED, 2026-10-25 (Evan's call)

**Decision.** When the heir is a child under 18, the save jumps to their 18th birthday. The city's people are worked out from the seed by the day, so who died and who came is known without passing the years; the summary says who raised them, who died, and what was left. No shifts, rent or illness are lived in those years.

**Options considered.** A jump with a summary (recommended, chosen). The years passed a month at a time with a guardian's household running: truer, slow on a phone, and no guardian model exists.

### D109. The estate follows Michigan's rules, simplified. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Debts are paid from what you leave first: rent owed, the court's, care's, the family's bills and child support behind. Debts beyond the estate die with it; the heir owes nothing of them. An estate within Michigan's small-estate limit passes by affidavit at no cost; above it, probate costs a share (tune). The rest goes to the heir. The intestate shares between a spouse and children wait.

**Options considered.** Michigan's rules, simplified (recommended, chosen). Michigan's intestacy in full (EPIC's shares). All of it less debts, with no probate.

### D110. The epilogue reads the page's journal. LOCKED, 2026-10-25 (Evan's call)

**Decision.** The life's epilogue, and an heir's reading of the family's record, come from the journal the page keeps beside the save (D52). The sim's chronicle stays where it is. Answers open question 46 in ROADMAP.md.

**Options considered.** The page's journal (recommended, chosen). The chronicle moved into the sim as a module, so bots and replays could read it.

### D111. Education to community college: a diploma or GED, and an associate's, for adults. LOCKED, 2026-10-25 (Evan's call)

**Decision.** M2.8 builds the GED for those without a diploma and a community college's associate's degree, as terms, courses in the week, credits and grades. Adults only: the schooling of children in your household waits, since heirs born in play are few in the first year.

**Options considered.** A diploma or GED and community college (recommended, chosen). The same with children's schooling. University as well.

### D112. The first life starts with a diploma at Michigan's graduation rate. LOCKED, 2026-10-25 (Evan's call)

**Decision.** By the seed, a first life starts with a high school diploma at Michigan's four-year graduation rate; without one, the GED is the way. The background pick at the start (D21) stays for later.

**Options considered.** By Michigan's rate (recommended, chosen). Everyone has one. Build the background pick now.

### D113. College is paid by real tuition, a Pell grant and federal loans. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Tuition and fees per credit at a Michigan community college's real rate. A Pell grant by income against the poverty line, by the federal rules as simplified in 2024. Federal Direct loans at their real rate, repaid after you leave school, and a debt of the estate when you die (D109).

**Options considered.** Real tuition and Pell, no loans (recommended). Tuition only. Tuition, Pell and loans (chosen).

**Amended 2026-10-25 (Evan's call).** Federal Direct loans are discharged at the borrower's death, so the estate owes nothing for them and the heir inherits none of it (34 CFR 685.212, read through consumer guides; the regulation itself is to be checked). The decision had said the loans were a debt of the estate. Options considered: discharged, as the real rule has it (recommended, chosen); kept as a debt of the estate, a departure written beside the figure.

### D114. Credentials gate careers as the real ones do, and move pay and odds. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Careers name what they require as data: the police a diploma or GED, after MCOLES's standard. An employer that prefers an associate's hires at better odds, shown before you apply. Pay by credential traces to BLS's earnings by education.

**Options considered.** Real requirements and pay (recommended, chosen). Requirements only. Nothing yet.

### D115. Aid counts you as an independent student, on your own pay. LOCKED, 2026-10-25 (Evan's call)

**Decision.** Pell and the loan limits treat you as an independent student at any age, with your own gross pay over the past year as the income, against the poverty line for one person. The real rules count a student under 24 as dependent, on the parents' income, and the game has no parents with an income. This is a departure, written beside the figures in CALIBRATION.md.

**Options considered.** You, as independent (recommended, chosen). Dependent by background: a parents' income drawn from the start's family means, under 24, with the dependent loan limit.

### D116. Step 5 builds careers across the credentials now. LOCKED, 2026-10-25 (Evan's call)

**Decision.** M2.8's pay by credential comes from the careers each credential opens, read against BLS's earnings by education as a realism bar, not from a premium inside a career. So step 5 adds nine careers to the four there were, as data with their wages, requirements and preferences, from the secondary sources the line cook's wage came from. It finishes part of M2.3 step 1, which stays open for the rest of its 30 and for the primary figures.

**Options considered.** Build the careers now (recommended, chosen). A premium inside each career at BLS's ratio, cheaper but not real and double counting once careers come. Requirements now, the pay gate moved to the 30 careers.

### D117. A course can be retaken, the better grade counting. LOCKED, 2026-10-26 (Evan's call)

**Decision.** A course passed at a C or lower can be taken again for its credits' price, and the better of the two grades counts in the average, as Macomb Community College's course repeat policy has it. The question was put as the later grade replacing the earlier; Macomb's page, read after, counts the better one, which is what is built. Saves from before kept no grades per course, so what they passed can't be retaken.

**Options considered.** Retakes, as real (recommended, chosen). Leave the dead end for later.

### D118. M2.9 moves you across the city on foot, by bus and by rideshare. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Walking across the city at the real pace, the bus on the arterials with real fares, headways and waits, and rideshare by distance at a real price. A map tap chooses a way and shows its time and cost first. Owned cars stay in Phase 4.

**Options considered.** Walk, bus, rideshare (recommended, chosen). The same with a bicycle. Walk and bus only.

**Built 2026-10-26 (M2.9 step 5).** The way is chosen where a trip starts, not on the map: Go to work, Go out and Go home each open the ways with their minutes and price. Nothing is travelled to from the map yet; when it is, the same choice opens there.

### D119. One walking pace, the real one. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Everywhere walks at about 1.3 m a second, 80 m a game minute, your block as the city, so the two agree at your door. This replaces D49's 1.95 m a game minute on the block.

**Options considered.** One real pace (recommended, chosen). Keep the block's slow pace for play, the city alone at the real one.

**Amended 2026-10-26 (Evan's call).** At speed 1 the clock runs two game minutes a second, so a walker at the real pace would cross the block in a fraction of a second. The walker keeps D49's pace on screen, a walk a player can follow, and the clock counts only the real walk while you walk: it slows. Options considered: a watchable walk, real minutes (recommended, chosen); the real pace on screen too; D49's slow pace kept on the block.

### D120. Food comes next. LOCKED, 2026-10-26 (Evan's call)

**Decision.** M2.5 Food is worked after M2.9, before M2.10 Words, so the voice pass reads every career's strings once. Its wages come from secondary sources quoting the federal survey, marked as such, since bls.gov can't be reached from the build environment (D77, D116).

**Options considered.** M2.5 Food (recommended, chosen). M2.10 Words. M2.3's remaining 17 careers on secondary wages. M2.11 Editions.

### D121. The food ladder is line cook, kitchen lead, chef. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Three rungs: the line cook at $14.73 an hour (as now), the kitchen lead at $18.24 (Michigan's median for first-line supervisors of food preparation and serving workers, SOC 35-1012, $37,940 a year, May 2025), and the chef at $23.54 (the 25th percentile of Michigan's chefs and head cooks, SOC 35-1011, $48,970 a year). The lead's is a median, not a 25th percentile, because the supervisors' figure includes fast-food shift leads; written beside it in CALIBRATION.md.

**Options considered.** Cook, lead, chef (recommended, chosen). Cook, chef. Cook, sous chef, chef, with the sous chef's wage estimated between the two, since the survey has no sous chef.

### D122. Promoted where you work, then hired anywhere. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Your own kitchen promotes you once your practice and standing are enough, as patrol to detective works (M2.4). Once you have held a rank, other kitchens in the city post its openings too, asking for that experience, as real kitchens hire. Experience is the minutes you have worked in a career, kept across employers, so a chef who quits is hired as a chef elsewhere. The career records gain a requirement for experience.

**Options considered.** Promotion, then hired (recommended, chosen). Promotion only. Hired on the market only, no promotions.

### D123. The lead and the chef have their own shifts. LOCKED, 2026-10-26 (Evan's call)

**Decision.** A lead or chef meets shift events a line cook doesn't: a cook who doesn't show, a supplier short on an order, the health inspector's visit, a cook to keep or let go, a dish to take off the menu. Their odds are shown first and rolled as shown, and what comes of them shows in standing and pay. The kitchen keeps no books of its own; owning the restaurant stays in Phase 4.

**Options considered.** The chef's own shifts (recommended, chosen). The same with the kitchen's books (covers, food cost, staff hours, an inspection grade). Wage and title only.

### D124. A promotion waits for the post to come open. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Each kitchen has one lead and one chef, and someone holds each post. With the hours and the standing, you are promoted only once the post comes open: its holder leaves at food service's turnover, 54 a month in a thousand staff (5.4%; the question put it as 54 in 100 a year, a misreading of the same figure, which gives a holder about 18 months on average rather than 22), drawn from the seed, and the post stays open three weeks. Until then the Jobs tab says you are ready, and you can apply for the rank at the city's other kitchens. The cook bot's five years had every steady cook made lead on about day 357 and chef on about day 1,070, which no real kitchen does.

**Options considered.** Wait for the post (recommended, chosen). Keep promotion on hours and standing alone. A monthly chance at shown odds once eligible (tune), not tied to anyone leaving.

### D125. M2.3's remaining careers come next. LOCKED, 2026-10-26 (Evan's call)

**Decision.** After M2.5's [auto] gates, the marker goes back to M2.3 to finish its 30 entry-level careers, on secondary wage sources as the nine of M2.8 and the food ladder were (D116, D121), so the voice pass of M2.10 reads every career's strings once.

**Options considered.** M2.3's careers (recommended, chosen). M2.10 Words. M2.11 Editions. Phase 2's year gate first.

### D126. The last 17 careers. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Server, fast-food crew, host, retail salesperson, stocker, hand packer, forklift operator, team assembler, housekeeper, landscaper, home health aide, nursing assistant, childcare worker, construction laborer, carpenter's helper, receptionist, and a delivery driver in the employer's van. Each with Michigan's wage from the federal survey through a secondary source, real shifts and real requirements, traced in CALIBRATION.md. The driver assumes the licence most eighteen-year-olds hold, since owning and driving a car wait for Phase 4 (D118); the nursing assistant assumes Michigan's short training course is done.

**Options considered.** The list with a telemarketer (recommended). The same with a delivery driver in its place (chosen). Fewer careers with deeper shift events, changing M2.3's gate.

### D127. Words come next. LOCKED, 2026-10-26 (Evan's call)

**Decision.** With M2.3's 30 careers in, M2.10 Words is worked before M2.11 Editions and Phase 2's year gate: all of Phase 2's content exists, so one voice pass reads it once, and the demo/full split depends on which strings exist.

**Options considered.** M2.10 Words (recommended, chosen). Phase 2's year gate. M2.11 Editions.

### D128. The year's events are the seasons and a pool of life events. LOCKED, 2026-10-26 (Evan's call)

**Decision.** The calendar: Michigan's winter (snow, the heating bill, cold mornings that slow the walk), the holidays, and the clocks changing. Beside it, a pool of about 24 life events as data, drawn at real-shaped rates: a family call, a friend's funeral, a landlord's notice, a fall on ice, a jury summons, a tax refund and the like. Each has its odds shown and its outcome rolled as shown, and a line in the journal.

**Options considered.** Seasons and life (recommended, chosen). The calendar only. Life events only. No events in M2.10.

### D129. The voice pass is a lint, then Evan's reading. LOCKED, 2026-10-26 (Evan's call)

**Decision.** A content lint, run by `pnpm lint` and so in CI, fails on what VOICE.md forbids and a machine can see: exclamation marks, game words, numbers typed into text, and real brands and places from a blocklist; it reads the records and the page's strings in code. The lines it finds, and those that miss VOICE.md's patterns, are rewritten. Then a page lists every string by register for Evan to read and mark; that reading is Phase 2's [you] gate for the voice.

**Options considered.** A lint, then Evan reads (recommended, chosen). Rewritten by hand and skimmed, with no lint. The lint alone, leaving the [you] gate open.

### D130. Heat is a gas bill beside the rent. LOCKED, 2026-10-26 (Evan's call)

**Decision.** The flat pays its own gas, as most Michigan apartments do. A bill comes due with the rent on the 1st for the month just past: a fixed charge, plus the gas the month's cold burns, by its heating degree days, at the state's residential price. About $85 for January and $20 for July, so roughly $560 a year (tune). A bill that can't be paid is owed, like rent. Shutoffs wait for housing.

**Options considered.** A gas bill beside the rent (recommended, chosen). Heat included in the rent, so winter shows only as snow and slower walks. A rent that rises in the cold months.

### D131. Snow slows walks and buses. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Days with an inch or more of snow are drawn from the seed at a mid-Michigan city's monthly normals, about 13 a year, December to March for the most part. On a snow day and the morning after, a walk takes longer (tune, from a winter-walking study) and a bus's wait is longer. Nothing closes. The fall on ice is a life event (step 4).

**Options considered.** Slower walks and late buses (recommended, chosen). The same, with the college and the court closing and shifts called off on the heaviest days. Snow on screen only.

### D132. Holidays close the court and the college, and the buses run on Sunday's timetable. LOCKED, 2026-10-26 (Evan's call)

**Decision.** The federal holidays (5 U.S.C. 6103) close the court and the college, and the buses run their Sunday timetable. Jobs work them at the usual pay, as most food and retail jobs do; no law asks more. Each holiday is named on the bar and in the journal.

**Options considered.** Closings, no change in pay (recommended, chosen). Closings and time and a half for a worked holiday. Named only.

### D133. The clocks changing costs or gives an hour of sleep. LOCKED, 2026-10-26 (Evan's call)

**Decision.** The game's day stays 24 hours of 60 minutes. On the second Sunday of March the night is an hour shorter: if you are asleep at 02:00 you lose an hour's sleep. On the first Sunday of November it is an hour longer: asleep at 02:00, you gain one. Shifts, buses and the alarm keep local time, as they do in life. The journal says the clocks changed.

**Options considered.** An hour of sleep (recommended, chosen). Named only. Left out of the game.

### D134. A life event waits for a quiet moment, then asks. LOCKED, 2026-10-26 (Evan's call)

**Decision.** A life event drawn for you waits until you are awake and free: not asleep, on a shift, in court, held, in prison, in hospital or on a trip. Then a sheet opens with its choices, each showing its cost and its odds from the preview the roll uses, and the clock drops to 1×, as the shift's events do (D40).

**Options considered.** A sheet at a quiet moment (recommended, chosen). A line on the Waiting list, with a deadline and a default choice. Told in the journal, with a choice for only a few.

### D135. The pool is a mixed 24. LOCKED, 2026-10-26 (Evan's call)

**Decision.** About 24 life events across family and friends (a call home, a funeral, a wedding, a loan asked of you), the flat (a rent rise at renewal, the heat out, pests, a break-in), money and the state (a tax refund, a jury summons, a lost wallet, a broken phone, an overdraft), the body (a fall on ice, a toothache, food poisoning) and the street (a mugging, money found, a stranger asking for help, a power cut, a heat wave, election day). Each is a record with a rate traced in CALIBRATION.md or marked (tune), one or more choices with costs and odds shown, and a journal line.

**Options considered.** The mixed 24 (recommended, chosen). The same kinds weighted to hardship. About 12 events, each with a follow-up days later.

### D136. Editions come next. LOCKED, 2026-10-26 (Evan's call)

**Decision.** With M2.10's [auto] gates passed and Evan's reading of the strings open, M2.11 Editions is worked next, the last milestone of Phase 2; then Phase 2's year gate.

**Options considered.** M2.11 Editions (recommended, chosen). Phase 2's year gate first. A pause for Evan's reading.

### D137. The free year ends with a last card; the save is kept, and new lives are free. LOCKED, 2026-10-26 (Evan's call)

**Decision.** A save's free year ends at its first character's 19th birthday, day 365 of the save (D20). The world stops there with a last card: the year from the journal, and the unlock to go on. The save is kept and goes on from where it stopped once the game is unlocked. A new life can start at any time with a free year of its own. An heir inside the year carries on as the life does; a ward's jump past the birthday stops at the card.

**Options considered.** A last card, the save kept, new lives free (recommended, chosen). One free year a device, new lives locked after it. A last card with the save not carried on after the unlock.

### D138. One build, a gate, and the check ready. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Amends D17's two builds. There is one build for both editions. The unlock is an action the page sends when the device is unlocked, so a save replays as it was played; until Phase 3's billing a test switch sends it. Records can be marked full-only; a check fails if a full-only record could be shown in the free year. Nothing is full-only yet, so the check is seen failing on a planted record.

**Options considered.** One build, a gate and the check (recommended, chosen). Two builds with CI diffing them, as D17 had it. The gate only, the split left until full-only content exists.

### D139. The realism bars, then Phase 3. LOCKED, 2026-10-26 (Evan's call)

**Decision.** With M2.11's [auto] gates passed and Phase 2's year lived in 500 seeds, the realism bars in CALIBRATION.md are written as tests next (M2.12), then Phase 3 opens.

**Options considered.** The bars, then Phase 3 (recommended, chosen). Phase 3 now. A pause for Evan's reading and phone checks.

### D140. B1 and B2 are stated on the studio, with the essentials charged. LOCKED, 2026-10-26 (Evan's calls)

**Decision.** The game has one $550 studio, no cars and no roommates, so B1 and B2 can't be tested as first written. They are restated on the studio and a year of essentials: rent, gas, electricity, a phone, household goods and clothing, and meals. B1: full time at the median of the careers' wages, the essentials leave over two-fifths of net pay. B2: full time at the minimum wage, they leave under a third. The bills the game didn't charge (electricity, a phone, household goods and clothing) come due monthly with the rent, traced in CALIBRATION.md. The bars as first written, a one-bedroom, a used car and a roommate, wait for housing and cars in Phase 4, and the departure is written beside them.

**Why.** Read on 2026-10-26: with only rent, gas and meals charged, full time at the minimum wage kept about 47% of net pay and at the median about 61%, so the floor wasn't hard. Rent alone was 25% of the minimum wage's gross, affordable by the usual measure.

**Options considered.** For the statement: restated on the studio (recommended, chosen); left open until Phase 4; a rent choice built now. For the floor: the missing essentials charged (recommended, chosen); B2 as rent's share of gross pay; B2 left failing as a known gap.

### D141. B5 is checked by the tables a year at a time. LOCKED, 2026-10-26 (Evan's call)

**Decision.** Whole lives are decades of play. B5 is checked a year at a time: a year's chance of dying matches the life table at each age (M2.7's gate), and a bot that neglects sleep and food has a higher chance than one that doesn't, over the same year.

**Options considered.** By the tables, a year at a time (recommended, chosen). Whole lives through the steady bot, as a bench.

### D142. The shop notices half as often, and B7 is a careful thief's. LOCKED, 2026-10-26 (Evan's calls)

**Decision.** The clerk's odds of noticing a take drop from 45 to 22 in 100 and the camera's from 35 to 17; nobody's stays at 4, and heat still adds a point for every 2. B7 is measured on a careful thief: the thief bot, told to steal only while the odds shown are one in ten or better, is held at the moment in under 14 takes in 100. The reckless thief bot, which steals three times a day however hot it is, is left as it was for the law's sweeps; its heat reaches 100 and it is held about one take in five, which is the heat doing its work. The odds of being taken on keep a floor of 1 in 100, not 5: at 5, a record changed nothing for the 28 careers whose odds were already at the floor, and B4 failed.

**Why.** Read on 2026-10-26: with the old odds the thief bot was held in 60 of 311 takes, 19%. Halving the clerk and camera moved that by nothing, because the bot already took from the shelves nobody sees; what held it was heat. A real shoplifter is mostly occasional, so the bar is a careful thief's.

**Options considered.** For the odds: lowering the shop's notice odds (recommended, chosen); leaving B7 at the reckless bot's rate and restating the bar; slower heat. For the measure, asked once the odds alone hadn't moved it: the careful thief (recommended, chosen); the reckless bot with heat counting half as much (read 14.8%, so not enough alone); the bar restated as the odds shown at no heat.

### D143. Phase 3 waits. LOCKED, 2026-10-26 (Evan's call)

**Decision.** With M2.12's [auto] gates passed, Phase 3 (the unlock and Play) doesn't open yet. Its open questions wait with it: what a web player gets after the free year, the Play package id, and the order of its work.

**Options considered.** Opening Phase 3 now, billing first (recommended); waiting (chosen).

### D144. Seven phases after Phase 4, and Phase 4 next. LOCKED, 2026-10-27 (Evan's call)

**Decision.** The city is large on the plan (10,106 blocks) but small in what can be done: three walkable interiors, one studio, little to buy, and a median $14,429 left at the year's end. Seven phases follow Phase 4: money that matters (5), places to live (6), a city you walk into (7), being somewhere with people (8), the city changes (9), owning the place (10), cars (11). Phase 4's owned cars move to Phase 11 and its interiors to Phase 7, so nothing is planned twice. Phase 4 opens now, ahead of Phase 3, which waits (D143).

**Options considered.** All seven as phases after the existing ones (chosen). A subset. Putting them before Phase 3 and release one (proposed order: money, housing, interiors, people, change, owning, cars).

### D145. Above the crew, you run your own. LOCKED, 2026-10-27 (Evan's call)

**Decision.** M4.1's tier is a crew of your own. You buy weight from a wholesale connect, front it to recruits from the people you know, and set them on corners. Their debts, arrests and loyalty are yours to manage; an arrested recruit may name you, as the coworker can now (D85).

**Options considered.** Your own crew (recommended, chosen). Rising inside the supplier's crew by trust. Both, rising first and then breaking off.

### D146. Violence is in, rare and costly. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Amends D86. A dealer holding cash can be robbed, and can rob; an unpaid front can bring retaliation, either way. Injuries go through health and the hospital (M2.7), and violence raises heat and brings assault and robbery charges by Michigan's law. It is never the best play: B6's measure holds at this tier.

**Options considered.** In, rare and costly (recommended, chosen). Threats only. Not yet, D86 kept.

### D147. Cash carries a risk. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Cash beyond what your pay explains goes on the case file: spending or banking large sums draws attention, and a raid can seize what is found. Laundering through a business waits for Phase 10.

**Options considered.** Cash with a risk (recommended, chosen). Laundering now, through a front built ahead of Phase 10. Cash with no extra risk.

### D148. Rival crews hold corners. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Corners are held by crews among the tier-1 people. Selling on a held corner brings a warning, then trouble, with violence (D146).

**Options considered.** Rivals on corners (recommended, chosen). No rivals yet.

### D149. Past the college: a bachelor's, then law school. LOCKED, 2026-10-27 (Evan's call)

**Decision.** M4.2 adds a four-year public university, entered as a freshman or by transfer with the associate's, and after a bachelor's, law school, the LSAT and the bar exam. Medical school waits for the medicine milestone, which needs the hospital.

**Options considered.** A bachelor's, then law school (recommended, chosen). A bachelor's only. A bachelor's, law and medicine, with residency standing in for the hospital.

### D150. Admission by odds from your record. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Getting into the university and law school is an application, its odds shown first: grades (high school's, or the college's GPA), a test where the real one has one (the LSAT), and a criminal record against you, as admissions weigh them.

**Options considered.** Odds from your record (recommended, chosen). Open entry, the work and the cost the only filter.

### D151. A handful of careers with real wages. LOCKED, 2026-10-27 (Evan's call)

**Decision.** About five careers that ask for a bachelor's (an elementary school teacher, an accountant, a social worker, a software developer, a civil engineer) and lawyer after the bar, each on the career template with BLS wages for the metro class.

**Options considered.** A handful with real wages (recommended, chosen). Lawyer alone, a bachelor's raising odds and pay in the careers there are.

### D152. Evening sections at the university and law school. LOCKED, 2026-10-27 (Evan's call)

**Decision.** The university and law school offer evening sections as the college does: at enrolling you take the term's courses by day or by evening, so someone with a day job can study part time. Answers open question 106's first half, found by the degree bot (half its bachelor's lives were let go for the shifts their day classes cost them).

**Options considered.** Evening sections (recommended, chosen). Letting a worker pick the shift kind they work, a change to every career. Leaving it, the hardship as the reading, to come back to with Phase 5's money.

### D153. M4.3 is federal law. LOCKED, 2026-10-27 (Evan's call)

**Decision.** After M4.2, the police ladder past detective: a federal agent's application, its academy and its cases, built on the degrees M4.2 added and the detective rank there is. Medicine and Phase 5 wait.

**Options considered.** Federal law (recommended, chosen). Medicine (EMT to physician), likely two milestones. Phase 5, money that matters, leaving Phase 4 for now.

### D154. Getting into the FBI in stages, each rolled. LOCKED, 2026-10-27 (Evan's call)

**Decision.** A special agent's application goes in stages, each one's odds shown first and rolled as shown: the application against the requirements (a bachelor's, two years of professional work, 23 to 36), a written test, a fitness test you train for, an interview, and the polygraph and background investigation, where your record weighs; then the Academy. The real figure, about 2 in 100 applicants hired, is to come out of the stages and how you prepare, not be rolled once.

**Options considered.** Stages, each rolled (recommended, chosen). One application at odds from the degree, work, fitness and record, then the Academy.

### D155. A federal agent works cases against the city's crime. LOCKED, 2026-10-27 (Evan's call)

**Decision.** An agent's work is assignments, their outcomes abstracted and their consequences real (D13), drawn from the crime the sim has: the supplier's organization, the street crews, fraud. Pay on the General Schedule with law enforcement availability pay. The intelligence rung D13 put at the top waits.

**Options considered.** Cases against the city's crime (recommended, chosen). Generic assignments as shift events, not tied to the sim's crime. Cases and the CIA rung in this milestone.

### D156. A new agent stays in the city. LOCKED, 2026-10-27 (Evan's call)

**Decision.** The city's field office takes a new agent, where the FBI would post one to any of its 56 offices. Written beside the figure as a departure: the life, family and people known stay where they are.

**Options considered.** Stay in the city (recommended, chosen). A posting elsewhere ending the city chapter.

### D157. The Academy is weekday training in the city. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Cleared, you report, and the bureau takes you on as a special agent trainee: a career like the police recruit's, ten-hour training days Monday to Friday for about 18 weeks, home each night, at the grade 10 rate without availability pay. Its ladder makes you a special agent once its weeks are worked in good standing. Leaving it any other way ends the application, which can be made again a year later. The real Academy is residential at Quantico; written beside the figure as a departure, as D156 keeps the life in the city.

**Options considered.** Weekday days in the city (recommended, chosen). Away for 18 weeks with time passing and sparse choices, prison's form: truer, a new mode, about twice the work.

### D158. An agent's grades are ranks on the ladder. LOCKED, 2026-10-27 (Evan's call)

**Decision.** Grades 10 to 13 are four careers on one ladder (special agent, then the same at grades 11, 12 and 13), each reached after about a year's practice in standing 50 or better, as the real career ladder promotes to GS-13 without competition. Each pays step 1 of its grade at Detroit's locality with 25 in 100 availability pay, spread over 50-hour weeks.

**Options considered.** Ranks on the ladder (recommended, chosen). One career whose wage rises with years served: a new pay-by-tenure rule in the job module.

### D159. A case is a file, then a takedown. LOCKED, 2026-10-27 (Evan's call)

**Decision.** An agent works one case at a time, against a target drawn from the city: the head of a rival crew holding a corner, or the supplier's crew. Shift events add evidence at the odds shown. With enough, you ask for an indictment, rolled at a chance from the evidence. A conviction sends the target away for the sentence: a head's corner goes open, and while the supplier's crew is away nobody sells. Someone who has bought or sold in the trade opens no case.

**Options considered.** A file, then a takedown (recommended, chosen). Shift events only, each one an arrest or not, like the detective's: cheaper, little that lasts.

### D160. Fraud cases wait for Phase 5. LOCKED, 2026-10-27 (Evan's call)

**Decision.** The sim has no fraud yet, so an agent's cases are against the trade for now. Fraud cases come when Phase 5 adds banks, credit and money that can be stolen on paper.

**Options considered.** Later, with Phase 5 (recommended, chosen). Abstract fraud schemes at tier-1 workplaces now, with nothing behind them in the sim.

---

## Open items

| Item | Where it is decided | Default until then |
| --- | --- | --- |
| The title | D24 | "Live Your Life" |
| The city's name | D66 | Ridgefield |
| The base year | D15 | 2025 dollars |
| The calendar | D26 | as proposed: 365-day years, four parts of the day, meteorological seasons |
| A domain of its own | D53 | `life.rcjlabs.com` |
| The district trend (decline or growth) | ROADMAP ideas | on, seeded per city |
| The tick and speeds | DESIGN.md, M1.8 | 1 tick = 1 game minute; speed 1 = 2 game minutes a second |
| The tier-1 cadence | D30 | as proposed: once a day each, a twenty-fourth of them each hour |
| Engine proof status | D13 | not a proof; stage lives here |
| Kits ported back to the engine | D13 | built here first |
| Package id | D24, Engine-Builder's open question | `com.rcjlabs.liveyourlife` |
| Licence | none | all rights reserved |
| The slice's crime | DESIGN.md | shoplifting |
| The state for tax and law | D37 | Michigan |

## Open questions

1. Does the free first year end at the birthday even when the player is mid-sentence in prison or mid-pregnancy, or does it end at the next quiet morning?
2. Should D8's rating expectation be checked against the IARC questionnaire before the first store listing is drafted, or at Phase 3?
