# ROADMAP — Live Your Life (working title)

The plan for a life sim in a fictional Rust Belt city: isometric, drawn in code, for the browser and Google Play. The design is [docs/DESIGN.md](docs/DESIGN.md), the decisions are [docs/decisions.md](docs/decisions.md), and how the idea was found is [docs/BRAINSTORM.md](docs/BRAINSTORM.md).

How to read this file:

- Phases hold milestones. A milestone is done when its gates pass, not when its list is ticked. `[auto]` gates are checked by CI or a script; `[you]` gates need Evan's hands or phone.
- Work happens only at the **CURRENT MILESTONE** marker. Ideas that arrive outside it go under their phase, in "Ideas, not yet in a milestone".
- Every number in Readings names its instrument, date and N. A number marked (tune) is a proposal.

## Phase 0: Foundations

**Goal:** the repository can prove things before it has a game: a pure sim on the engine's kernel, bots, a renderer spike measured on a phone, and the two readings the design depends on.

- **M0.1 Repo and workspace.** ← **CURRENT MILESTONE**
  - A pnpm workspace. Engine-Builder as a git submodule pinned to a commit under `engine/`, its packages in the workspace.
  - `packages/sim` marked `"eb": { "pure": true }`, with one module (a clock) built with `defineModule` on `@eb/core`, and a test.
  - TypeScript strict, Biome, Vitest. CI runs typecheck, Biome, the engine's purity lint over this repo's pure packages, and the tests.
  - `apps/game`: a placeholder PWA page with `version.json`, deployed to GitHub Pages by Actions, the deploy confirmed against the live `version.json` (Dirtbag's and Engine-Builder's pattern).
  - CLAUDE.md's Commands section.
  - Done when: `pnpm check` is green in CI [auto]; the purity lint has been seen failing on a planted `Math.random` in `packages/sim`, then restored [auto]; the placeholder page is live, installs, and opens offline on Evan's phone [you].
- **M0.2 Kernel modules.** Time (a day in game minutes, advanced by actions), needs (the six in DESIGN.md), money (wages in, rent out), as modules on the engine's kernel; a week bot through `eb sim`.
  - Done when: the bot finishes 500 seeded weeks headless with no refused action it cannot recover from [auto]; needs decay and recovery match the (tune) table within a stated tolerance [auto]; the kernel's cost per action is in Readings [auto].
- **M0.3 The art spike (risk 1 in BRAINSTORM.md).** One city block, one interior with a cutaway, six procedural people with facings and outfits, walking and sitting, day and night, at 390 px.
  - The kill criterion, written before the spike: a stranger, from a 390 px screenshot, can tell who is working, sleeping or arguing, and which building is the restaurant.
  - Done when: the screenshots and the stranger's answers are in Readings with the date [you]; fps at speed 1 on Evan's phone is in Readings [you]; the decision (continue, or interiors as scenes) is in docs/decisions.md [you].
- **M0.4 The population harness (risk 2).** N named people with schedules, needs and relationships for 30 game days, at N = 100, 300, 1,000 and 3,000; ms per game minute in Node and in headless Chromium at 4× CPU throttle.
  - Done when: the readings are in the table [auto]; the tier-1 count is a decision in docs/decisions.md [you].

## Phase 1: The slice

**Goal:** one week of one life, whole, on a phone: one apartment, one job, one relationship, one crime, with bots playing it under a tap budget.

