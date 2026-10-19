# The portfolio survey: what the earlier games lend this one

A read-only survey of the 21 RCJ Labs and evangcook repositories, done 2026-10-18 from shallow clones (one commit each, so no history), to find what a life sim could reuse and what the browser had already carried. Engine-Builder's own survey (`docs/research/existing-games.md` there, 2026-10-17) covers the shared core; this one looks for life-sim systems, world tech and the lessons.

Paths are relative to each repository's root. "Inference" marks a conclusion the code does not state.

## The repositories

| Repo | What it is | Maturity | Stack, rendering | What it lends this game |
| --- | --- | --- | --- | --- |
| Engine-Builder | A browser game engine and editor: the shared core | Phase 3 of 11 (M3.5); the editor live at engine.rcjlabs.com; no game ships on it yet | pnpm, TS 7, a Preact editor; a pure kernel | the kernel (`packages/core/src/sim`), time with calendars and timers (`src/time`), saves with migrations and quarantine (`src/save`, `packages/platform`), conditions and effects, trigger sheets, kits (`packages/kits`: inventory, loot, economy, stats, gear), `eb sim` bots, schemas and the compiler, the purity lint (`tools/lint-boundaries`); its roadmap's Phases 4–7 for UI, worlds, NPCs and 2D |
| Dirtbag | A climbing life sim: van, shifts, people, a five-act story | Shipped: web, Play TWA with billing; a Steam shell built | TS, React panels over one Canvas2D canvas, art drawn in code | the closest precedent: `app/src/sim/` with `jobs.ts`, `work.ts`, `body.ts`, `psyche.ts`, `clinic.ts`, `sick.ts`, `van.ts`, `spots.ts`, `romance.ts`, `crew.ts`, `folks.ts`, `ageing.ts`, `epilogue.ts`, `heir.ts`; people and their lives derived from the seed (`presence.ts`, `lives.ts`); the painters (`app/src/view/paint/people.ts`, one IK rig); the Play pipeline (`twa/`, `acknowledge.mjs`, `.well-known/assetlinks.json`, `build-twa.yml`); the gate and editions (`game/unlock.ts`, `*.full.ts` with `*.demo.ts` twins); the Electron shell (`desktop/`); the v0.956 audit (`docs/AUDIT.md`) |
| Dirtbag-UE | The Unreal brainstorm and a C++ sim core | Paused; no Unreal project | docs, C++ | the brainstorm format and the design DNA (`BRAINSTORM.md`); kill criteria written first (`concepts/DIRTBAG-PLAN.md`); content-volume limits (`concepts/THREE-WINTERS.md`) |
| Landnám | Viking survival strategy: a coast, shield walls, a steading | Playable and published | vanilla TS, inline SVG, one file | needs (`src/sim/needs.ts`), mood drift by temper (`src/sim/minds.ts`), the ordered daily tick (`src/sim/upkeep.ts`), grudges and feuds (`src/sim/outlaw.ts`, `household.ts`, `kin.ts`), a coast derived from the seed and 3 kB saves, named RNG streams (`src/rng.ts`), the chronicle voice (`sagagen.ts`), "a number is a reading" (`CLAUDE.md`) |
| landnam-ue | The Unreal port of Landnám | Frozen 2026-08-25 | UE 5.8, C++ | hex A* in C++ (`Source/LandnamUE/LandnamHex.cpp`); the parity method against golden runs |
| Ludus (LVDVS) | Gladiator school management | Shipped, v3.312 | React, one file, SVG | generations: marriage, children, upbringing, succession (`src/ludus.jsx`, about lines 10045–10570); per-person memory of acts (`REGARD`, line 9295); ties from shared activity (`weaveTies`); loans and foreclosure; "cruelty is permitted, never optimal" (`INSTRUCTIONS.md`); Monte Carlo at N ≥ 800 |
| Gridiron Eras | An all-time football GM sim | Shipped | vanilla JS, DOM and SVG | the largest browser sim: 864 rostered players, 32 AI managers; aging curves per attribute (`src/engine/careers.js`); the employer model (`src/engine/jobs.js`); yield-per-week fast-forward (`src/engine/autosim.js`); worker-packed saves (`src/save-worker.js`); calibration against real data (`scripts/realism.mjs` and kin) |
| Spliceworld | A creature ranch with battles | Playable, R214 | vanilla JS, SVG from a genome | heat with a half-life and raids scheduled as timestamps the player sees first (`campaign/operations.js`, `campaign/taskforce.js`); real time with offline catch-up (`ranch/ranch.js`); Mendelian heredity (`ranch/breeding.js`); 66 migrations with fixture saves; 647 planted defects (`tools/battery.js`) |
| Space-Wrecked | Ship builder, sector run, boarding tactics | In development, M38d | vanilla JS, its own 3D on Canvas2D | utility AI (`src/sim/ai.js`); a heat meter (`src/sim/heat.js`); faction standing moving prices (`src/sim/standing.js`); events, quests and contracts as JSON (`data/`); one grid model (`src/sim/grid.js`); `src/render/painter.js` |
| Chooser of the Slain | A Valkyrie's judgment game | Campaign playable | a Preact monorepo | the target and edition matrix (`packages/content-schema/src/targets.ts`), the leak check (`tools/leak-check`), the Electron and Steam shell (`apps/electron`), platform adapters, spatial focus and gamepad (`packages/ui/src/spatial.ts`, `gamepad.ts`), the Ink player (`packages/story`), the testkit's compare |
| Climbing World Traveler | A climbing career sim | P1 playable, P2 under way | Preact, Canvas2D | life-sim design docs (`docs/11` to `15`: day blocks, aging, injury, economy, an NPC lifecycle progressed every 28 days, relationships, events); an isometric projector in code (`scripts/dev/visual-styles/src/s04-iso.js`); the harness at scale (`scripts/harness.ts`); a content pipeline with a real-name blocklist |
| Project Ascent | A climbing training app with one minigame | 371 milestones, live | React, zustand, idb | lessons for a large state model: split stores, one derived reader (`src/engine/derive.ts`), perf budgets as tests (`src/perf.test.ts`), code splitting; a 120 Hz fixed-tick minigame |
| 2060TD | Tower defense and base builder | Live, v1.76 | TS, its own Canvas2D stage | the stage (`src/game/stage/`: baked ground, pooled text), 20 ticks a second with interpolation (`src/sim/engine.ts`), time-weighted A* (`src/sim/pathfinding.ts`), perf scripts (`scripts/perf.mjs`), a decisions "constitution" (`docs/DECISIONS.md`) |
| Afterglass | A side-view keep builder; the dead return at night | Playable prototype | vanilla JS, a pixel kit | a 10 Hz fixed tick with speeds (`prototype/src/page/clock.js`), the pixel kit with pinch zoom (`prototype/src/px/kit.js`), light-aware routes (`prototype/src/slice/geo.js`), named people across generations, brainstorm rounds with kill-if criteria (`docs/brainstorm/`) |
| Rule or Drool | A political card swiper | v0.103; a Play listing prepared | React, SVG | the card event engine at 1,841 cards; backlog rounds (`BACKLOG-*.md`); a voice pass (`VOICE-PASS.md`); a tester brief and run recorder (`TESTERS.md`) |
| Sandbagged | A climbing card battler | Live, v10.93 | React | a harness ledger (`sim/`), planted-bug tests (`sim/mutants.mjs`), specs that say what they deliberately do not do (`design/rope-2.md`) |
| Who Am I | A local-first personality profiler | Live | Svelte | a content compiler with coded diagnostics (`src/compiler/`); the conditions engine since ported to the engine; a profile format a game could read (`docs/PROFILE_FORMAT.md`) |
| Wasteland Protocol | A squad roguelike | Playable | one JS file, WebP art | an art prompt and provenance log (`ART_PROMPTS.md`); a delayed-consequence pool; sector-map validation |
| Post-Apocalypse RPG v2 | Wasteland Protocol's ancestor | Prototype | one HTML file | the progression from raw PNGs to a pipeline |
| Fantasy Football App | A Sleeper decision assistant | Live | Preact, idb | a data pipeline from parquet in Actions; a client-side, bring-your-own-key model call grounded in fact ids (not used here) |
| Mythos Clash | A Base44 card battler | Prototype | React, Deno functions | little: server-authoritative and non-deterministic |

