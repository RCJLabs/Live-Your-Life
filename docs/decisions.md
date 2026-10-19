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

---

## Open items

| Item | Where it is decided | Default until then |
| --- | --- | --- |
| The title | D24 | "Live Your Life" |
| The city's name | D15 | none |
| The base year | D15 | 2025 dollars |
| The calendar | D26 | as proposed: 365-day years, four parts of the day, meteorological seasons |
| A domain of its own | ROADMAP open question 9, after D24 | `rcjlabs.github.io/Live-Your-Life/` |
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
