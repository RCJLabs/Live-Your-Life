# CLAUDE.md — Live Your Life (working title)

A life sim in a fictional Rust Belt city: isometric, drawn in code, for the browser (PWA) and Google Play (TWA). The plan is [ROADMAP.md](ROADMAP.md), the design is [docs/DESIGN.md](docs/DESIGN.md), and settled choices are in [docs/decisions.md](docs/decisions.md). Where this file and the docs disagree, the docs win; fix whichever is wrong. Solo dev (Evan, RCJ Labs).

## Sessions

- **Start at the CURRENT MILESTONE marker** in ROADMAP.md and work only on that milestone. Ideas outside it go under their phase in ROADMAP.md ("Ideas, not yet in a milestone"), not into code.
- **Propose a plan** before changes that span several files.
- **Done means the milestone's gates pass**, not that its scope list is ticked. Update the marker, the Readings table and any decision you made in the same change, and add a changelog line.
- **Decisions are Evan's** when they shape the product: scope, tone, what is in and out, the title, licences, domains, store listings. Put each one to Evan with a recommendation. Record the answer in docs/decisions.md with the date and the options considered.

## Rules

- **The sim decides; the stage renders.**
  - The rules live in packages marked `"eb": { "pure": true }`, built on Engine-Builder's kernel (`engine/`, a pinned submodule). They may not use the DOM, `Math.random`, `Date`, timers, `Intl`, transcendental `Math` (`sin`, `pow`, `exp`…) or `**`.
  - Isometric projection, movement, driving and anything at frame rate live in the stage and reach the sim as facts (arrived, collided, picked up). A replay re-runs actions, not frames.
  - The engine's purity lint enforces this; never weaken a rule to get past it.
- **Content is data.** Careers, events, places, templates, laws and dialogue are JSON validated by schemas, never closures. If adding content needs an engine edit, the engine is wrong: fix the engine.
- **Nothing is placed by hand.** The city, its lots, buildings, interiors and people come from the seed and templates. The few institutions that are authored are listed in docs/DESIGN.md when it happens. Dirtbag v0.956 died on 1,134 hand-placed props (docs/research/portfolio-survey.md).
- **Saves never break.** Every change to a save's shape bumps the version, adds a migration, and adds a fixture saved by the old version that must still load. Storage keys are never renamed. A save that won't load is quarantined, never overwritten.
- **Numbers are readings.** Record the instrument, the date and N in ROADMAP.md's Readings. Measure before tuning. A number marked (tune) in the docs is a proposal, and a borrowed reading is re-taken here before anything is built on it.
- **A check counts once it has been seen failing.** Break the thing it guards once, watch it go red, restore.
- **Odds on screen are the odds rolled.** Chances, costs and outcomes shown to the player come from the same preview the sim uses. No hand-typed numbers in text.
- **The world answers like the real one.** Wages, rents, prices, sentences and recovery times trace to docs/CALIBRATION.md. A departure from the real figure is written beside it.
- **The voice is docs/VOICE.md.** Second person in the interface, third-person past tense in the chronicle, earnest, never glamorising. Every player-facing string follows it.
- **The out list is a content rule.** No sexual violence; no minors in sexual or violent content; no real people, brands, companies or places; nothing for real money. A content lint with a blocklist enforces the names.
- **Mobile first.** Check at 360 and 390 px wide in portrait, and in landscape. Touch targets at least 44 px, safe-area insets, no horizontal overflow, no hover-only actions. Tap-to-go before any stick.
- **Offline always.** No runtime network calls, analytics or CDNs. The stores' own billing on the device is the stores'.
- **Assets carry their provenance.** Art and sound are code. Anything that is not logs its source, licence, prompt and hand edits. No NC, ND or SA licences.
- **Small files.** Aim for under ~300 lines and no function over ~60. Split by role (`sim`, `content`, `stage`, `ui`, `platform`), not by size.

## Commands