## The ceilings

| Thing | Best reading | Where, instrument |
| --- | --- | --- |
| Simulated people | 864 rostered players plus a pool of about 1,269, 32 AI managers, per week; a 17.8 s main-thread block on throttled Android cut to 0.82 s by yielding per week; 2.4 MB saves packed in a worker | Gridiron Eras, `DESIGN.md` |
| Deep lifecycles at once | a few dozen named, aging people over 520 weeks | Ludus, its probes |
| Sim cost per action | 20–40 µs on the kernel's test game; 193 µs a turn with four kits | Engine-Builder, `salvage-bench.ts`, `hangar-bench.ts` |
| A whole-state copy per action | about 2 ms | Landnám, its ROADMAP |
| Real-time 2D | 20 ticks a second, 40 fps at 4× CPU slowdown, about 11 units | 2060TD, `scripts/perf.mjs` |
| 3D | 256² terrain, 5,000 instanced trees, about 0.5 M triangles; Rapier 1.67 MB gzipped; no phone reading | Engine-Builder, `apps/spike-3d` |
| Taps per day of life-sim play | 20 a day, 3 a trip | Dirtbag's e2e bot |
| Download | 490 KB (Dirtbag), 178 kB gzipped (2060TD) | their size scripts |
| Offline people | an NPC lifecycle progressed every 28 game days; 1,000 ten-year careers in about 1.5 h on 4 processes | Climbing World Traveler, `docs/15`, `docs/28` |