- **M1.1 A block.** The generator for one block: lots, two buildings with facade grammars, a street, the walk grid. Nothing placed by hand.
- **M1.2 Two interiors.** The apartment and the restaurant from templates, walkable, with cutaway walls.
- **M1.3 One job.** Line cook on the career template: shifts posted weekly, sign-up, pay, standing, fatigue; a shared pool of shift events by tag.
- **M1.4 One relationship.** A coworker with familiarity, regard and a memory of acts.
- **M1.5 One crime.** Shoplifting with the whole chain: witnesses, the odds shown, heat, a scheduled response the player sees first, charges, a fine or a record.
- **M1.6 Living in it.** The HUD, tap-to-go, the map, the chronicle, the clock's speeds and pauses.
- **M1.7 Saves.** The engine's snapshot-plus-log saves in IndexedDB, slots, quarantine, the first fixture.
- **M1.8 The browser bot.** Plays the week on a throttled phone profile and counts taps and real minutes per day.
- **M1.9 The playtest gate.** A tester brief (Rule or Drool's TESTERS.md is the model); five strangers' sessions recorded.

**Done when:** bots finish 500 seeded weeks headless and every event is reached [auto]; the browser bot's taps and minutes per day are under the budget set from M1.8's first reading [auto]; ≥30 fps at speed 1 on Evan's phone [you]; the first fixture save still loads [auto]; the content diff shows the slice whole, with none of the later game's text [auto]; five playtest sessions are logged [you].

## Phase 2: The first year

**Goal:** the free edition, whole: a year from the eighteenth birthday to the nineteenth, in two districts, with crime to the crew tier, law to detective, food to chef, relationships, children, aging and the heir.

- **M2.1 The city.** Districts, arterials, lots, building and household templates; two districts live, the rest as statistics.
- **M2.2 People.** Households and tier-1 people with schedules and offscreen progression.
- **M2.3 Careers.** The catalogue on the template: the first 30, with the labor market.
- **M2.4 Crime and law.** Crime to the crew tier and law to detective, sharing case files; courts; prison as time passing.
- **M2.5 Food.** Line cook to chef.
- **M2.6 Relationships.** Romance, marriage, children, custody.
- **M2.7 Lives.** Aging, illness, death, the heir and the ward.
- **M2.8 Education.** To community college.
- **M2.9 Travel.** Walking, bus, rideshare; travel time as the cost.
- **M2.10 Words.** The year's events and the voice pass on every string.
- **M2.11 Editions.** The demo/full split with the content diff, and the last card at the birthday.

**Done when:** a bot lives the year in 500 seeds and reaches the birthday or dies in each [auto]; the realism bars in docs/CALIBRATION.md pass [auto]; the voice pass is done [you]; a day plays on Evan's phone within the tap budget [you].

## Phase 3: The unlock and Play

The gate; Play Billing with the acknowledger; the TWA with the SDK floor check; `assetlinks.json` at the origin root; privacy and terms; store listing art drawn by the game; the tester link.

**Done when:** the internal test track has the build, and the unlock has been bought and restored on a device [you].

## Phase 4: Release-one depth

In the order of the cut ladder, reversed: crime above the crew tier; university and professional school; districts three to five; owned cars and driving; interiors beyond home, restaurant and precinct; federal law; medicine (EMT to physician, the hospital). Each becomes a milestone with its own gates when it opens.

## Later

Steam through Dirtbag's Electron shell. Other cities as places. Whatever Phase 4 deferred.

## Ideas, not yet in a milestone

- A per-district trend (growing, stable, declining) with closures and openings as events. Default: on, seeded.
- A second start option: full character creation at any adult age.
- Pets.
- Local politics as a signature career.
- A bicycle as a release-one travel verb.

## Readings

Nothing has been measured in this repository yet. The rows below are borrowed from the earlier games and say where from. Each is re-taken here before anything is built on it.

| Reading | Value | Instrument | Date | N |
| --- | --- | --- | --- | --- |
| Kernel reduce, borrowed (Engine-Builder) | 20–40 µs per action on the test game; 193 µs a turn with four kits | `packages/core/test/salvage-bench.ts`, Node 22, cloud container | 2026-10-17 and 18 | 5 runs each |
| Taps per day of a life sim, borrowed (Dirtbag) | 20 taps a day, 3 a trip, map plus scenes | Dirtbag's e2e bot on its build, per its ROADMAP | before 2026-10-18 | 5 days |
| Real-time 2D on a slow CPU, borrowed (2060TD) | 40 fps at 4× CPU slowdown, about 11 units on the field | `scripts/perf.mjs`, headless Chromium, per its ROADMAP | before 2026-10-18 | 1 battle |
| Largest browser sim, borrowed (Gridiron Eras) | 864 rostered players and 32 AI managers simulated per week; a 17.8 s main-thread block cut to 0.82 s by yielding per week | its DESIGN.md, throttled Android | before 2026-10-18 | 1 season |
| Derived world, borrowed (Landnám) | about 3 kB a save; about 2 ms an action with a full-state copy | its ROADMAP | before 2026-10-18 | — |
| Download, borrowed (Dirtbag, 2060TD) | 490 KB; 178 kB gzipped | `scripts/size.mjs`; `vite build` | before 2026-10-18 | 1 build each |
| Isometric figure legibility, borrowed (Climbing World Traveler) | a figure about 60 px tall is too small to read moves on a phone | `docs/25-visual-representation.md`, style 4 | before 2026-10-18 | 1 style test |
| 3D in the browser, borrowed (Engine-Builder) | 5,000 instanced trees, about 0.5 M triangles; Rapier 1.67 MB gzipped; no phone reading taken | `apps/spike-3d`, headless Chromium | 2026-10-17 | 1 build |

## Changelog

- 2026-10-19: The design docs: BRAINSTORM.md, decisions D1–D25, DESIGN.md, VOICE.md, CALIBRATION.md, the portfolio survey, and this roadmap. No code.

## Open questions

1. The title (D24).
2. The city's name, the base year, and whether the district trend is on by default.
3. The tick in game minutes and the speed steps (proposals in DESIGN.md), set from M1.8's reading.
4. The tier-1 count (M0.4).
5. Whether this game becomes an Engine-Builder proof, which would reopen that project's build order (3D before 2D).
6. How the kits a life sim needs (needs and mood, relationships, schedules, careers, law) move back into Engine-Builder, and when.
7. The package id scheme, shared with Engine-Builder's open question (`io.github.rcjlabs.*` or `com.rcjlabs.*`).
8. The licence. Until decided, all rights reserved.
