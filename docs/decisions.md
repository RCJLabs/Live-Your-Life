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
| The tier-1 count | M0.4 | a few hundred to about a thousand |
| Engine proof status | D13 | not a proof; stage lives here |
| Kits ported back to the engine | D13 | built here first |
| Package id | D24, Engine-Builder's open question | `com.rcjlabs.liveyourlife` |
| Licence | none | all rights reserved |
| The slice's crime | DESIGN.md | shoplifting |

## Open questions

1. Does the free first year end at the birthday even when the player is mid-sentence in prison or mid-pregnancy, or does it end at the next quiet morning?
2. Should D8's rating expectation be checked against the IARC questionnaire before the first store listing is drafted, or at Phase 3?