## The lessons

**Dirtbag v0.956's audit** (`docs/AUDIT.md`), the one time the studio built a walkable 3/4 town with sprite packs:

- 12 walkable zones as DOM dioramas of hand-placed `<img>` props, "1,134 placements of 211 sprites", "137 hand-tuned per-sprite boxes", a joystick, and a level editor that exported layouts "to paste into a chat".
- "The problem isn't mainly the packs. It's the approach: a walkable, scrolling town built by hand-placing props."
- "The town is the most expensive part of the game to build and the least valuable over a run."
- "Stick RPG's appeal was never the walking. It was the stat, job and money loop in a town small enough to hold in your head."
- Its first root cause was "Accretion without consolidation": one 66,000-line component, 498 save fields, about 28 progress systems, money that stopped mattering by day 12–15, a clock that ran in Settings and hidden tabs.
- The rebuild measured 3 taps a trip and 20 taps a day with a map and scenes.

**The Unreal detour.** Tried for free photoreal environments and for what 3D buys a shield wall. Stopped because the editor cannot run in the cloud workflow, animation and IK were unfamiliar, open-world content volume kills a solo dev ("One district, not a continent", `concepts/THREE-WINTERS.md`), and running two projects split focus. Engine-Builder's D1 then locked browser-first TypeScript. The method survived: prove the hard part small, write the kill criteria first, keep the sim free of any engine so the TypeScript is the spec.

**The design DNA** (`Dirtbag-UE/BRAINSTORM.md`, 2026-08-15): named people never units; the environment is the antagonist; ethics are gameplay with consequences seasons later; legacy and generations, aging is load-bearing; solo-dev scope discipline. This game keeps four and replaces "you don't kill anything" on purpose (DESIGN.md, pillar 3).

