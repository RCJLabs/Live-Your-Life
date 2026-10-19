# ROADMAP — Live Your Life (working title)

The plan for a life sim in a fictional Rust Belt city: isometric, drawn in code, for the browser and Google Play. The design is [docs/DESIGN.md](docs/DESIGN.md), the decisions are [docs/decisions.md](docs/decisions.md), and how the idea was found is [docs/BRAINSTORM.md](docs/BRAINSTORM.md).

How to read this file:

- Phases hold milestones. A milestone is done when its gates pass, not when its list is ticked. `[auto]` gates are checked by CI or a script; `[you]` gates need Evan's hands or phone.
- Work happens only at the **CURRENT MILESTONE** marker. Ideas that arrive outside it go under their phase, in "Ideas, not yet in a milestone".
- Every number in Readings names its instrument, date and N. A number marked (tune) is a proposal.

## Phase 0: Foundations

**Goal:** the repository can prove things before it has a game: a pure sim on the engine's kernel, bots, a renderer spike measured on a phone, and the two readings the design depends on.

- **M0.1 Repo and workspace.** Done, 2026-10-19.
  - A pnpm workspace. Engine-Builder as a git submodule pinned to a commit under `engine/`, its packages in the workspace.
  - `packages/sim` marked `"eb": { "pure": true }`, with one module (a clock) built with `defineModule` on `@eb/core`, and a test.
  - TypeScript strict, Biome, Vitest. CI runs typecheck, Biome, the engine's purity lint over this repo's pure packages, and the tests.
  - `apps/game`: a placeholder PWA page with `version.json`, deployed to GitHub Pages by Actions, the deploy confirmed against the live `version.json` (Dirtbag's and Engine-Builder's pattern).
  - CLAUDE.md's Commands section.
  - Done when: `pnpm check` is green in CI [auto]; the purity lint has been seen failing on a planted `Math.random` in `packages/sim`, then restored [auto]; the placeholder page is live, installs, and opens offline on Evan's phone [you].
  - **Done, 2026-10-19: every gate passed.** CI went green on PR #1 and on `main`; the deploy's confirm job saw the live `version.json` name `4b4956e` and the engine's site-check passed on the live page; Evan installed the page on his phone and it opened offline.
    - The engine is pinned at `ca92793` (its M3.4). Only `@eb/core` and `@eb/purity` join the workspace.
    - The clock is the engine's time module on this game's calendar (`packages/sim/src/calendar.ts`, D26), plus a `clock` module of its own: hour and minute facts, and the verb "wait until a time of day". The engine's time module already owned the tick, timers and wall-clock time, so a second clock would have been a copy.
    - The engine's lint-boundaries resolves the engine's own root and can't be pointed here, so `tools/purity` applies the same rules (`@eb/purity`) to this repo's pure packages. It was seen failing on a `Math.random` planted in `packages/sim/src/clock.ts`, then restored; its test builds a workspace with one planted case per rule and runs on every push.
    - Planted bugs: 8 (the lint gate, the weekday anchor, the weekday rotation, a phase edge, a season start, waiting at the same time of day, the minute bound, the speed), 8 caught.
    - The page runs the clock in the browser through a session, the stage passing each frame's milliseconds as `time/elapse`. Headless Chromium passed 15 checks on `vite preview`, including offline reload, no overflow at 360 and 390 px and in landscape, and nothing requested from another site; the engine's site-check passed on the same build.