```sh
git clone --recurse-submodules https://github.com/RCJLabs/Live-Your-Life   # an existing clone: git submodule update --init
pnpm install
pnpm dev          # the game at http://localhost:5173
pnpm check        # typecheck → lint → test → build → e2e (what CI runs)
pnpm typecheck    # this repo's packages, then the tests through tsconfig.tests.json
pnpm lint         # Biome, then the purity check over this repo's eb.pure packages (tools/purity)
pnpm test         # Vitest
pnpm build        # apps/game/dist; LYL_BASE sets the base path (`/` by default, as life.rcjlabs.com serves it, D53)
pnpm e2e          # Playwright against `vite preview` of the build, under LYL_BASE
pnpm format       # Biome autofix
pnpm --filter @lyl/game icons    # re-render the PWA icons from apps/game/public/icons/icon.svg; the PNGs are committed
node packages/sim/test/week-bench.ts [seeds] [rounds]   # the week bench: µs a turn and a reduce, for Readings (500 seeds, 5 rounds)
node apps/game/e2e/shots.ts [dir]   # after `pnpm build`: the art spike's screenshots and people's heights
node apps/game/e2e/perf.ts [runs] [match]   # after `pnpm build`: the frame rate at 1× and 4× CPU, headless; match picks paths ("generated")
node tools/population/bench.ts [days] [sizes]      # the population harness in Node: tier-1 people at each cadence (30 days; 100,300,500,1000,3000)
node tools/population/chromium.ts [days] [sizes]   # the same in headless Chromium at 1× and 4× CPU
node tools/population/life.ts [rounds]             # the life's game with its 1,000 people: an hour and a month in one action, Node and Chromium
pnpm eb validate packages/content --types tools/content/game.ts   # the engine's checks on the content, its conditions against the game's facts (part of pnpm lint)
pnpm content      # rebuild packages/content/pack.json after changing a record; a test fails until you do
node apps/game/e2e/day-bot.ts [steady|thief] [days] [seeds] [rate]   # after `pnpm build`: the browser bot plays by taps; taps, pans and real minutes a game day
node apps/game/e2e/saves-bench.ts [n] [seconds]   # after `pnpm build`: a save's size, and its write and load times at 1× and 4× CPU
node tools/city/bench.ts [seeds] [rounds]          # the whole city planned in Node: time, blocks, lots, people, memory (--expose-gc for the heap)
node tools/city/chromium.ts [seeds] [rounds]       # the same in headless Chromium at 1× and 4× CPU
node tools/city/faces.ts [seeds] [from]            # every face of every walkable block, planned and checked; ms a face
node tools/city/walks.ts [seeds] [pairs]           # the street network built, and walks between walkable doors timed
node packages/sim/test/block-bench.ts [seeds] [rounds]   # the block bench: ms to plan a block and its interiors, lay its walk grid, route across it and route the commute
node packages/sim/test/prison-bench.ts [days] [rounds]   # a day in prison with the 1,000 people, timed: what the page spends a frame passing a sentence
```

- Node ≥ 22.18 and pnpm 10.28 (Corepack reads `packageManager`). Tools run under Node's native TypeScript stripping: erasable syntax only, and local imports keep their `.ts` extension.
- **The engine is a submodule** at `engine/`, pinned to a commit. Move it on purpose, in a commit of its own, saying what changed upstream: `git -C engine fetch origin main && git -C engine checkout <sha> && pnpm install && pnpm check`. Only the engine packages listed in `pnpm-workspace.yaml` join this workspace; add one when a milestone needs it. Never edit files under `engine/` from here: change the engine in its own repo.
- `@playwright/test` is pinned to 1.56.1 because that matches the Chromium preinstalled in Claude Code's cloud containers (Engine-Builder's reason).
- CI (`.github/workflows/ci.yml`) runs the same checks on every push and pull request. On `main` it deploys `apps/game/dist` to GitHub Pages, waits until the live `version.json` names the commit, then runs the engine's site-check on the live page. Pages needs one setting, by hand: Settings → Pages → Build and deployment → Source: GitHub Actions.

## Layout