**Recurring habits worth keeping:** a ROADMAP with a CURRENT MILESTONE and "done when" gates; decisions dated, LOCKED, PROPOSED or OPEN; numbers as readings with instrument, date and N; a check that has been seen failing; bots and planted-bug tests; content as data with coded diagnostics; saves with migrations and fixtures; offline PWAs with prompt updates and `version.json`; custom `*.rcjlabs.com` domains so `assetlinks.json` sits at the origin root; art and sound in code; cut lists and "what this deliberately does not do".

**Recurring risks:** human playtests deferred ("testers carried"; Rule or Drool's "never done"); accretion; budgets that grow (Dirtbag's download from 250 to 490 KB in three weeks).

## The reuse map, by system

| System here | Port from |
| --- | --- |
| Needs and mood | Landnám `src/sim/needs.ts`, `minds.ts`, `upkeep.ts`; Dirtbag `app/src/sim/body.ts`, `psyche.ts` |
| People and looks | Dirtbag `presence.ts`, `lives.ts`, `view/paint/people.ts`; Landnám `render/look.ts`, `src/sim/people.ts`, `src/data/traits.ts` |
| Relationships and memory | Ludus `REGARD`, `remember()`, `weaveTies`; Landnám's grudges; Dirtbag `romance.ts`, `crew.ts`, `folks.ts` |
| Aging, death, the heir | Gridiron Eras `src/engine/careers.js`; Dirtbag `ageing.ts`, `epilogue.ts`, `heir.ts`; Ludus `domus`, `succeed()` |
| Careers and the labor market | Gridiron Eras `src/engine/jobs.js`; Dirtbag `jobs.ts`, `work.ts`, `business.ts`; Rule or Drool's card engine for shift events |
| Crime, heat, law | Spliceworld `campaign/operations.js`, `taskforce.js`; Space-Wrecked `src/sim/heat.js`, `standing.js`; Landnám's feud settlements |
| Events and consequences | Landnám `src/data/eventCards.ts`, `src/sim/events.ts`; Space-Wrecked `data/events.json`; Ludus `scheduleArc`; Wasteland Protocol's consequence pool |
| World generation | Landnám's derived coast; Space-Wrecked `src/sim/gen/`; 2060TD `src/sim/terrain.ts` |
| Pathfinding | 2060TD `src/sim/pathfinding.ts`; Afterglass `prototype/src/slice/geo.js` |
| Isometric projection and the stage | Climbing World Traveler `s04-iso.js`; 2060TD `src/game/stage/`; Afterglass `prototype/src/px/kit.js`; Space-Wrecked `src/render/painter.js` |
| Fast-forward and offline catch-up | Gridiron Eras `src/engine/autosim.js`; Spliceworld `ranch/ranch.js` |
| Saves | Engine-Builder `packages/core/src/save`, `packages/platform`; Spliceworld's fixture saves; Gridiron Eras' worker packing |
| Harnesses | Engine-Builder `eb sim`; Landnám's bars and probes; Climbing World Traveler `scripts/harness.ts`; Sandbagged `sim/mutants.mjs` |
| Shipping | Dirtbag `twa/`, `desktop/`, `game/unlock.ts`, `.github/workflows/build-twa.yml`; Chooser's targets and leak check |
| Input and accessibility | Dirtbag `app/src/ui/spatial.ts`, `nav.ts`, `pad.ts`, `input.ts`; Chooser `packages/ui/src/spatial.ts`, `gamepad.ts` |
| Voice | Landnám's chronicle; Rule or Drool's voice pass; Dirtbag's store copy rules |

## Not in any repository

Real-time NPC movement or schedules; vehicles or driving physics; crowds beyond a busyness level (Dirtbag `app/src/sim/crowds.ts`); a procedural city; the sim running in a Web Worker; touch movement controls (v0.956's joystick was retired); a household budget built on wages; a navmesh (Engine-Builder plans one in its Phase 6).

## Open questions

1. Whether Engine-Builder's survey and this one should merge once this game's kits move back into the engine.
2. Which of the reuse rows become engine kits first: needs and mood, or careers and the labor market.