- **M0.2 Kernel modules.** Done, 2026-10-19. Needs (the six in DESIGN.md) and money (wages in, rent out) as modules beside the clock; a week bot through `eb sim`, which brings the engine's CLI and its packages into the workspace.
  - Done when: the bot finishes 500 seeded weeks headless with no refused action it cannot recover from [auto]; needs decay and recovery match the (tune) table within a stated tolerance [auto]; the kernel's cost per action is in Readings [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check`.
    - 500 seeded weeks with the steady bot (`packages/sim/src/week.test.ts`): every run stopped on the morning of day 7, none capped, no offer refused. 200 weeks with the random bot, which takes any offer at all: none refused either. 20 runs replay from their logs to the same state.
    - The default start meets no rent day in its first week, so 200 more weeks start on Monday 30 June. The rent comes due that midnight, before any pay, and the cash can't cover it. In every run the rent is owed rather than refused, and the steady bot pays it off after Friday's pay, so the gate's recovery is exercised and not only claimed.
    - The tolerance is none. Levels are whole numbers, and every row of the table is exact at 1, 3 and 8 hours (`needs.test.ts`). The test reads the table out of DESIGN.md, so the code can't drift from the design.
    - The cost per action is in Readings: the kernel's reduce takes 48.9 µs an action at the median over five rounds; a turn with the bot choosing takes 103.6 µs.
    - The modules are `life` (the six needs, settled per activity, and the verb `life/do`), `job` (one placeholder shift, paid on Fridays) and `home` (rent on the 1st; what can't be paid is owed). The cash is the engine's economy kit, so `@eb/kits` joins the workspace. The figures are placeholders (CALIBRATION.md).
    - Not through `eb sim`. The CLI compiles an engine content project (`@eb/compiler`, `@eb/schema`, `@eb/script`) before it plays, and this game has no content yet. The bots run on the runner the CLI calls (`sweep` and `playRun` in `@eb/core`). `eb sim` and its golden files come with `packages/content`.
    - Planted bugs: 18, 18 caught. The planted bugs were:
      - the minute a need runs out rounded down;
      - health's penalty counted from the end of a stretch;
      - the clamp at zero;
      - one rate in the code (the table test);
      - a shift's minutes not paid;
      - a meal offered without the cash;
      - the end of a shift not enforced;
      - the shift's first minute;
      - the hourly wage divided by 100;
      - rent not owed;
      - the next rent a day late;
      - payday every two weeks;
      - the bot never working;
      - a week of eight days;
      - a payday due now waiting no time;
      - `Date.now` in `life.ts` (the purity check);
      - the bot never paying what is owed;
      - paying it off offered without the cash.
- **M0.3 The art spike (risk 1 in BRAINSTORM.md).** ← **CURRENT MILESTONE** One city block, one interior with a cutaway, six procedural people with facings and outfits, walking and sitting, day and night, at 390 px.
  - The kill criterion, written before the spike: a stranger, from a 390 px screenshot, can tell who is working, sleeping or arguing, and which building is the restaurant.
  - Done when: the screenshots and the stranger's answers are in Readings with the date [you]; fps at speed 1 on Evan's phone is in Readings [you]; the decision (continue, or interiors as scenes) is in docs/decisions.md [you].
  - **Built, 2026-10-19. The three gates are Evan's and are open.** The tester brief, its screenshots and the phone reading's steps are in [docs/research/art-spike.md](docs/research/art-spike.md).
    - The game's page is the spike (D29). One street, three lots and two interiors (D27) come from a seed and templates; six people are scripted; the sim keeps the clock. `@lyl/stage` draws it.
    - People are 23–25 CSS px tall in the wide framing at 390 px, which holds the diner and the flat side by side; 33–40 px close up on one building; 35–38 px in landscape (Readings). Climbing World Traveler found 60 px too small to read moves.
    - In headless Chromium with the CPU slowed four times, the page draws 33.8 fps by day and 19.1 at night, against 14.1 when every piece is drawn every frame. The still picture is kept between frames, and only the people, the griddle and what stands in front of them are drawn again; a browser check holds the kept picture to the full one. The phone reading is the gate.
    - Checks:
      - unit tests of the projection, camera, light and sort;
      - whole scenes drawn into a fake canvas that fails on any non-finite number;
      - tests of the block's generator;
      - Playwright in CI with Engine-Builder's checks: errors, overflow at 360 and 390 px and in landscape, 44 px targets, axe;
      - the controls, offline, nothing asked of another site.
    - Planted bugs: 28, 28 caught. The light test caught its bug only after it was made to require darkness halfway through dusk; the first version let a dusk that never darkens through.
- **M0.4 The population harness (risk 2).** N named people with schedules, needs and relationships for 30 game days, at N = 100, 300, 1,000 and 3,000; ms per game minute in Node and in headless Chromium at 4× CPU throttle.
  - Done when: the readings are in the table [auto]; the tier-1 count is a decision in docs/decisions.md [you].
  - **Done, 2026-10-19: both gates passed.** It was built alongside M0.3's open gates, on Evan's word ("Merge it and continue"). The readings are in Readings, and Evan set the tier-1 count at 1,000 (D31). The readings in full, and the case, are in [docs/research/population.md](docs/research/population.md).
    - The people are pure modules in `packages/sim/src/people/`. Who they are comes from the seed, their hours from templates (tune), their needs from the player's own math, and their ties from meetings at shared places.
    - The harness is `tools/population`: a Node bench, and the same code in a page that headless Chromium runs at full CPU and slowed four times. 500 joins the four sizes, because risk 2's kill criterion names it.
    - Three cadences were measured. Moving everyone every game hour spends most of each batch in the kernel's copy of the slice: 15.4 of 22 ms at 1,000 people with the CPU slowed four times. Kept in 24 shares, one moved on a whole day each hour (D30, proposed), the batch is 4.2 ms on average and 7.9 at the 95th. The levels and ties are the same at every cadence.
    - Risk 2 passes at that cadence. At 500 people the 95th is 5.7 ms and the worst 10.6, inside a frame.
    - The needs math is now six times faster and the same to the unit. Health's walk allocates nothing and is bounded, so a slip in it fails the tests rather than hanging them.
    - Two findings for the engine are open questions 14 and 15: the copy on every write, and the cap of 10,000 timer firings an advance.
    - Planted bugs: 22, 22 caught. Two needed a change first.
      - In health's walk, one wrong comparison hung the tests rather than failing them. The walk is now bounded.
      - A night shift's morning moved to the wrong day, and no test saw it, because a week's hours still added up. A test now holds each shift to one run of hours.
    - The planted bugs were:
      - health counting a need out a minute late;
      - health falling at one rate however many needs are out;
      - hygiene at food's rate;
      - a night shift running on into the wrong morning;
      - everyone out twice as often;
      - bedtime ignoring the trip to work;
      - the shift pick stuck on the first;
      - a person meeting themselves;
      - a meeting on one list only;
      - meetings in reverse order;
      - a plan forgetting its weekday;
      - the last run of an activity never settled;
      - a long span keeping its first day's weekday;
      - the start weekday taken as today's;
      - shares overlapping;
      - the effect named apart from its timer;
      - the hourly timer ignoring the start minute;
      - every staggered share due at midnight;
      - a full list giving up ties met three times;
      - the harness counting the first day's batches;
      - the harness dividing by hours, not minutes;
      - the sweep skipping the staggered cadence.

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

Rows marked "borrowed" come from the earlier games and say where from. Each is re-taken here before anything is built on it.

| Reading | Value | Instrument | Date | N |
| --- | --- | --- | --- | --- |
| Game JS, gzip (M0.1 placeholder) | 13.08 kB (35.51 kB raw) for the page, the engine's kernel and time module, and the clock; workbox-window 2.20 kB; CSS 0.71 kB | `vite build` output | 2026-10-19 | 1 build |
| Game precache (M0.1) | 16 entries, 80.04 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| Game JS, gzip (M0.2) | 17.65 kB (49.50 kB raw), now with the economy kit and the life, job and home modules; workbox-window 2.20 kB; CSS 0.71 kB | `vite build` output | 2026-10-19 | 1 build |
| Game precache (M0.2) | 16 entries, 93.70 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| Kernel cost per action (M0.2) | reduce alone, replaying the logs: median 48.9 µs an action (45.6–49.8); the sweep, the steady bot choosing: median 103.6 µs a turn (96.4–106.7); six modules: time, the economy kit, clock, life, job, home | `node packages/sim/test/week-bench.ts`, 500 weeks and 51,706 actions a round, Node 22.22.0, cloud container | 2026-10-19 | 5 rounds |
| A week of life, steady bot (M0.2) | 103.4 turns a week (95% 102.9–103.9; 88 to 131); 499 different end states; no refusals; health at the end 94–100%; cash at the end $484.00–$712.75, from $300 | the runner's `sweep` and `formatSweep`, `seedsOf(500, 'week')` | 2026-10-19 | 500 weeks |
| A week of life, random bot (M0.2) | 25.9 turns a week (13 to 42); no refusals; health at the end 0% at the median (13% at most), since nothing follows from it yet | the same, `seedsOf(200, 'random')` | 2026-10-19 | 200 weeks |
| Rent in the first week, steady bot (M0.2) | from Monday 30 June: rent came due and was paid off in every run, no refusals, health at the end 93–100%, cash at the end $31.50–$162.75. From Sunday 29 June: 19 runs still owed it at the end, and one, paying it off down to $2, could not buy a meal and fell to 23% health | the runner's `sweep`, `seedsOf(500, 'rent')`, from each start | 2026-10-19 | 500 weeks each |
| People's height, art spike (M0.3) | wide framing at 390×844, the diner and the flat side by side: 23–25 CSS px; close on one building: 33–40; landscape at 844×390: 35–38 | `node apps/game/e2e/shots.ts`: the stage's own measure of each standing figure, seed `rust-belt-1` | 2026-10-19 | 4 standing people a frame |
| Frame rate, art spike, headless (M0.3) | 60 fps at full CPU on every path. At 4× CPU, median 33.8 fps with the kept still picture by day (95th frame 49.9 ms), 19.1 at night, 14.1 with every piece drawn every frame | `node apps/game/e2e/perf.ts`: the page's Measure, 10 s at speed 1, headless Chromium 141 at 390×844 and 2×, no GPU, cloud container | 2026-10-19 | 3 runs each |
| Game JS, gzip (M0.3) | 37.47 kB (100.13 kB raw), now with the stage and the spike; CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M0.3) | 16 entries, 144.76 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| Tier-1 people, a batch with the CPU slowed 4× (M0.4) | D30's staggered cadence: 1,000 people take 4.2 ms an hour on average, 7.9 at the 95th, 18.4 at worst; 500 people 2.9, 5.7, 10.6; 3,000 people 10.3, 17.1, 49.7. Everyone every hour, at 1,000: 22.0, 37.5, 64.3; everyone at midnight: 47.4, 54.8, 58.2. Per game minute at 1,000: 0.069 ms staggered, 0.366 every hour, 0.034 at midnight | `node tools/population/chromium.ts 30`: headless Chromium 141, the CPU throttled 4× by the DevTools protocol, cloud container, no GPU; the first game day left out | 2026-10-19 | 30 game days each: 696 batches, or 29 at midnight |
| Tier-1 people at full CPU (M0.4) | 1,000 people, staggered: 0.79 ms an hour on average and 1.2 at the 95th in Node, 0.84 and 1.2 in Chromium. Everyone every hour: 5.0 and 7.9; 4.9 and 8.6 | `node tools/population/bench.ts 30`, Node 22.22.0; the Chromium run above at 1× | 2026-10-19 | 30 game days each |
| The kernel's copy and freeze of one slice (M0.4) | 54,000 numbers (1,000 people): 3.0 ms at full CPU, 15.4 ms at 4×. A lean copy beside the kernel: 1.3 and 6.2 ms. One share of 24: 0.10 and 1.05 ms | the harness's split, timing the engine's own `cloneJson` and `freezeJson` in Chromium | 2026-10-19 | the median of 15 |
| A month in one action, tier-1 people (M0.4) | at 4×: 1,000 people in 1.05 s staggered, 0.83 s at midnight, 1.82 s every hour; 3,000 people in 2.87 s staggered | the harness, after each 30-day run | 2026-10-19 | 1 each |
| Tier-1 people in a save (M0.4) | 54 numbers a person: 187 kB of canonical JSON at 1,000 people, 601 kB at 3,000 | the harness, `canonicalJson` | 2026-10-19 | 1 each |
| The stranger test (M0.3) | not taken yet | docs/research/art-spike.md | — | — |
| Frame rate on Evan's phone (M0.3) | not taken yet | the page's Measure | — | — |
| The clock at speed 1, in a browser (M0.1) | 6 game minutes in 3.1 s, against 2 a second by design; pause held it still for 1.6 s | a one-off Playwright script on `vite preview` at 390×844, headless Chromium 141, cloud container | 2026-10-19 | 1 run |
| Kernel reduce, borrowed (Engine-Builder); re-taken here as "Kernel cost per action (M0.2)" | 20–40 µs per action on the test game; 193 µs a turn with four kits | `packages/core/test/salvage-bench.ts`, Node 22, cloud container | 2026-10-17 and 18 | 5 runs each |
| Taps per day of a life sim, borrowed (Dirtbag) | 20 taps a day, 3 a trip, map plus scenes | Dirtbag's e2e bot on its build, per its ROADMAP | before 2026-10-18 | 5 days |
| Real-time 2D on a slow CPU, borrowed (2060TD) | 40 fps at 4× CPU slowdown, about 11 units on the field | `scripts/perf.mjs`, headless Chromium, per its ROADMAP | before 2026-10-18 | 1 battle |
| Largest browser sim, borrowed (Gridiron Eras) | 864 rostered players and 32 AI managers simulated per week; a 17.8 s main-thread block cut to 0.82 s by yielding per week | its DESIGN.md, throttled Android | before 2026-10-18 | 1 season |
| Derived world, borrowed (Landnám) | about 3 kB a save; about 2 ms an action with a full-state copy | its ROADMAP | before 2026-10-18 | — |
| Download, borrowed (Dirtbag, 2060TD) | 490 KB; 178 kB gzipped | `scripts/size.mjs`; `vite build` | before 2026-10-18 | 1 build each |
| Isometric figure legibility, borrowed (Climbing World Traveler) | a figure about 60 px tall is too small to read moves on a phone | `docs/25-visual-representation.md`, style 4 | before 2026-10-18 | 1 style test |
| 3D in the browser, borrowed (Engine-Builder) | 5,000 instanced trees, about 0.5 M triangles; Rapier 1.67 MB gzipped; no phone reading taken | `apps/spike-3d`, headless Chromium | 2026-10-17 | 1 build |

