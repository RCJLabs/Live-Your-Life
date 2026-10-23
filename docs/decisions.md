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