```
engine/             Engine-Builder, a git submodule pinned to a commit; @eb/core, @eb/kits and @eb/purity join the workspace,
                    since M1.1 the content pipeline: @eb/schema, @eb/compiler, @eb/script and @eb/cli (build time and CI only),
                    and since M1.7 @eb/platform (save slots in IndexedDB, backups, quarantine; the page's, not the sim's)
packages/content/   the game's content as an Engine-Builder project: types/ and records/ as JSON (the street, facades, buildings
                    and blocks; since M1.2 fixtures, rooms and interiors; since M1.3 the career, shift events and taxes; since
                    M1.4 the name pool, acts and the favour; since M1.5 the shop's goods as the inventory kit's items, offences,
                    the crime and the fence; since M1.6 the chronicle's lines; since M2.4 the trade), checked by eb validate, built into pack.json
                    by pnpm content; the package reads only the pack (pure)
packages/sim/       the rules: modules on @eb/core and @eb/kits (pure). So far the calendar, the clock, the needs, rent, the week
                    bots, the job (job/, M1.3: the records, postings and sign-up, standing, shift events and their odds, pay and
                    withholding; since M2.4 a career's ladder, promotion, and arrests in the police's shift events), the coworker (ties/, M1.4: who they are, their week, familiarity, regard and what they
                    remember, favours both ways), the law (law/, M1.5: the shop as the law sees it, taking, the police,
                    court, HYTA, the fence; since M2.4 drugs.ts, a drug case: the raid, bail, sentences), the thief bot (thief.ts), the tier-1 people (people/: the roster, their hours,
                    hour plans, ties, shares; since M2.3 careers.ts, their careers' shifts, and work.ts, who has left
                    or changed jobs), and the block (city/: the templates, the plan, street furniture, the walk
                    grid, routes; since M1.2 the interiors: rooms, walls and doors, fixtures, and their checks; since M1.5
                    sight.ts, who sees where in a shop; since M2.1 city.ts, the whole city's districts, blocks and lots, and
                    face.ts, a block's face planned when needed; streets.ts and walks.ts, routes across blocks; home.ts, your
                    block's place in the city, D67); since M1.6 you (you.ts) and the chronicle (chronicle.ts); since
                    M2.3 the labor market (market/: employers, openings, the odds, applications and offers, D74),
                    and the seeker bot (bot.ts); since M2.4
                    the street trade (deal/: the trade's records, buying, the corner, who passes, heat; crew.ts, the supplier's crew, fronts and the recruit, D84–D86);
                    and prison (prison/: the sentence a day at a time, the job, letters, visits, parole, D81);
                    test/slice.ts is the slice's life for tests and benches; test/case.ts a drug case brought to court; test/fixtures/saves/ the save fixtures that
                    must keep loading (test/fixture.ts wrote the first, M1.7)
packages/stage/     the isometric city drawn in code on a 2D canvas: view, camera, depth sort, buildings, people, night;
                    @lyl/stage/testing is a fake canvas for drawing tests
apps/game/          the PWA: Vite, vite-plugin-pwa, version.json. Since M1.6 the page is the life (src/life/: the session, places,
                    tap-to-go, the bar, the panel, menus, the map, D49–D52; since M1.7 the saves, keeper.ts, and your lives,
                    lives.ts, D53–D54; play.ts is the page, main.ts its start); M0.3's art spike is at ?spike (src/spike/), and
                    M1.1's generated block at ?block=generated (src/city/, D33) with M1.2's interiors and the walker (D36);
                    since M2.1 the life is in the town (src/city/town.ts) and the map shows the city (src/life/citymap.ts);
                    since M2.3 the Jobs tab (src/life/jobs.ts), going to work off screen (src/life/trip.ts) and
                    where employers stand and the walk there (src/city/workplace.ts);
                    since M2.4 the corner, bail, jail, the court's drug cases and prison (src/life/street.ts);
                    dev/ holds the character sheet and the bench (pnpm dev, then /dev/figures.html); e2e/ the Playwright specs, and
                    since M1.8 e2e/bot/, the browser bot that plays by taps
tools/purity/       the engine's purity rules, applied to this repo's eb.pure packages
tools/content/      game.ts: the game's modules, which eb validate and eb build check the content's conditions against
tools/population/   the population harness (M0.4): the runs, the cost split, the Node bench, a page and the Chromium script
tools/city/         the city bench (M2.1): the whole city planned, timed and weighed in Node and Chromium; faces.ts plans and
                    checks every walkable face
docs/               design, decisions, voice, calibration, research
```

Planned, as their milestones arrive: more content in `packages/content` (careers, events, places and laws), `packages/ui` (panels, the chronicle, the map, input), and harnesses in `tools/` (the content lint, calibration checks).

## Writing

- Plain words, short sentences, no hype. Name the actual thing ("the facade grammar"), not a category ("the system").
- Comments say why, not what. Credit a pattern's source repo when it is ported ("from dirtbag's presence.ts").
- Every doc ends with its open questions, if it has any.
- No model names or tool attributions in docs, code comments or data files.