## Changelog

- 2026-10-19: The design docs: BRAINSTORM.md, decisions D1–D25, DESIGN.md, VOICE.md, CALIBRATION.md, the portfolio survey, and this roadmap. No code.
- 2026-10-19: M0.1 built. The pnpm workspace, with Engine-Builder pinned at `ca92793` as a submodule; `@lyl/sim` with the game's calendar (D26, proposed) and the clock on the engine's time module; the purity check; the placeholder PWA, which runs the clock; CI with the Pages deploy and the live `version.json` confirm. The [you] gate is open.
- 2026-10-19: M0.1 done. PR #1 merged as `4b4956e`; the deploy confirmed live; the page installed and opened offline on Evan's phone. The marker moves to M0.2.
- 2026-10-19: M0.2 done. The six needs, a placeholder job and rent, as modules on the engine's kernel and economy kit; two week bots on the engine's runner, and the bench. 500 seeded weeks refuse nothing, 200 more that start before a rent day owe it and pay it off, and the needs match DESIGN.md's table exactly. Planted bugs: 18, 18 caught. The marker moves to M0.3.
- 2026-10-19: M0.3 built. The stage, `@lyl/stage`, draws the city in code; the game's page is the art spike (D27–D29), with the tester brief and its screenshots in docs/research/art-spike.md. Planted bugs: 28, 28 caught. The [you] gates are open.
- 2026-10-19: M0.4 done, built alongside M0.3's open gates on Evan's word. The tier-1 people (`packages/sim/src/people/`) and the population harness (`tools/population`), in Node and in headless Chromium. Three cadences measured; D30 proposes the staggered one, and risk 2 passes at it. Planted bugs: 22, 22 caught. Evan set the tier-1 count at 1,000 (D31). The marker stays on M0.3, whose gates are open.

## Open questions

1. The title (D24).
2. The city's name, the base year, and whether the district trend is on by default.
3. The tick in game minutes and the speed steps (proposals in DESIGN.md), set from M1.8's reading.
4. Whether D31's 1,000 tier-1 people hold when M2.2 gives them their real state and choices, or the count drops to 500.
5. Whether this game becomes an Engine-Builder proof, which would reopen that project's build order (3D before 2D).
6. How the kits a life sim needs (needs and mood, relationships, schedules, careers, law) move back into Engine-Builder, and when.
7. The package id scheme, shared with Engine-Builder's open question (`io.github.rcjlabs.*` or `com.rcjlabs.*`).
8. The licence. Until decided, all rights reserved.
9. A domain of its own (`*.rcjlabs.com`) before M1.7's saves and Phase 3's TWA. `rcjlabs.github.io` is one origin for every RCJ Labs project site, so its storage is shared, and `assetlinks.json` can't sit at its root. It waits on the title (D24).
10. The replay log at frame rate. The stage sends one `time/elapse` a frame, so a session logs about 60 actions a second. Before M1.7's saves: merge consecutive elapses in the log, or send time less often and let the stage interpolate.
11. The engine offers its stage-only verbs, `time/elapse` and `time/advance`, to bots with an empty payload. Elapse refuses it, and advance spends no time. This game's bots skip both (`STAGE_ONLY` in `packages/sim/src/bot.ts`). To raise in Engine-Builder: a way to mark a verb as never offered.
12. Portrait or landscape for the city view. At 390 px portrait, two buildings in frame make people 23–25 px tall; landscape about 36 px (Readings). The stranger test says whether portrait is enough.
13. The kept still picture is repainted whole on every pan, so a long drag may stutter on a slow phone at night. If the phone reading shows it: keep a margin round the screen in the layer, or repaint only the strip a pan uncovers.
14. The engine copies a module's whole slice, element by element, in every action that writes to it, and freezes it again with a path built for every element. At 54,000 numbers that is 15.4 ms with the CPU slowed four times (Readings). D30's shares work round it here. To raise in Engine-Builder: copy arrays of numbers in one pass, and build a bad element's path only when there is one. A lean version beside the kernel was 2.5 times faster.
15. The engine fires at most 10,000 timers in one advance. An hourly timer, as D30's is, caps one action at about 416 days, and D19's skip to an heir's 18th birthday passes years. Before M2.7: pass long skips in several actions, or catch the people up in one effect. Or raise in Engine-Builder a way to fire a repeating timer's missed periods at once.
