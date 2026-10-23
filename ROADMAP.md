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

- **M1.1 A block.** Done, 2026-10-19, alongside M0.3's open gates, on Evan's word. The generator for one block: lots, two buildings with facade grammars, a street, the walk grid. Nothing placed by hand.
  - The block is one side of one street (D32). The page stays M0.3's spike, and the generated block draws at `?block=generated` (D33).
  - Done when:
    - 1,000 seeded blocks have no building over another or over the street, and every door joins the street on the walk grid [auto];
    - every block has the slice's buildings: the apartment house, the diner, the corner shop [auto];
    - the same seed gives the same block [auto];
    - every template is a content record that `eb validate` passes, seen failing on a planted bad record [auto];
    - the generated block passes the page's browser checks at 360 and 390 px and in landscape [auto];
    - its frame rate at 4× CPU is in Readings [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check` but the frame rate, which is in Readings.
    - `packages/content` is the game's content as an Engine-Builder project: four record types (street, facade, building, block) and 11 records. The engine's compiler checks them in `pnpm lint` (`eb validate`) and builds `pack.json` (`pnpm content`), which the sim and the page read. A test fails when a record changes and the pack isn't rebuilt. `@eb/schema`, `@eb/compiler`, `@eb/script` and `@eb/cli` join the workspace; they run at build time and in CI only.
    - The generator is `packages/sim/src/city/`, pure and seeded. It lays out the lots, the buildings and their doors, the street, its open side and its furniture, and the walk grid. Routes are weighted A* with eight neighbours, ported from 2060TD.
    - 1,000 seeded blocks keep every template's rules, have the slice's three buildings with the shop at an end, and join every door to the street. The same seed gives the same block.
    - The stage draws facades from the grammar: single or paired windows, sills, three cornices, three levels of wear, a shop's sign. A golden test holds M0.3's spike to its drawing, call for call, so D33's page is unchanged.
    - Two bugs were found on the way:
      - The A* port read its heap's keys from shared arrays. A cell whose cost fell after it was pushed broke the heap's order, and one seeded grid's route came out 4% long. The test against a plain Dijkstra caught it, and 2060TD's original has the same code.
      - The spike drew door shares in tenths, so 0.66 to 0.78 could only come out as 0.7 or 0.8. The generator draws them in hundredths.
    - Planted bugs: 23, 23 caught.
      - The content: a building naming a missing facade; a record changed without rebuilding the pack.
      - The block: the corner shop anywhere; a needed building left out; no gap between buildings; one bay too many; a building set back off its lot line; door shares in tenths again; lamps left in doorways.
      - The walk grid: a wall's edge blocking the cell it touches; posts blocking nothing; a diagonal cutting a wall's corner; the sidewalk counted as roadway.
      - The routes: A*'s estimate overshooting; a diagonal step as long as a straight one.
      - The templates: a backwards range let through; a block needing more buildings than lots let through.
      - The facades: pairs drawn as single windows; nothing ever boarded up; a shop's sign behind its awning; the spike's apartment house losing its side windows.
      - The page: a door drawn from the street's origin; a car park painted as grass.
- **M1.2 Two interiors.** The apartment and the restaurant from templates, walkable, with cutaway walls.
  - The flat is a ground-floor studio with a bathroom, off the stair hall (D34). The diner keeps its line and counter and gains a back room with a back door (D35). One person walks the commute on the generated block (D36).
  - Done when:
    - 1,000 seeded blocks: no fixture stands over another, a wall or a doorway, and every fixture's place of use joins the street on the walk grid [auto];
    - every flat has a place to sleep, eat, wash and relax, and every diner a place to work and to eat, read from the fixtures' records [auto];
    - the same seed gives the same interiors [auto];
    - every fixture, room and interior is a content record that `eb validate` passes, seen failing on a planted bad record [auto];
    - at `?block=generated` the walker goes from the bed to the griddle and back on the walk grid's routes, and the building they are in is cut away [auto];
    - the generated block passes the page's browser checks at 360 and 390 px and in landscape [auto];
    - its frame rate at 4× CPU, with the walker moving, is in Readings [auto];
    - the spike's page is unchanged, by the golden test [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check` but the frame rate, which is in Readings.
    - `packages/content` gains three record types: 19 fixtures, 6 rooms and 2 interiors.
      - A fixture is one of the stage's drawings, its size, whether it takes up the floor, and how a person uses it: from which side, for which of M0.2's activities, in which pose.
      - A room places its fixtures by rule.
      - An interior lays rooms out from the footprint's edges and the front door, a later room cut out of the earlier ones. It names the doors and the homes or businesses its rooms make.
    - The planner joins the block's in `packages/sim/src/city/`: rooms, the inside walls where they meet, the doors cut out of them, the fixtures, and where each is used from. The walk grid opens a building with an interior: its walls and fixtures are in the way, and a doorway is open at the cells whose middles lie in it.
    - The flat is a stair hall between two studios, each a main room and a bathroom, and the walker lives in one by the seed (D34). The diner keeps its line, counter and tables and gains a back room with the dish pit, dry stores and a staff toilet, and a back door to the yard (D35). The apartment house is 10 to 11 m wide now, not 8 to 9.5, to fit the flats.
    - 1,000 seeded blocks keep every rule. Rooms cover the floor and doors join two rooms. No fixture stands over another, a wall or a doorway. Every unit has its places, and every place of use can be walked to from the street and is reached from the side it is used from.
    - The stage cuts a building with rooms its own way:
      - each room's floor;
      - the far walls in each room's colour;
      - the inside walls cut low;
      - a way out through a far wall as an opening under a lintel.
    - Six fittings join the furniture kit: a shower, a toilet, a sink, a dish pit, shelving and stairs. The spike's one-room interiors draw as before, by the golden test.
    - The walker (D36) gets up in their flat, walks to the griddle, cooks, walks home and sleeps, round and round, at 1.3 m a stage second. With the walls up, the building they are in or behind is cut away.
    - Two problems were found on the way:
      - The depth sort drew the diner's back wall over the walker as they came in through the back door. A door painted on a solid wall leaves the walker inside the wall's box, where the sort can't order them. Ways out through far walls are now openings, and the walker keeps to the middle of every doorway.
      - Testing who a building hides by screen rectangles let the tall apartment house claim it hid the cook. The test is now whether a corner of the cook falls inside the building's outline. In one seed the house really does hide the griddle: it stands 1.6 m east of the diner and is 9.25 m tall, so it is cut away.
    - Planted bugs: 32, 32 caught. The first run caught 25 of 33.
      - Five checks were missing and were added: a wall left standing across a later room; a fixture used from inside itself; a walk ending behind a fixture whose front is walled off; a tiled floor laid as checker; two fittings drawn alike.
      - One plant was aimed at the wrong test, and one at a line Biome had reflowed. One drew the same picture by another path, so it was dropped as no bug.
      - The content: a room naming a fixture that isn't there; an interior changed without rebuilding the pack.
      - The records: a door or a unit naming a room the interior lacks; a fixture placed two ways; a room in two units.
      - The rooms: a later room not cut out of an earlier one; doorways not cut from the walls; a wall left across a later room; the front door opening onto the street from both sides.
      - The fixtures: a mirrored flat's fixtures not turned, or used from the wrong hand; a user standing at a fixture's middle.
      - The checks: fixtures in front of doors, overlapping fixtures, and a need with no place, each let through.
      - The walk grid: doorways blocked; fixtures walked through; a building with an interior shut; a walk ended on a fixture's far side.
      - The stage: inside walls drawn full height; no opening for a way out; far walls one colour; tile laid as boards; two fittings alike; a building in front of someone, or behind them, claimed to hide them.
      - The walker and the page: their own building not cut away; off the middle of doorways; asleep in the neighbour's bed; at a run; walls planned thicker than they are drawn; the page cutting by the walls button alone.
- **M1.3 One job.** Line cook on the career template: shifts posted weekly, sign-up, pay, standing, fatigue; a shared pool of shift events by tag.
  - The city borrows Michigan's tax and law (D37). Pay is withheld as a Michigan employer withholds it (D38). Two no-shows in 28 days end the job (D39). A shift event pauses the shift for a choice (D40).
  - Done when:
    - 500 seeded weeks with the steady bot: every week finishes, nothing offered is refused, and in every run the bot signs up, works and is paid [auto];
    - every shift event comes up, and every choice is taken, in the bots' sweeps [auto];
    - the odds a choice shows are the odds it rolls, in every state the sweeps reach [auto];
    - the standing rules hold: being late costs standing, a no-show warns, a second within 28 days lets you go, a warning lapses after 28 days, and standing at 0 lets you go [auto];
    - pay is the wage times the minutes worked, and each tax withheld matches its table to the cent in worked examples [auto];
    - the career, the events and the taxes are content records that `eb validate` passes, their conditions checked against the game's facts, seen failing on a planted bad record [auto];
    - the wage and every tax record trace to a row in CALIBRATION.md [auto];
    - the week bench's cost per action, with the job, is in Readings [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check` but the bench, which is in Readings.
    - `packages/content` gains three record types:
      - a career: where it is worked, the wage, the shifts and when they are posted, the week's limit, payday, the taxes withheld, standing's steps, skill, and the event tags it draws;
      - a shift event: tags, a weight, a condition, the prompt, and two to four choices, each certain or with odds, with what follows;
      - a tax, in brackets over a yearly deduction, as payroll works it out.

      The records are the line cook at the diner, 14 shift events, and 5 taxes. `eb validate` and `eb build` now check conditions against the game's own facts (`tools/content/game.ts`), so a misspelt fact fails as E012, where before it passed as written.
    - The job is `packages/sim/src/job/`. It replaces M0.2's placeholder, keeps its id and facts, and reads the career from the pack.
      - The diner posts next week's shifts on Thursdays, more at higher standing, one a day. You sign up from tomorrow on, five a week at most. A shift's timers are set at its midnight (Readings has why).
      - Working is still the life module's: it tells the job when work starts, to know whether you were late, and how long it went.
      - Standing, warnings and letting go follow D39. Skill grows with practice, more slowly the more there is.
      - Pay is every minute worked since the last Friday, less the five taxes (D38). A test works the line cook's full week by hand from Publication 15-T: $589.20 gross, $102.65 withheld, $486.55 net.
    - A shift's event, if it has one, is due at a minute drawn when you sign up. Work is offered until then, so the routine stops there. The event pushes a mode that allows only a choice, and the clock stops. The choice's odds come from one function for the preview and the roll, and the roll is the engine's `roll` (D40). Outcomes move standing, practice and needs, or send you home.
    - The steady bot signs up for every shift it can, works however tired, takes event choices at random, and keeps a week of meals back before paying what it owes. A random bot no-shows its way out of half its jobs.
    - The rent sweep now runs two weeks. Someone hired the day before rent is due can't pay it from the first Friday's pay, which covers two or three shifts.
    - Three things were found on the way:
      - Signing up set a shift's two timers a week ahead, so the time module's slice carried about twenty, and the kernel copies it on every action. Reduce went from 48.9 µs an action to 89.5. Setting each shift's timers at its own midnight brought it to 58.9–67.1 (Readings).
      - The steady bot, hired the day before rent was due, paid every cent it had the moment it could and then couldn't buy food. Health ended under 18% in a tenth of its fortnights. It now keeps a week of meals back.
      - Biome refuses an object with a `then` property, which a preview's outcomes were, so a choice's outcomes are `outcome` and `failure`.
    - Planted bugs: 48, 48 caught. The first run caught 45 of 46.
      - Two checks were missing and were added:
        - a week counted from the start rather than from Monday, which a Monday start can't show, so a test now starts on a Thursday;
        - a need left over full by an outcome. That plant turned out to be no bug: the next settle clamps it, so it was dropped.
      - The content: a condition naming a fact the game lacks (`eb validate` with the game's facts); an event changed without rebuilding the pack.
      - The records: a missing tax, a certain choice after a chancy one, odds without a failure, and brackets out of order, each let through.
      - Withholding and pay:
        - withholding rounded down;
        - the deduction ignored;
        - Social Security past its wage base;
        - a bracket's rate on the whole year's pay;
        - pay rounded to the nearest cent;
        - 26 paychecks a year;
        - pay owed not cleared;
        - Social Security's year never turning;
        - no final pay after being let go.
      - Postings: shifts posted for today; as many at any standing; next week's a day late; a day's postings kept past its midnight; next week not posted when hired on the posting day.
      - Signing up: a sixth shift in a week; weeks counted from the start.
      - Shifts and standing:
        - five minutes late counted late;
        - half an hour off counted as leaving early;
        - minutes worked not credited;
        - a second no-show only warned;
        - a warning lapsing a minute late;
        - kept on at standing 0;
        - a shift dropped within a day;
        - the day's shift never set.
      - Shift events:
        - odds past 5 to 95;
        - tiredness raising the odds;
        - the preview showing the base odds;
        - the deck repeating;
        - events drawn whatever their condition, or whatever their tags;
        - an event for someone not at work;
        - work running past its event;
        - sent home but kept on shift;
        - an outcome's needs not felt;
        - an outcome's practice counted twice;
        - the mode left on after a choice;
        - the clock running through a choice.
      - Life and the bot: activities offered past the next shift; work never clocked in; the bot never signing up, always taking the first choice, or paying rent with its last cash.
- **M1.4 One relationship.** A coworker with familiarity, regard and a memory of acts.
  - The coworker is the other line cook (D41). Your acts reach them through shift events and favours (D42). Regard changes what they'll do for you (D43). They remember kinds of act, as in Ludus (D44).
  - Done when:
    - 500 seeded weeks with the steady bot: nothing offered is refused, and familiarity grows in exactly the runs that share a shift with the coworker [auto];
    - every kind of act comes up in the bots' sweeps, and each moves regard by its weight and is remembered by its kind, at most 8 kinds kept [auto];
    - the odds shown for a cover and for a choice that leans on them are the odds rolled, in every state the sweeps reach [auto];
    - a cover they give costs your standing nothing and the shift is theirs; one you give is yours and counts in your week [auto];
    - the coworker comes from the seed and the name pool, the same for the same seed, and every line about them reads whole with each set of pronouns [auto];
    - the name pool, the acts, the favour and the coworker's events are content records that `eb validate` passes, seen failing on a planted bad record [auto];
    - the week bench's cost per action is in Readings [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check` but the bench, which is in Readings.
    - `packages/content` gains three record types, and the career a crew:
      - a name pool: first names with the pronouns that go with them, and last names;
      - an act: how far it moves regard, and the line they remember it by;
      - a favour: what they ask, and what is said either way;
      - the crew: whom the pool, ages and favour come from, their days a week, how often they ask, the odds of a cover, familiarity's half, and the acts that lateness, a no-show and favours count as.

      The records are a pool of 66 first names and 60 last, 17 acts, the cover favour, and 6 shift events drawn only while they're beside you. "The rush" and "Short-handed" are drawn only while they're not.
    - The coworker is `packages/sim/src/ties/`, a module beside the job. It hears the job's events (worked, late, a no-show) and asks the job to take or give a shift. It never reads the job's slice. The job tells whether you're free on a day and which shifts are ahead.
      - Who they are is drawn at hire. Their week is worked out from their seed, not stored, so the save carries who they are, minutes together, regard, at most 8 memories, and the days favours moved.
      - An outcome in a shift event can name an act. It is remembered if they were beside you that day, and the choice's preview shows it.
      - A favour they ask is a request waiting in the world, not a mode: the clock runs, and it lapses at the midnight before its shift.
      - Asking them to cover rolls the engine's `roll` at the odds `oddsOf` gives, the function shift events use, and its preview shows them.
    - The steady bot answers a request either way at random, first. The random bot asks for covers, answers or doesn't, and comes late on their shifts.
    - Two things were found on the way:
      - "The rush, together" had only chancy choices, which M1.3's check refuses (a certain choice comes first). Helping with their tickets was added as the first.
      - A turn with the steady bot choosing went from 148.1 µs to 172.8: the ties module's options and facts are read every turn (Readings). Reduce held at 67.6.
    - Planted bugs: 40, 40 caught. The first run caught 36; four checks were missing and were added: their week counted from day 0 rather than Monday, which a Monday start can't show; only the first `{name}` in a line filled; beside you off shift; and a request for a day you're not free.
      - The content: a coworker event naming a fact the game lacks; an act past ±30; a pronoun the game has no forms for; an act changed without rebuilding the pack.
      - The records: a crew's acts not checked; its ages out of order.
      - Who they are: drawn older than the crew; one day off a week; their week from day 0; "his" filled as "him"; one `{name}` filled.
      - What they remember: regard past 0 to 100; every kind kept; a repeat counted as the first; a repeat kept twice; familiarity rounded.
      - Beside you: on a shift you took from them; off shift; familiarity from every shift; lateness unnoticed; an act remembered without them; acts in events never applied; the job not telling of lateness or of work.
      - Favours they ask: for tomorrow; for a day you're not free; lapsing on its own day; the midnight not heard; a yes that never takes the shift, or leaves them on it; a yes offered when you're not free.
      - Favours you ask: on a day they work; twice for a shift; the preview showing the base odds; odds deaf to regard; a cover that leaves the shift yours, or costs standing.
      - Event odds deaf to regard, or leaning the wrong way; the steady bot always taking the first choice.
- **M1.5 One crime.** Shoplifting with the whole chain: witnesses, the odds shown, heat, a scheduled response the player sees first, charges, a fine or a record.
  - Shoplifting is in the corner shop, a third walkable interior (D45). The law answers in the act or later, as in Michigan (D46). A first offence is fined, or offered HYTA (D47). Anything can be stolen, and a fence buys it (D48).
  - Done when:
    - 500 seeded weeks with a bot that doesn't steal, and eight-week lives with one that does and with the random bot (a court date is two to six weeks out): nothing offered is refused, and every step of the chain comes up (noticed, held, ticketed, seen on camera, visited, the court date, a plea, HYTA, a fine, a record, a missed date) [auto];
    - the odds shown for taking an item, and for selling it, are the odds rolled in every state the sweeps reach [auto];
    - who can see a cell matches a check of sight lines over 1,000 seeded shop interiors, and the shop meets M1.2's interior checks [auto];
    - every timer the law sets is shown to the player when it is set, with its day [auto];
    - eight weeks of stealing and fencing leave a life with less, after what is owed, than eight weeks of shifts at the median, as a reading over the sweeps (D7, D48) [auto];
    - every fine, cost, threshold and the fence's share trace to a row in CALIBRATION.md [auto];
    - the goods, the shop, the fence and the offence are content records that `eb validate` passes, seen failing on a planted bad record [auto];
    - the week bench's cost per action is in Readings [auto].
  - **Done, 2026-10-19: every gate passed**, each in `pnpm check` but the bench, which is in Readings.
    - **The shop.** The corner shop has an interior: a shop floor, a stockroom and a WC. On the floor:
      - wall shelves, a gondola and two coolers, each holding one line of goods;
      - a till the clerk stands behind;
      - a camera.

      Fixtures now say whether they hide someone, what goods they hold, and who watches from them. The stage draws the camera.
    - **Sight.** `city/sight.ts` works out who sees each shelf on the walk grid with integer lines. A floating-point reference agrees in every cell of 1,000 shops. Across those shops, 44% of shelves are seen by nobody, 22% by the camera only and 33% by both; every shop has one to four unseen shelves.
    - **The law.** `packages/sim/src/law/` does the rest:
      - taking from a shelf, at odds shown first and rolled with the engine's `roll`;
      - heat;
      - being held;
      - the footage reviewed at close;
      - police visits at times the player is told;
      - tickets and the shop's civil demand by letter;
      - the bar, and court with three pleas;
      - HYTA, warrants and arrests, and paying;
      - the fence, and eating stolen food.

      It owns no money or goods: the economy kit and the engine's inventory kit, now on, do. Four record types: item (the kit's, with food), offence, crime, fence.
    - **The thief bot** (`thief.ts`) steals instead of working: at most three thefts a day, where the odds are lowest. It sells, eats, goes to court, takes HYTA and pays. `randomFor(days)` plays the random bot for any length.
    - Three things were found on the way (D46, D48):
      - The thief was held at the same till twenty times in eight weeks and owed $15,000. A shop now bars you once it catches you, and a prior conviction makes a theft the second degree.
      - An arrest could land on someone already held and leave them stuck with nothing offered. A visit that falls while you're held or in court now comes the next day, with a new notice.
      - Offering every good on every shelf, 53 takes, made a turn with the bot choosing 62% dearer: the engine checks every option it offers. Each shelf now holds one line of goods, and a turn costs 188.2 µs, within the container's noise of M1.4's 172.8.
    - Planted bugs: 40, 40 caught. The first run caught 37 of 41. One of the misses was a plant that changed nothing (shelves cut from what hides you, when they already block the floor), replaced by ignoring what hides you altogether. Three checks were missing and were added: sight past its range, which no shop's shape reaches; heat past 100 when held; a visit while held, not put off.
      - The content: a clerk who notices 99 times in 100; a clerk who sees 70 m; an offence that is not there; a price changed without rebuilding the pack.
      - Sight: lines rounded down; shelves seen over; a counter that blocks; a camera that sees all round; sight past its range.
      - Taking: heat that changes no odds; the clerk's odds where only a camera sees; footage where no camera looks; a theft that adds no heat; heat past 100; a bar that bars nothing, or none after a ticket; the shop open at its closing hour; any verb while held; the police at once; a timer the player isn't told of; footage reviewed before close; police the same day.
      - Tickets and court: goods kept; a demand outside its bounds; goods gone, not owed for; a court date a week on; a record that makes no second degree; HYTA twice, or at any age; one set of odds for any evidence; a missed check-in let go; probation kept through a new offence; a warrant a day late; no night in the cells; fines without costs; probation without its fee; a visit while held, not put off.
      - The fence: its share rounded up; open an hour early; eating what isn't food; a sale never seen.
- **M1.6 Living in it.** The HUD, tap-to-go, the map, the chronicle, the clock's speeds and pauses.
  - A brisk walk, and the clock runs while you walk (D49). One compact bar, with panels on tap (D50). The life is the page, with a map of the block (D51). A journal, each entry shown once as a line (D52).
  - Done when:
    - a browser test plays a day on the page by taps alone and nothing it sends is refused: wake, walk to the diner, sign up, work a shift and answer its event, walk home, eat and sleep [auto];
    - a walk costs the game time D49 sets, and the sim is sent an activity only once the walker has arrived [auto];
    - the clock stops in a menu, a choice, a hidden tab, held or in court, and the log holds no refused `time/elapse` [auto];
    - every favour, notice, court date and shift waiting on the player is in the panel with its day, and the badge counts them [auto];
    - every event the slice can raise that the player would see has a chronicle line, third person and past tense, that reads whole, seen failing on a planted missing line [auto];
    - the map names every building and goes there on a tap [auto];
    - the page passes M0.1's mobile checks at 360 and 390 px in portrait and in landscape; the spike still passes its own at `?spike` [auto];
    - the frame rate with the life running is in Readings, headless at 1× and 4× CPU [auto], and on Evan's phone [you].
  - **Built, 2026-10-19: every [auto] gate passed**, each in `pnpm check` but the frame rate, which is in Readings. The phone reading is Evan's [you].
    - **The page.** The default page is the line cook's life on the block the law module draws. M0.3's spike is at `?spike` and M1.1's block at `?block=generated`, with their tests and scripts moved there. `apps/game/src/life/` is the life:
      - **`session.ts`:** the sim's session; time out in the world only; the chronicle as it drains.
      - **`places.ts`:** what can be done where.
      - **`player.ts`:** tap-to-go at D49's pace.
      - **`menus.ts`:** a place's menu, and the sheets for a shift event, the court and a hold, with the preview's odds.
      - **`pending.ts` and `panel.ts`:** what waits on you.
      - **`dom.ts`:** the bar and the toasts.
      - **`map.ts`:** the map.
      - **`main.ts`:** the glue.

      An activity's time passes as a fast-forward of up to three seconds, with you in its pose.
    - **The sim.** You get a name, from the seed and the name pool (`you.ts`). The chronicle (`chronicle.ts`) writes a line from a `line` record for every event a player would see: 33 lines. Events nobody writes down are listed with why, and a test fails on any other event without a line.
    - **The stool** at the diner's counter serves socializing as well as eating, so every activity has a place.
    - **A day by taps.** A browser test signs up for a shift, eats, sleeps until it, walks to the diner by the map, works it and answers its event, walks home and sleeps. The sim refuses nothing it is sent, and the journal tells it.
    - Found on the way:
      - A tap beside a fixture, where you stand to use it, missed: only its footprint counted. It counts now.
      - The mode sheet worked out every option each frame, even out in the world, and the bar read seven facts each frame. With the CPU slowed four times that was 34.1 fps. Cut to a few times a second, it reads 40.6 (Readings).
      - Two buildings were both "Storefront" on the map: a shop goes by its sign now.
    - Planted bugs: 20, 20 caught. The first run caught 17. The three misses changed a line record without rebuilding the pack the tests read, so they were planted again with the pack rebuilt, and caught.
      - The chronicle: an event with no line; a line in the second person; a placeholder the event lacks; a visible event made quiet; dates a day out; cents read as tenths.
      - The session: time sent in any mode; part of a minute dropped; nothing written to the journal.
      - What waits and what a place offers: the police's first visit left out; what waits out of order; a place offering what it doesn't serve; a shelf's odds typed rather than previewed.
      - On the page, by the browser tests: a menu before you arrive; the clock running in the panel, or when paused; a walk at a real pace; the map leaving out the row houses; a badge that counts nothing; buttons under 44 px.
- **M1.7 Saves.** The engine's snapshot-plus-log saves in IndexedDB, slots, quarantine, the first fixture. On `life.rcjlabs.com` (D53), saved automatically, a slot a life (D54).
  - **Done when:**
    - the page saves after every action but time passing, every game hour and when hidden, and a reload brings back the day, the money, the journal and the place you last reached [auto];
    - a reload can't undo an outcome: a roll taken and reloaded stands [auto];
    - three slots each hold a life, listed with its name, day and money; a life can be ended to free its slot [auto];
    - a save that won't load is quarantined and the player is told, never overwritten; one damaged by hand shows it [auto];
    - the first fixture, saved by this build from a bot's week, still loads with nothing skipped or changed, seen failing on a slice changed without a migration [auto];
    - time reaches the sim in whole game minutes, not every frame (open questions 10 and 42) [auto];
    - a save's size, and its write and load times, are in Readings [auto];
    - the live page is served from `life.rcjlabs.com` at `/`, and the deploy's checks pass there [auto, once Evan has set the domain].
  - **Built, 2026-10-19: every [auto] gate passed** in `pnpm check` but the readings, which are in Readings, and the live domain, which waits on Evan's DNS record and the Pages setting (D53).
    - **The saves.** `apps/game/src/life/`:
      - **`keeper.ts`:** three slots on the engine's `@eb/platform` (IndexedDB, then localStorage, then memory), with its backups and quarantine. Beside each save, the journal a key a day, and the place you last reached in its summary.
      - **`lives.ts`:** your lives, each to go on with or end for good after a confirm.
      - **`main.ts`:** the start. The first visit starts a life at once; after that the page opens on your lives. `?seed=` plays an unsaved life, for tests and readings.
      - **`play.ts`:** the page that was `main.ts`. It saves after every choice, every game hour, on reaching a place and when hidden.
    - **The session** sends time in whole game minutes, and keeps each journal entry's event and step, so a load rebuilds the journal in today's words.
    - **The first fixture.** `packages/sim/test/fixtures/saves/life-v1.json`, the random bot's week from `fixture-24` (shifts signed, a case on file, the coworker's memories, goods in the bag), written by `test/fixture.ts`. `save.test.ts` loads it with nothing skipped and every slice in today's shape, and to its saved state while the content is the one it was saved with (open question 48).
    - **The domain.** The build's base path is `/`, and CI builds for it. Evan adds `life` CNAME `rcjlabs.github.io.` and sets the custom domain in Settings → Pages; the deploy's `page_url`, which the confirm job checks, then names it.
    - Found on the way:
      - A damaged last save went on from the one before without a word: a line says so now.
      - A journal day that wouldn't read failed the whole load, and a refused journal write was thrown rather than told: both are caught now.
      - A new life's seed is random, so the browser tests that walk the block play `?seed=life-1`, unsaved, as the frame rate script does.
    - Planted bugs: 13, 13 caught. The first run caught 11. The test of a refused save let the journal's write through, and the reload test compared where you stood with the place it had recorded, which the plant left stale. Both were tightened, and the two planted again and caught.
      - The fixture and the keeper: a slice changed without a migration; journal entries past the save kept; the journal never written; where you were not kept; a torn journal day costing the life; a refused write thrown, not told; time sent every frame.
      - On the page, by the browser tests: no save after a choice; the place you reached not recorded; a failed load played as a new life; a backup used without saying so; a life ended with no confirm; buttons under 44 px on your lives.
- **M1.8 The browser bot.** Plays the week on a throttled phone profile and counts taps and real minutes per day.
  - **Done when:**
    - the browser bot plays a steady week and a thief's case on the page, by taps alone, at 390 px with the CPU slowed four times, and the sim refuses nothing (D55) [auto];
    - its taps, pans and real minutes per game day, for both, are in Readings [auto];
    - a browser test in CI plays a full day by the bot, refusing nothing, seen failing on a planted bug [auto];
    - Evan sets the tap budget from the reading, and decides speed 3 with it (D56, open question 39) [you].
  - **Built, 2026-10-20: every [auto] gate passed**, the bot test in `pnpm check` and the readings in Readings. Evan's decisions on the reading: an alarm (D57), the bed and the court say when you're due (D58), and the tap budget waits for the playtests (D59).
    - **The browser bot** (`apps/game/e2e/bot/`):
      - **`driver.ts`:** taps the page and counts them, panning to a place first, reading only what a player sees through the page's hooks.
      - **`player.ts`:** the steady bot's rules, played by taps; the thief's one try at a shelf.
      - **`run.ts`:** days of a life, each day's taps, pans and real time.
      - **Readings:** `day-bot.ts`. **CI:** `bot.spec.ts` plays to the first shift and works it, refusing nothing, and holds its count of taps to the page's own count of clicks.
    - **What the reading found,** and what was done about it:
      - The steady bot was late for all 12 of its shifts, by 7 to 85 minutes; the thief was let go. D57's alarm ends what you do 30 game minutes before a shift. Late is now 8 to 13 minutes, nearly always (open question 53).
      - Sent to bed just before a shift, the bot arrived after it began, and the bed offered a whole night through it: two no-shows in three weeks. D58: the bed now says you're due, and sleep ends with the shift.
      - The bot never went to court, as nothing but the panel says it's the day: a warrant and a night in the cells. D58: a line on the morning says so.
    - **Coverage, changed by the alarm.** The bots' sweep of shift events draws from 500 seeds a policy rather than 300: the nodding-off event's nine draws had all fallen on one choice. `law/dismissed` left the chronicle's census of bot lives and joined its rare list; the court's own test raises it.
    - **Found on the way:** the panel's and the menus' buttons now name their action and activity, which the bot reads, as a screen reader could.
    - Planted bugs: 8, 8 caught. The first run caught 3 of the bot test's 4: with its taps on places still counted, a bot that counted no other tap passed. The test now holds the bot's count to the page's count of clicks, and the plant was caught. Then the four on the fixes, all caught.
      - The bot test: menu items that don't say what they do; a tap on a fixture that misses it; a sign-up for a day not posted; taps not counted.
      - The fixes: no alarm; sleep through a shift; the bed silent during a shift; the court's line after noon.
- **M1.9 The playtest gate.** A tester brief (Rule or Drool's TESTERS.md is the model); five strangers' sessions recorded.

**Done when:** bots finish 500 seeded weeks headless and every event is reached [auto]; the browser bot's taps and minutes per day are under the budget set from M1.8's first reading [auto]; ≥30 fps at speed 1 on Evan's phone [you]; the first fixture save still loads [auto]; the content diff shows the slice whole, with none of the later game's text [auto]; five playtest sessions are logged [you].

## Phase 2: The first year

**Goal:** the free edition, whole: a year from the eighteenth birthday to the nineteenth, in two districts, with crime to the crew tier, law to detective, food to chef, relationships, children, aging and the heir.

- **M2.1 The city.** Districts, arterials, lots, building and household templates; two districts live, the rest as statistics.
  - Decisions: the inner ring and downtown walkable first (D63), the near side cut to sill height (D64), the whole city generated at once (D65), Ridgefield (D66).
  - **Done when:**
    - the whole city, every district's blocks and lots, is planned from the seed within a phone's budget, read in Chromium with the CPU slowed four times [auto];
    - its people add up to D4's 250,000 to 400,000 from the districts' densities [auto];
    - every block in the walkable districts passes M1.1's and M1.2's checks over 1,000 seeds [auto];
    - a route reaches any building in the walkable districts from any other [auto];
    - the life plays across blocks, with the near side cut (D64) [auto];
    - the map shows the city, its districts named [auto];
    - saves from before the city still load [auto];
    - the frame rate walking downtown, headless [auto] and on Evan's phone [you].
  - **Step 1, built 2026-10-23:** the city record (Ridgefield) and five district records; `packages/sim/src/city/city.ts` plans every district's cells, blocks and lots in typed arrays; `tools/city/` times and weighs it in Node and Chromium (Readings). Planted bugs: 5, 5 caught: the city drawn from no seed; a density doubled; downtown off the centre; a lot past its maximum; a block over its cell. Arterials (the record's `arterialEvery`) aren't laid yet.
  - **Step 2, built 2026-10-23:** each face of a block in the walkable districts is planned only when it is needed (`packages/sim/src/city/face.ts`): the district's frontage record picks a building for each of the city's lots among those that fit, or leaves it empty, and the face is a block plan, so the walk grid, routes, drawing and checks take it unchanged. Downtown has office blocks with a lobby front (drawn in the stage), and the city's two institutions, the courthouse and the precinct, stand on the downtown lots nearest the centre that fit them (DESIGN.md, The world). The slice's block, `?block=generated` and the life are unchanged. `node tools/city/faces.ts` plans and checks every walkable face of whole cities (Readings). Planted bugs: 7, 7 caught: a building as wide as its template allows, whatever its lot; the institutions left unbuilt; a north face not turned half round; a north face's fronts put on the block's far edge in the city; a building set back off its lot line; an institution not on the nearest lot; the lobby's front not drawn.
  - **Step 3, built 2026-10-23: routes across blocks.** The city's streets are one network (`packages/sim/src/city/streets.ts`): street middles between blocks and along each cell's edges, which neighbouring cells share, so districts whose blocks differ in size still meet street to street. `walks.ts` finds the shortest walk between the streets in front of two doors (Dijkstra). On the way, step 1's layout changed: a cell held as many whole blocks of its district's size as fit, and the rest of it, up to 124 m, was left as land with no street across it. Now each district's blocks are stretched or squeezed so whole blocks fill the cell (inner ring 115 × 62 m, downtown 111 × 78 m, from the records' 120 × 64 and 100 × 80; tune), and the city's readings are re-taken. Planted bugs: 5, 5 caught: blocks not stretched to the cell; a street through several cells cut; the walk to the first corner left out; the street behind the face taken for the one in front; no north–south streets along cell edges (caught only once a test walked straight along cell edges).
  - **Step 4, built 2026-10-23: your block in the city (D67).** The slice's block stands whole as the south face of the inner-ring block nearest downtown that holds it (`packages/sim/src/city/home.ts`). The city is planned from the block's own seed, so the address is worked out from the save, not stored: saves from before the city load unchanged, and step 5's migration is not needed. The page draws the faces of the blocks within 60 m (tune) and walks a grid widened over them (`walkGridAround`); your block's ground is as it was, cell for cell, so every walk on it, the walk to work among them, costs what it did. What hides you is cut, to its sills when it has no interior (D64). Found on the way: the shop's shelves were found by a cell number of the block's own grid, which on the wider grid is another square; and the wider grid, counting cells from a corner 60 m off, rounded otherwise at furniture's edges. Planted bugs: 4, 4 caught.
  - **Step 5, built 2026-10-23: the map, arterials, culling, the gates' readings.** The map draws Ridgefield below the block, each district named once on its most interior cell, the arterials and where you live. Arterials run along every fourth cell edge, marked in the street network; what they change waits for travel (M2.9). The stage draws only pieces on the screen or within 64 px of it: the town's frame rate at 4× was 18.6 fps without it and is 36.4 with it. Every walkable face of 1,000 cities passes (the third gate, Evan's answer to open question 59). The city's size and people are traced against two comparable cities in CALIBRATION.md; the districts' densities are not yet. A browser test crosses the street by a tap and sees the building across it cut to its sills. Planted bugs: 4, 4 caught: a district left unnamed on the map, arterials at the wrong spacing, culling that never culls, only interiors cut in the browser.
    - Found on the way: PR #14 said `life-v2.json` loads to exactly the state it saved, but its test had never been written; the edit that should have added it failed unseen. It is written now, and the content both fixtures were saved with is kept beside them (`pack-0b75d724de0fc3b0.json`), so the exact replay holds whatever the content becomes. Planted bugs: the walk kept a minute long and no migration, both caught.
- **M2.2 People.** Households and tier-1 people with schedules and offscreen progression.
  - Decisions: the 1,000 spread across the city (D68), walking the town (D69), the coworker and the fence among them (D70).
  - **Done when:**
    - the 1,000 have homes on residential lots in every district, by its share of the people, and work at workplaces on its lots [auto];
    - an hour of them, and a month in one action, fit a phone's budget with the CPU slowed four times, and the save's size is read [auto];
    - whoever is in the town is drawn where their hour puts them, and the frame rate is read with them [auto];
    - the coworker and the fence are two of them, and saves from before load with their names, regard and memory kept [auto];
    - 500 seeded weeks still play with no refusal, and the browser bot keeps its shifts [auto];
    - the frame rate with people on Evan's phone [you].
  - **Step 1, built 2026-10-23:** each home, workplace and third place of the roster stands on a lot of the city (`packages/sim/src/people/placed.ts`, D68): homes by the districts' people, workplaces by a new jobs density on each district (tune), third places by people; in the districts that can be walked, homes are buildings people live in and the rest shops, diners and offices. Planted bugs: 3, 3 caught.
  - **Step 2, built 2026-10-23:** the 1,000 people live in the life's game, in 24 shares, each moved on when time passes its hour (the time module's `passed` event), so a save from before them starts them with no timer it never had. Old saves load with the people added and nothing else changed; the fixtures' exact replays are held by the game they were saved with. The slice's test life holds no people, so the 500-week sweeps stay the player's (they took ten times as long with them). Planted bugs: 1, 1 caught.
  - **Step 3, built 2026-10-23: the coworker and the fence among them (D70).** People 0 and 1 of the roster are the coworker and the fence: their homes, needs and ties are the people's, and their names, regard and memory stay where they were. Their hours come from their own modules through facts: the coworker works the shift the ties module gives them, yours on your days (`ties.their-start`, `job.shift-start`), and the fence the fence record's hours (`law.fence-from`). Nothing in a save changes shape, so no migration was needed. Planted bugs: 2, 2 caught; the second only after a test compared a life's share with the roster's plain day, which also found the life's listener never asking for those hours.
  - **Step 4, built 2026-10-23: the people on the town's streets (D69).** The page draws the tier-1 people its hour puts outside in the town (`apps/game/src/city/crowd.ts`): on the way to work they walk the street network from their door to their work's, on the right-hand sidewalk; the coworker stands at the griddle through their shift and the fence behind the diner in their hours. Everyone else is indoors. Each person's look is drawn from the people's seed. Planted bugs: 2, 2 caught. Found: with the 1,000 spread across the city (D68), 20 of life-1's people have a way to work through the town, and someone is in view for 12 minutes of a day's 1,020 from 05:00 to 22:00, two at most (open question 64).
  - **Step 5, built 2026-10-23: passers-by (D72).** The town's sidewalks carry tier-2 passers-by (`apps/game/src/city/passers.ts`): along each sidewalk, as many an hour as its length, its district's density and the hour's curve give (tune: 12 an hour on 100 m of the inner ring at the rush, none from 01:00 to 04:00). Who walks where comes from the people's seed, the sidewalk and the hour, so the same minute shows the same people and nothing is saved. They step round lamp posts and benches on the walk grid. The stage now skips movers off the screen as it skips still pieces (step 5 of M2.1), since each costs its drawing and the redrawing of what stands in front of it. Planted bugs: 3, 3 caught: no step round what stands on the sidewalk, a flat hourly curve, a start minute from `Math.random`. In life-1's town, with 982 m of sidewalk: none out at 03:00, 32 at 07:00, 54 at 08:00, 50 at noon, 25 at 22:00.
  - **Step 6, built 2026-10-23: an hour and a month of them, read.** `node tools/population/life.ts` times the life's own game, with its 1,000 people and with none, in Node and in Chromium. An hour passing fits (2.2 ms at 4×). A month in one action took 8.0 s at 4×: one passage of time reached each share whole, and each rebuilt every hour's plan alone, since plans are kept two days (17,280 built for 720). The people module now passes time on to the shares a day at a time, cut at midnight, so every share settles a day while its plans are kept: 0.90 s at 4×, M0.4's harness reading (1.05 s). The people come out as they did, since a share settles the same however its hours are split. Still a pause if the page asks for a month in one go: fast-forward is to yield between game hours (DESIGN.md, The clock), which no action does yet. Planted bugs: 2, 2 caught: the shares hearing time pass whole, and a share's weekday counted from the end of its piece of the passage.
  - **Built, 2026-10-23: every [auto] gate passed.** The fifth, read once with the people in: 500 steady weeks and 200 random-bot weeks with the 1,000 people play with nothing refused, and their reports match the same sweeps without the people to the last number (`pnpm check`'s sweeps hold no people, step 2). The browser bot keeps its shifts in `pnpm check`. Left: the frame rate with people on Evan's phone [you].
- **M2.3 Careers.** The catalogue on the template: the first 30, with the labor market.
  - Decisions: worked anywhere in the city, off screen (D73); openings and applications (D74); the first 30 entry-level, one job at a time (D75).
  - **Done when:**
    - 30 careers stand on the template, each with its wage, shifts and requirements traced in CALIBRATION.md, and none paying under the minimum wage [auto];
    - the tier-1 people hold careers from the catalogue, openings come up when they leave, and the Jobs panel lists them [auto];
    - an application's odds are the odds rolled, its answer comes in one to three days, being let go or quitting leaves you looking, and reputation follows you [auto];
    - going to work off screen costs the real walk on the street network and plays the shift with its events [auto];
    - bots that look for work, apply and keep jobs play 500 seeded weeks with nothing refused, and between them are hired into every career [auto];
    - saves from before load, with the line cook's job kept [auto];
    - the browser bot keeps its shifts, and a game day still fits its tap budget [auto];
    - a week of looking for work and working one of the new careers, played on Evan's phone [you].
  - **Step 1, the 30 careers: waiting.** The career type has its employers (districts, staff, turnover), its requirements and its hiring odds, and the line cook has them. The other 29 records wait on Michigan's wages from the federal occupational wage survey, which the build environment can't reach (open question 67).
  - **Steps 2 and 3, built 2026-10-23: openings, applying, hiring (D74).** The city's employers (`packages/sim/src/market/employers.ts`) are the tier-1 workplaces, each working one career, four tier-2 sites a career, and your block's diner. Each posts openings as often as its staff leave, by its career's turnover, and an opening stays up 10 to 28 days (`openings.ts`, tune). All of it is worked out from the seed. A new market module (`module.ts`) holds where you work, your applications, offers and reputation. Applying shows the odds first (`odds.ts`), the same function the answer rolls against, one to three days later. An offer stands two days; taking it starts the job through the job module's new `hire` effect, which pays what the old job owed first. A career can bar a record. Quitting costs reputation, being let go more, and whole shifts on time win it back. Leaving the diner, you're no longer beside the coworker; they keep their own days. The job's slice keeps its shape, so a save from before loads with the market added, at the diner, and the second fixture still replays to the state it saved once the market's own slice is set aside. Planted bugs: 10, 10 caught; one was first missed, which found the coworker's hours depending on your job.
  - **Step 4, built 2026-10-23: the Jobs tab and work off screen (D73).** The panel's Jobs tab lists your job, offers, applications and the openings nearest first, with pay, the walk and the odds (`apps/game/src/life/jobs.ts`). A job away from your block is gone to from the panel (`trip.ts`): the real walk along the streets (`city/workplace.ts`, at 80 m a minute, tune), the shift worked with its events, and the walk home to your door. The page tells the sim that walk as the commute (D61), so the alarm rings in time. The griddle offers work only while your job is there. Tier-1 workplaces now stand in their career's district, and the crowd commutes to them. An e2e spec plays it by taps; the tab is checked at 360, 390 and landscape. Planted bugs: 4, 4 caught.
  - **Step 5, built 2026-10-23: the seeker bot.** `seekerFor` (`packages/sim/src/bot.ts`) starts with no job, takes the first offer it holds, applies at random with up to three answers waiting, and once hired lives as the steady bot. 500 seeded weeks refuse nothing, and between them reach every career in the content (one, so far). It found hiring far too quick: a median of 3.3 game days to a job. Evan lowered the line cook's odds to 15 in 100 (D76): 9.8 days. Planted bugs: 2, 2 caught.
  - **Fixed 2026-10-23, from Evan's play: the people moved in jumps.** The tier-1 walkers and the passers-by were placed from the sim's clock, which moves in whole game minutes, twice a real second at 1×; each stood still, then jumped about 2 m, while their legs kept walking. They are now placed from the clock the page shows, with the part of the next minute already passed (`Life.partial`), and during a fast-forward at its pace. `apps/game/e2e/smooth.spec.ts` measures it, and failed before the fix (Readings).
  - Found on the way: `pnpm -s typecheck` printed nothing when a package's check failed, so two type errors (a block plan's width that doesn't exist; your unit's id taken for a place) passed as clean until a test ran into them. Typecheck is now read by its exit code.
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
| A block, generated (M1.1) | planning a block from the seed: 0.037 ms; laying its walk grid: 0.063 ms, 13,270 cells; routing the longest walk on it, end to end and across the street: 6.35 ms, 94.8 m | `node packages/sim/test/block-bench.ts`, Node 22.22.0, cloud container; medians of 5 rounds | 2026-10-19 | 1,000 blocks a round |
| Frame rate, generated block, headless (M1.1) | 60 fps at full CPU. At 4× CPU, 59.9 fps by day (95th frame 16.8 ms) and 28.0 at night (95th 50.0 ms). Nobody moves in it, so by day the kept still picture is reused every frame; at night the night pass is redrawn every frame | `node apps/game/e2e/perf.ts 3 generated`: the page's Measure, 10 s at speed 1, headless Chromium 141 at 390×844 and 2×, no GPU, cloud container | 2026-10-19 | 3 runs each |
| Game JS, gzip (M1.1) | the spike's page: 39.51 kB (36.00 kB, and chunks shared with the generated block: the seeded random numbers 3.21 kB, the projection 0.30 kB). The generated block adds 5.72 kB, loaded only at `?block=generated`. CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.1) | 21 entries, 160.89 KiB, the generated block's chunks among them | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.1) | 11 records in 4 types, 3.0 kB, hash `b8bc4b46bd1c3e4c` | `pnpm content` (`eb build`) | 2026-10-19 | 1 build |
| A block with its interiors (M1.2) | planning a block and its two interiors: 0.129 ms; laying its walk grid: 0.105 ms, 13,531 cells; routing the longest walk: 7.01 ms, 96.6 m; routing the commute, the first flat's bed to the griddle: 0.96 ms, 42.5 m | `node packages/sim/test/block-bench.ts`, Node 22.22.0, cloud container; medians of 5 rounds | 2026-10-19 | 1,000 blocks a round |
| Frame rate, generated block with the walker, headless (M1.2) | 60.0 fps at full CPU by day, 59.8 at night. At 4× CPU, 56.4 fps by day (95th frame 33.3 ms, worst 33.4) and 32.2 at night (95th 50.0 ms, worst 66.7; runs 31.1 to 34.1). The walker walks through the 10 s measured, with the walls down, so the still picture holds and the cost is the walker and the night pass | `node apps/game/e2e/perf.ts 3 generated`: the page's Measure, 10 s at speed 1, headless Chromium 141 at 390×844 and 2×, no GPU, cloud container | 2026-10-19 | 3 runs each |
| Game JS, gzip (M1.2) | the spike's page: 41.21 kB (22.96 kB, and chunks shared with the generated block: the stage and the seeded random numbers 17.95 kB, the projection 0.30 kB). The generated block adds 11.61 kB, loaded only at `?block=generated`: the planner, the walker and the content 8.73 kB, the walk grid and routes 2.88 kB. CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.2) | 21 entries, 182.36 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.2) | 38 records in 7 types, 9.3 kB, hash `162584fa7720cc51` | `pnpm content` (`eb build`) | 2026-10-19 | 1 build |
| Kernel cost per action, with the job (M1.3) | reduce alone: median 67.1 µs an action (62.0–73.6); an earlier run of the same reduce code read 58.9 (57.3–66.4), so the container varies by about 15%. A turn with the steady bot choosing: 148.1 µs (142.5–167.5). Before each shift's timers were set at its own midnight: 89.5 µs and 174.2 µs. Eight modules: time, the economy kit, the engine's logic, clock, life, job, home | `node packages/sim/test/week-bench.ts`, 500 weeks and 57,440 actions a round, Node 22.22.0, cloud container | 2026-10-19 | 5 rounds |
| A week as the line cook, steady bot (M1.3) | 115 turns a week (91 to 138). 4 shifts worked in every week, all the first week posts from Tuesday. 1,010 events in 2,000 shifts. Late 31 times; never left early; never let go. Standing at the end 46 to 64 (median 57); skill 5 to 7. Paid on the Friday $58.64 to $306.26 net (median $210.13), from $64.07 to $353.52 gross. Cash at the end $298.64 to $554.26 (median $450.13), from $300. Health 70% to 100% (10th percentile 90%) | a script over `playRun`, seeds `week-0` to `week-499`, as the week test plays them | 2026-10-19 | 500 weeks |
| A week as the line cook, random bot (M1.3) | let go in 101 of 200 weeks, for two no-shows; 42 shifts started | the same, seeds `random-0` to `random-199` | 2026-10-19 | 200 weeks |
| Hired the day before rent is due (M1.3) | from Monday 30 June: rent owed at the end of the first week in 200 of 200, since the first Friday pays Tuesday to Thursday; paid off within two weeks in 200 of 200, health at the end 76% to 100% (10th percentile 88%). Before the bot kept a week of meals back, health ended under 18% in a tenth of runs | the same, `steadyFor(14)`, seeds `rent-0` to `rent-199` | 2026-10-19 | 200 fortnights |
| Shift events in the bots' weeks (M1.3) | all 28 choices of the 14 events taken; the rarest, pushing on while nodding off, 4 times. The odds shown were the odds rolled in all 634 choices | a script playing `steadyPolicy` and `randomLifePolicy` turn by turn, with a preview before each choice | 2026-10-19 | 300 weeks each |
| Game JS, gzip (M1.3) | the spike's page: 45.36 kB (27.11 kB, and chunks shared with the generated block: the stage and the seeded random numbers 17.95 kB, the projection 0.30 kB). The job's code and the engine's roll are in the life game the spike's clock runs. The generated block adds 15.55 kB, loaded only at `?block=generated`: the planner, the walker and the content 12.67 kB, the walk grid and routes 2.88 kB. CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.3) | 21 entries, 207.33 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.3) | 58 records in 10 types, 20.7 kB, hash `488253fa8d07d96b` | `pnpm content` (`eb build`, with the game's facts) | 2026-10-19 | 1 build |
| Kernel cost per action, with the coworker (M1.4) | reduce alone: median 67.6 µs an action (62.4–74.8), level with M1.3's 67.1. A turn with the steady bot choosing: 172.8 µs (159.0–177.5), against M1.3's 148.1: more than the container's 15%, so the ties module's options and facts, read every turn, cost about 17%. Nine modules: M1.3's and ties | `node packages/sim/test/week-bench.ts`, 500 weeks and 57,276 actions a round, Node 22.22.0, cloud container | 2026-10-19 | 5 rounds |
| The coworker in a steady week (M1.4) | beside you on a shift in 500 of 500 weeks; familiarity at the end 20 to 44 (median 37). Regard 26 to 92 (median 50). Kinds remembered 0 to 4 (median 1). 172 requests, 171 answered. Pronouns she 232, he 233, they 35, as the pool's 30, 30 and 6 | a script over `playRun`, seeds `week-0` to `week-499` | 2026-10-19 | 500 weeks |
| The coworker in a random week (M1.4) | familiarity 0 to 27 (median 0): the random bot starts few shifts (42 in 200 weeks at M1.3). Regard 9 to 82 (median 38). 147 requests, 94 answered; 181 covers asked, 85 given. All 17 acts reached across these and the steady weeks; the odds shown were the odds rolled in every cover asked | the same, `randomLifePolicy`, seeds `ties-random-0` to `ties-random-299`, and `packages/sim/src/ties/week.test.ts` | 2026-10-19 | 300 weeks |
| Game JS, gzip (M1.4) | the spike's page: 47.54 kB (29.29 kB, and chunks shared with the generated block: the stage and the seeded random numbers 17.95 kB, the projection 0.30 kB). The coworker's code is in the life game the spike's clock runs. The generated block adds 18.29 kB, loaded only at `?block=generated`: the planner, the walker and the content 15.41 kB, the walk grid and routes 2.88 kB. CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.4) | 21 entries, 223.18 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.4) | 83 records in 13 types, 30.1 kB, hash `7f75ad895f53b5cf` | `pnpm content` (`eb build`, with the game's facts) | 2026-10-19 | 1 build |
| Kernel cost per action, with the law (M1.5) | reduce alone: median 62.3 µs an action (60.2–68.9), level with M1.4's 67.6. A turn with the steady bot choosing: 188.2 µs (188.1–200.0), within the container's noise of M1.4's 172.8. With every good on every shelf, 53 takes, it read 280.6 µs (265.4–303.9): the engine checks each option it offers. Eleven modules: M1.4's, the inventory kit and law | `node packages/sim/test/week-bench.ts`, 500 weeks and 57,276 actions a round, Node 22.22.0, cloud container | 2026-10-19 | 3 rounds; 5 before the change |
| Who sees the shelves (M1.5) | of 9,000 shelves in 1,000 shops: nobody 3,995 (44%), the camera only 2,006 (22%), the camera and the clerk 2,994 (33%), the clerk only 5. Every shop has one to four shelves nobody sees. Before the camera was moved off the wall shelves' cells it saw 6% of them and 57% were unseen | a script over `shopSight`, seeds `sight-0` to `sight-999` | 2026-10-19 | 1,000 shops |
| Eight weeks as a thief (M1.5) | net worth at the end, cash less what is owed: −$4,133 to −$547 (median −$579; 90th percentile −$548). Held in 299 of 300 lives and barred in all 300; 1,128 thefts, 1,100 sold; 582 tickets; HYTA in 300, a conviction in 245 cases, 37 dismissed; convictions at the end 0 to 7 (median 0). Nothing refused | `thiefFor(56)` over `playRun`, no job, seeds `read-thief-0` to `-299` | 2026-10-19 | 300 lives |
| Eight weeks as the line cook (M1.5) | net worth at the end $2,667 to $3,539 (median $3,014); never near the law | `steadyFor(56)`, the same, seeds `read-steady-*` | 2026-10-19 | 300 lives |
| Eight weeks at random (M1.5) | net worth −$2,515 to −$269 (median −$737). 750 thefts, held in 292 lives; 437 warrants, all arrested and heard; 87 on HYTA, 14 revoked. Nothing refused | `randomFor(56)` with the line cook, seeds `read-random-*` | 2026-10-19 | 300 lives |
| Game JS, gzip (M1.5) | the spike's page: 55.38 kB (index 34.86 kB, and a chunk shared with the generated block, 20.52 kB: the records, the planner and the seeded random numbers). Up 7.8 kB from M1.4: the life game plans the block to find the shop, so the planner and the pack now load with the spike. The generated block adds 17.08 kB, loaded only at `?block=generated`: its scene 13.96 kB, the walk grid and routes 3.12 kB. CSS 0.95 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.5) | 20 entries, 244.69 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.5) | 105 records in 17 types, 34.7 kB, hash `78a30f0060b99d3d` | `pnpm content` (`eb build`, with the game's facts) | 2026-10-19 | 1 build |
| Frame rate, the life, walking to the diner (M1.6) | 60.0 fps at full CPU (95th frame 16.7 ms). With the CPU slowed four times: 40.6 fps (95th 50.0 ms, worst 100.1; runs 37.1 to 45.6). Before the mode sheet stopped working out every option each frame, and the bar stopped reading its facts each frame: 34.1 fps (95th 66.7 ms). Below M1.2's 56.4 for the block with its walker; the likeliest cost is the camera following you, as each pan repaints the kept picture (open question 41), not yet measured apart | `node apps/game/e2e/perf.ts 3 "the life"`: the page's measure over 10 s at speed 1, headless Chromium 141 at 390×844 and 2×, no GPU, cloud container | 2026-10-19 | 3 runs each |
| A day played by taps (M1.6) | sign up, eat, sleep to the shift, walk to the diner by the map, work it and answer its event, walk home, sleep: about 75 s on the test's clock, refusing nothing | `apps/game/e2e/life.spec.ts`, headless Chromium | 2026-10-19 | 1 run a check |
| Game JS, gzip (M1.6) | the life's page: about 78.8 kB (the life 9.55 kB, the block's scene 15.00, the stage 20.57, the sim and records 28.99, the projection 3.18, the loader 1.48). The spike at `?spike`: about 59.7 kB. CSS 1.58 kB. Vite's chunk names don't follow the code's folders, so the split is read from the build log | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.6) | 25 entries, 274.85 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| The content pack (M1.6) | 138 records in 18 types, 37.9 kB, hash `0b75d724de0fc3b0` | `pnpm content` (`eb build`, with the game's facts) | 2026-10-19 | 1 build |
| A save (M1.7) | 4.8 kB for a new life run 10 s at speed 2: the state 1.96 kB and a log of 80 actions. The first fixture, a bot's week with 16 actions in its log: 3.8 kB. The log is compacted at 200 actions; at about 35 bytes an action, an estimate not a reading, a save tops out near 9 kB until the state grows | `node apps/game/e2e/saves-bench.ts 20 10`, headless Chromium 141 at 390×844; `test/fixture.ts` | 2026-10-19 | 1 life |
| Saving and loading a life (M1.7) | Write to IndexedDB: median 3.0 ms (95th 10.2) at full CPU; 28.2 ms (95th 63.1) with the CPU slowed four times. Load, checked and replayed: 5.4 ms (95th 9.5); 32.9 ms (95th 49.8). On the page's thread (open question 45) | `node apps/game/e2e/saves-bench.ts 20 10`, headless Chromium 141, cloud container, no GPU | 2026-10-19 | 20 each |
| Frame rate, the life (M1.7) | 60.0 fps at full CPU. With the CPU slowed four times: 42.1 fps (95th 50.0 ms, worst 83.3; runs 39.1 to 44.9), with time sent once a game minute and the saves on. Inside M1.6's spread of 37.1 to 45.6, so no change is claimed | `node apps/game/e2e/perf.ts 3 "the life"`, `?seed=life-1` | 2026-10-19 | 3 runs each |
| Game JS, gzip (M1.7) | the life's page: about 84.6 kB, up 5.8 kB, in the life's own chunk, now 15.36 kB: the saves (`@eb/platform`), the keeper and your lives. How much of it is the engine's isn't split out. CSS 1.70 kB | `vite build` | 2026-10-19 | 1 build |
| Game precache (M1.7) | 25 entries, 290.72 KiB | vite-plugin-pwa build log | 2026-10-19 | 1 build |
| Taps a day, the steady life on the page (M1.8) | median 16 taps a game day, 29 at most, with 6 pans (the camera brought round to a place) and 1.07 real minutes. Every shift was worked, and all 12 started late, by 7 to 85 minutes (open question 39). Against Dirtbag's 20 taps a day, borrowed. The bot takes no time to think, so its minutes are the least a player could spend | `node apps/game/e2e/day-bot.ts steady 7 3 4`: the browser bot (D55), `?seed=bot-1` to `bot-3`, headless Chromium 141 at 390×844 with the CPU slowed four times | 2026-10-19 | 3 seeds, 18 full days |
| Taps a day, a thief's case on the page (M1.8) | median 12 taps a game day, 30 at most, with 5 pans and 1.57 real minutes. Stopped by the clerk on the first day and ticketed; paid the shop's demand; went to court on the day and pleaded guilty, and was fined $325. Let go by the diner on the way, for lateness | `node apps/game/e2e/day-bot.ts thief 45 1 4`, `?seed=bot-1` | 2026-10-19 | 1 seed, 44 full days |
| Taps a day, with the alarm (M1.8, D57, D58) | steady: median 16 taps a day, 33 at most, 6 pans, 1.05 real minutes. All 12 shifts worked, all late, but by 8 to 52 minutes, ten of them by 8 to 13 (before the alarm, 7 to 85); none let go. The thief: median 12 taps, 32 at most, 1.56 real minutes; went to court and pleaded guilty, and was let go after 8 late starts in a row of 7 to 13 minutes. What lateness is left is reaction time: at speed 2 a real second is 8 game minutes, and the alarm's 30 minutes leave about 10 over the walk (open question 53) | `node apps/game/e2e/day-bot.ts steady 7 3 4` and `thief 45 1 4`, as above | 2026-10-20 | 3 seeds, 18 full days; 1 seed, 44 |
| Late for work, as the fixes came in (after M1.8) | Steady bot, 3 seeds, 12 shifts each run. 1× at the alarm (D60): 10 late, mostly 6 minutes. Your own walk set aside (D61): 11 late, 6 to 7 minutes, because the bot waited at the diner's door, not the griddle; at the griddle, 6 late, as it ate or washed first. Going to work when the alarm goes off: **none late**. Taps a day unchanged: median 17, 35 at most, 1.42 real minutes | `node apps/game/e2e/day-bot.ts steady 7 3 4` | 2026-10-20 | 3 seeds, 18 full days each run |
| A thief's case, with the court alarm (D62) | median 17 taps a day, 37 at most, 1.45 real minutes. Ticketed on day 0; went to court on the day and pleaded guilty; paid. 24 shifts, 1 late; kept the job. Before the court alarm, a night's sleep had run through the court's hours and a warrant followed | `node apps/game/e2e/day-bot.ts thief 45 1 4` | 2026-10-23 | 1 seed, 32 full days |
| The whole city planned (M2.1, D65) | Ridgefield: 4,149 blocks, 78,038 lots, 289,536 people. Plan: median 63 ms, 95th 152 ms, worst 178 ms with the CPU slowed four times; 24 ms median at full CPU; 16 ms in Node. Its typed arrays hold 1.71 MB; Chromium's heap grew about 9 MB keeping one plan (coarse: `performance.memory`). Streets and lots only: what stands on a lot is planned when its block is needed | `node tools/city/chromium.ts 10 3` (Chromium 141, headless, no GPU) and `node --expose-gc tools/city/bench.ts 10 3` | 2026-10-23 | 10 seeds × 3 rounds each |
| A city face, planned when needed (M2.1) | every face of every walkable block in 100 cities: 193,256 faces, 1,784,349 buildings, no problems against M1.1's and M1.2's rules, the city's lots or the walk grid. A face planned, its back row and interiors included: median 0.239 ms, 95th 0.441, worst 64.0 (a pause, likely the collector's; the 10-city run's worst was 28.7) | `node tools/city/faces.ts 100`, Node 22.22.0, cloud container; the checks not timed | 2026-10-23 | 100 cities |
| The whole city planned, whole blocks to a cell (M2.1, step 3) | Ridgefield: 10,106 blocks, 163,933 lots, 289,536 people (the earlier row's layout left land unbuilt). Plan: median 133 ms, 95th 197 ms, worst 209 ms with the CPU slowed four times; 25 ms median at full CPU and in Node. Typed arrays 3.64 MB; Chromium's heap grew about 13–15 MB keeping one plan (coarse). Planned once when a life starts | `node tools/city/chromium.ts 10 3` (Chromium 141, headless, no GPU) and `node --expose-gc tools/city/bench.ts 10 3` | 2026-10-23 | 10 seeds × 3 rounds each |
| Every walkable face of 1,000 cities (M2.1's third gate) | 3,459,090 faces and 31,396,820 buildings, no problems against M1.1's and M1.2's rules, the city's lots or the walk grid. A face planned: median 0.245 to 0.250 ms and 95th 0.506 to 0.518 by shard; worst 316 ms, with builds and tests sharing the CPU | `node tools/city/faces.ts 250 [0, 250, 500, 750]`, four shards side by side, Node 22.22.0, cloud container; the checks not timed | 2026-10-23 | 1,000 cities |
| Walks across the city (M2.1's fourth gate) | the street network built: median 25.9 ms, worst 45.2; 10,606 corners in a city. A walk between two walkable doors chosen by the seed: median 0.32 ms, 95th 1.10, worst 54.1 (the first, likely compiling); median 2,974 m, longest 7,334 m. No walk missing | `node tools/city/walks.ts 10 200`, Node 22.22.0, cloud container | 2026-10-23 | 2,000 walks over 10 cities |
| Frame rate, the life in the town (M2.1) | 59.7 fps at full CPU. With the CPU slowed four times: 36.4 fps (95th frame 66.6 ms, worst 100.0; runs 30.7 to 42.5). Before pieces off the screen were culled: 18.6 fps (95th 133.3 ms). Against 42.1 for the block alone (M1.7) | `node apps/game/e2e/perf.ts 3 life`: the page's Measure, 10 s at speed 1 walking to the diner, headless Chromium 141 at 390×844 and 2×, no GPU, cloud container | 2026-10-23 | 3 runs each |
| A save with the tier-1 people (M2.2) | 172,470 bytes, against about 4,800 without them. Write: median 41 ms (95th 89) at full CPU, 224 ms (95th 306) with the CPU slowed four times. Load: 24.7 ms and 131 ms (95th 179) | `node apps/game/e2e/saves-bench.ts 20 30`, headless Chromium 141, IndexedDB, cloud container | 2026-10-23 | 20 writes and loads each |
| A save with the tier-1 people, 12 ties each (M2.2, D71) | 112,527 bytes. Write: median 27 ms (95th 87) at full CPU, 142 ms (95th 226) with the CPU slowed four times. Load: 14.2 ms and 92.9 ms (95th 163). Not the half estimated: the needs' levels are long numbers too | `node apps/game/e2e/saves-bench.ts 20 30` | 2026-10-23 | 20 writes and loads each |
| Frame rate, the life with 1,000 people (M2.2) | 59.6 fps at full CPU. With the CPU slowed four times: 45.6 fps (95th frame 33.4 ms, worst 83.3; runs 40.8 to 46.4). Nobody is drawn yet: the people's cost is their shares moving on as time passes | `node apps/game/e2e/perf.ts 3 life` | 2026-10-23 | 3 runs each |
| Placing 1,000 people's homes and work in the city (M2.2) | 69 to 149 ms in Node (median about 92), most of it planning the faces they land on | a one-off script over `placeRoster`, Node 22.22.0, cloud container | 2026-10-23 | 10 cities |
| Frame rate, the life with people and passers-by drawn (M2.2, D72) | 59.7 fps at full CPU. With the CPU slowed four times, three rounds of three runs alternating the two builds: 30.3, 31.2 and 35.9 fps, against 36.9, 36.5 and 35.2 for step 4's build without passers-by. Runs split between about 27 and 35 fps, as frames land on 16.7 or 33.3 ms. A profile puts the passers-by's own code under 1% of the time and copying the kept still picture at 30%: the cost is drawing, on a container with no GPU | `node apps/game/e2e/perf.ts 3 life`, headless Chromium 141; a CDP profile of one run | 2026-10-23 | 9 runs each build |
| An hour and a month of the life with its 1,000 people (M2.2) | With the CPU slowed four times: an hour 2.2 ms (median; slowest of 240, 28 ms), a month in one action 0.90 s (runs 0.66 to 0.97 s), against 0.10 ms and 45 ms with no people. At full CPU: 0.30 ms and 150 ms in Chromium, 0.66 ms and 245 ms in Node. Before the people heard time a day at a time, the month took 8.0 s at 4× and 2.2 s in Node | `node tools/population/life.ts 5`: Node 22.22.0, headless Chromium 141, cloud container | 2026-10-23 | 5 lives, 48 hours and a month each |
| The week sweeps with the 1,000 people (M2.2) | 500 steady weeks: all stopped at the week's end, none refused, 500 distinct; 200 random-bot weeks: the same. Each report equals the sweep's with no people, metrics and all | a one-off script over the engine's `sweep`, the life's game with and without its people, Node 22.22.0 | 2026-10-23 | 500 and 200 seeds |
| People moving in the town, a frame at a time (after M2.2, on Evan's report) | before: walkers stood still on 97% of frames and jumped once a game minute, since they were placed from the sim's whole-minute clock. After: never still; the largest step in a frame 0.07 m at speed 1 and 0.26 m at speed 2 | `apps/game/e2e/smooth.spec.ts`, headless Chromium 141 at 390 px, life-1 at 07:00 | 2026-10-23 | 90 frames at each speed |
| Looking for work at 15 in 100 (M2.3, D76) | hired in a median of 9.8 game days (90th percentile 37.3); 499 of 500 working within 12 weeks; 7.1 applications a hire. Within a week, 194 of 500 (39%) | a one-off script over `seekerFor`; `market/seeker.test.ts` for the week | 2026-10-23 | 500 seeds |
| Looking for work: the seeker bot from no job (M2.3) | hired in a median of 3.3 game days (90th percentile 16.3); 458 of 500 working within 28 days; 2.7 applications a hire. Within a week, 336 of 500 (67%). Two answers in five were no, at the line cook's odds of one in two | a one-off script over `seekerFor` and the life's game; `market/seeker.test.ts` for the week | 2026-10-23 | 500 seeds |
| Openings across the city (M2.3) | with only the line cook in the content, about 0.075 a week at each employer of six staff; the rate summed over every employer within 3% of staff × separations, over 8 years | `market/openings.test.ts` | 2026-10-23 | every employer of 3 seeds' cities |
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
- 2026-10-19: M1.1 done, alongside M0.3's open gates on Evan's word. The block is one side of one street (D32), generated from `packages/content`, the game's first content as an Engine-Builder project, checked in CI and built into a pack. The walk grid and its routes are in `packages/sim/src/city/`, and the stage draws facades from the grammar. The page stays M0.3's spike, with the generated block at `?block=generated` (D33). A golden test holds the spike to its drawing. Planted bugs: 23, 23 caught. The marker stays on M0.3.
- 2026-10-19: M1.2 done, alongside M0.3's open gates on Evan's word. The apartment house's ground floor is two studios off a stair hall (D34), and the diner has a back room and a back door (D35), both from fixture, room and interior records in `packages/content`. The walk grid opens their floors, and the stage cuts them room by room. A walker goes from a bed to the griddle and back at `?block=generated` (D36). Planted bugs: 32, 32 caught. The marker stays on M0.3.
- 2026-10-19: M1.3 done, alongside M0.3's open gates on Evan's word. The city borrows Michigan's tax and law (D37). The line cook is the first career on the template: a career record, 14 shift events and 5 taxes in `packages/content`, and the job in `packages/sim/src/job/`. Shifts are posted on Thursdays and signed up for. Pay is withheld as a Michigan employer would (D38). Two no-shows in 28 days end the job (D39). A shift event stops the shift for a choice whose odds are the odds rolled (D40). The figures are from secondary sources, marked in CALIBRATION.md to check. Planted bugs: 48, 48 caught. The marker stays on M0.3.
- 2026-10-19: M1.4 done, alongside M0.3's open gates on Evan's word. The other line cook is the first relationship (D41): drawn at hire from the seed and a name pool, beside you on five days in seven. Shift events they're part of, lateness, no-shows and favours both ways are acts they remember by kind (D42, D44), and regard sets the odds of what they'll do for you (D43). The ties module is `packages/sim/src/ties/`. Planted bugs: 40, 40 caught. The marker stays on M0.3.
- 2026-10-19: M1.5 done, alongside M0.3's open gates on Evan's word. The first crime is shoplifting in the corner shop, a third walkable interior where who sees you is worked out on the walk grid (D45). The law answers in the act or later, at times you are told, with tickets, the shop's civil demand and a bar (D46). The court fines you, or offers HYTA on a first offence (D47). Anything can be stolen, and a fence buys it, yet eight weeks of theft leave a life poorer than eight weeks at the line (D48). The law is `packages/sim/src/law/`. Planted bugs: 40, 40 caught. The marker stays on M0.3.
- 2026-10-19: M1.6 built, alongside M0.3's open gates on Evan's word; its phone reading is Evan's. The page is the life now, played by taps: walk the block at a brisk pace with the clock running (D49), one bar with panels on tap (D50), the map of the block (D51), and the chronicle as a journal with one-line toasts (D52). The spike is at `?spike`. You have a name, and every event a player would see has a line. Planted bugs: 20, 20 caught. The marker stays on M0.3.
- 2026-10-19: M1.7 built, alongside M0.3's open gates on Evan's word. The game moves to `life.rcjlabs.com` before any save is kept (D53), and saves itself: three lives to a device, saved after every choice and as time passes, with no going back within a life (D54). The journal and where you were come back with it. A save that won't load is kept aside and said so. The first fixture save must keep loading. Planted bugs: 13, 13 caught. The marker stays on M0.3; the live domain waits on Evan's DNS record.
- 2026-10-20: M1.8 built, alongside M0.3's open gates on Evan's word. A bot plays the page by taps on a slowed phone and counts them: a median of 16 taps a game day for a steady life, 12 for a thief's case, and about a real minute and a half (D55, D56). It found that a steady player was late for every shift and could sleep through one, and that court could pass unseen; an alarm (D57) and two warnings (D58) answer them. The tap budget waits for the playtests (D59). Planted bugs: 8, 8 caught. The marker stays on M0.3.
- 2026-10-23: after M1.8, on Evan's word: the alarm drops the clock to 1× (D60) and sets aside your own walk to work, as the page measures it (D61; `you` goes to version 2, with a migration and a second fixture save); on a court day what you do ends when the court opens (D62). The browser bot, taught to wait at the griddle and go to work first, is late for none of its shifts, and its thief makes the court date. Planted bugs: 12, 12 caught.
- 2026-10-23: M2.1 steps 1 and 2 built. Ridgefield is planned whole from the seed, its districts, blocks and lots (D63–D66), and each face of a walkable block is planned only when needed, from the district's frontage: downtown's office blocks, the inner ring's row houses and shops, and the courthouse and precinct on the downtown lots nearest the centre.
- 2026-10-23: M2.1 steps 3 to 5 built. Whole blocks fill each cell, and the streets are one network with walks across it and arterials along every fourth cell edge. Your block stands whole in the city (D67), drawn and walked with the blocks within 60 m; what hides you is cut to its sills (D64); the stage culls what is off the screen. The map shows Ridgefield. Every walkable face of 1,000 cities passes. Left: the frame rate on Evan's phone [you].
- 2026-10-23: M2.2 built. The 1,000 tier-1 people have homes, work and third places on the city's lots (D68) and live in the life's game in 24 shares, moved on as time passes, a day at a time. The coworker and the fence are two of them (D70), with 12 ties a person (D71). The town draws those its hour puts outside (D69) and tier-2 passers-by on its sidewalks (D72). An hour of them costs 2.2 ms at 4×, a month 0.90 s, a save 112 kB. Left: the frame rate on Evan's phone [you].

## Open questions

1. The title (D24).
2. The city's name, the base year, and whether the district trend is on by default.
3. The tick in game minutes and the speed steps (proposals in DESIGN.md), set from M1.8's reading.
4. Whether D31's 1,000 tier-1 people hold when M2.2 gives them their real state and choices, or the count drops to 500.
5. Whether this game becomes an Engine-Builder proof, which would reopen that project's build order (3D before 2D).
6. How the kits a life sim needs (needs and mood, relationships, schedules, careers, law) move back into Engine-Builder, and when.
7. The package id scheme, shared with Engine-Builder's open question (`io.github.rcjlabs.*` or `com.rcjlabs.*`).
8. The licence. Until decided, all rights reserved.
9. A domain of its own (`*.rcjlabs.com`) before M1.7's saves and Phase 3's TWA. `rcjlabs.github.io` is one origin for every RCJ Labs project site, so its storage is shared, and `assetlinks.json` can't sit at its root. It waits on the title (D24). **Answered by D53 (M1.7):** `life.rcjlabs.com`, a subdomain without the title, before any save is kept.
10. The replay log at frame rate. The stage sends one `time/elapse` a frame, so a session logs about 60 actions a second. Before M1.7's saves: merge consecutive elapses in the log, or send time less often and let the stage interpolate. **Answered (M1.7):** the page sends time in whole game minutes, about two actions a second at speed 1.
11. The engine offers its stage-only verbs, `time/elapse` and `time/advance`, to bots with an empty payload. Elapse refuses it, and advance spends no time. This game's bots skip both (`STAGE_ONLY` in `packages/sim/src/bot.ts`). To raise in Engine-Builder: a way to mark a verb as never offered.
12. Portrait or landscape for the city view. At 390 px portrait, two buildings in frame make people 23–25 px tall; landscape about 36 px (Readings). The stranger test says whether portrait is enough.
13. The kept still picture is repainted whole on every pan, so a long drag may stutter on a slow phone at night. If the phone reading shows it: keep a margin round the screen in the layer, or repaint only the strip a pan uncovers.
14. The engine copies a module's whole slice, element by element, in every action that writes to it, and freezes it again with a path built for every element. At 54,000 numbers that is 15.4 ms with the CPU slowed four times (Readings). D30's shares work round it here. To raise in Engine-Builder: copy arrays of numbers in one pass, and build a bad element's path only when there is one. A lean version beside the kernel was 2.5 times faster.
15. The engine fires at most 10,000 timers in one advance. An hourly timer, as D30's is, caps one action at about 416 days, and D19's skip to an heir's 18th birthday passes years. Before M2.7: pass long skips in several actions, or catch the people up in one effect. Or raise in Engine-Builder a way to fire a repeating timer's missed periods at once.
16. How the city shows a street's near side under the fixed camera (D7, D32). Either cut its buildings to sill height while the player is on the street, as Project Zomboid hides what stands in front, or keep that side's lots low or open. M2.1's city decides.
17. The longest walk on the block takes 6.35 ms to route in Node (Readings), about four times that on a slow phone: a dropped frame or so a tap. Before M1.6's tap-to-go: reuse A*'s buffers between routes, or route on a coarser graph of sidewalk lengths and crossings.
18. How walking time meets the clock (D2, D36). The walker walks 1.3 m a stage second, and at speed 1 a stage second is 2 game minutes. So the 42.5 m commute takes about 65 game minutes on screen, where a real walk of it takes about half a minute. M1.6 decides: route time in game minutes at a real pace, with people moving faster on screen; the clock slowed while someone walks a short way; or a time tuned for play (D11). **Answered by D49 (M1.6):** a brisk walk, three times a real pace, with the clock running; the commute is about 20 game minutes.
19. A building without an interior can't be cut away, so it hides whoever walks behind it, in a gangway or a yard. With question 16, M2.1's city decides: a shell cut for every building, its walls low and no floor, or fading what stands in front, as Project Zomboid does.
20. M1.5's shoplifting happens in the corner shop, which has no interior yet. D18 opens other businesses as a counter scene, but shoplifting needs shelves, a till and sight lines. M1.5 decides: a third interior from the same records, or the counter scene.
21. Every wage and tax figure is from a secondary source, because the build environment can't reach irs.gov, ssa.gov, michigan.gov or bls.gov (CALIBRATION.md, In use). Either those domains are added to the environment's allowed list and the figures checked here, or Evan checks them by hand. May 2025's wage figures, the base year's, replace May 2024's either way.
22. A shift event stops the clock with a mode that allows only a choice, so the stage's `time/elapse` is refused while one is up. M1.6's stage must stop sending time while the mode isn't `world`, or the replay log fills with refusals. **Answered (M1.6):** the page sends time only out in the world (`apps/game/src/life/session.ts`), and a test holds it to that in every mode.
23. Work in real time (M1.6). From the menu, work runs until the shift's end or its event, whichever comes first, so the routine stops for the event. A real-time "start working" verb needs the same end, or the event comes due while the stage's clock runs on through it. **Answered (M1.6):** the menu's work runs to the shift's end or its event, a fast-forward with you at the griddle, as the bots' does.
24. Skill is one count of practice minutes for the job held. When a second career shares a skill, as chef shares cooking with line cook (M2.5), skills become records of their own and practice is kept per skill.
25. The diner never schedules past 40 hours a week, so FLSA's time and a half never arises. A career that schedules overtime, or an event that keeps someone late, needs it.
26. Shift events tell what happened in the second person (`told`). The chronicle's third-person line for each outcome (VOICE.md) comes with M1.6's chronicle, and the voice pass on all of them with M2.10. **In part (M1.6):** the chronicle has one line for every shift event's outcome ("had to deal with the rush"). A line for each outcome waits for M2.10's voice pass.
27. The engine's choice events (its M3.6) and standing (its M3.5) are planned, not built. This repo's deck, odds and outcomes are built here first (D13). Port them to the engine when it gets there, or move to the engine's.
28. A favour they ask waits in the world with the clock running (M1.4). M1.6's HUD has to show it and the day it lapses, or a player who never opens the right panel only ever learns of it as "never answered". **Answered (M1.6):** the panel lists it with its day, and the badge counts it (D50).
29. The chronicle's lines about the coworker (M1.6) are third person, where they would be the subject: "She covered..." against "They covered...". `fill()` dodges agreement by naming them. The chronicle needs a subject form that agrees with its verb, or the same rule of naming them. **Answered by D52:** lines name people, so no verb has to agree.
30. Nothing fades yet (D44): regard, familiarity and memories keep for good. M2.6's social verbs decide how they fade, and whether a kind of act forgotten from the 8 should still count.
31. The coworker isn't one of the tier-1 people (`people/`). Their week comes from their seed alone, with no home, needs or evening. M2.2 makes them one, which must keep their days off what they were, or a save's coworker changes shifts on loading.
32. The coworker's options and facts are read every turn, and that costs about 17% a turn (Readings). With one relationship it doesn't matter. With M2.6's dozens it will: offer the ties' actions only while something is asked or askable, or cache `job.ahead` for the turn.
33. Where the player stands in the shop is the stage's (M1.6). The sim offers a take at every shelf and trusts the stage to send only the shelf the player is at. Until then nothing checks that you walked there, or how long it took. **In part (M1.6):** the page offers a take only at the shelf you have walked to, but the sim still takes the stage's word for it.
34. Being held, in the cells and in court pause the life with a mode, as a shift event does (open question 22). The stage must stop sending `time/elapse` in court. A hold allows it. **Answered (M1.6):** the page sends no time in either; the wait for the police or the hearing is the life's own `law/wait`.
35. The odds of being noticed are far above the once-in-48 anchor (CALIBRATION.md): about 4% unseen, 45% under the clerk's eye. Whether that is fair to a player is a playtest question (M1.9).
36. A record now exists (`law.convictions`, and HYTA's nonpublic one), but nothing reads it yet. M2's hiring and housing do (D47).
37. The civil demand is owed for good: a letter with no due date. Collections, and a court judgment for an unpaid demand, wait on M2's money.
38. The fence is a name and an hour, not a person among the tier-1 people. M2.2 places them, and M2's crime ladder gives them their own risk.
39. There is no "run to the next thing" yet (DESIGN.md's speed 3). Waiting for a shift means sleeping or sitting. Sleep is cut short at the shift's start, so you wake on time and then arrive late after the 20-minute walk. A "wait until" at home, or speed 3, settles it; M1.8's tap count will show what it costs. **Read (M1.8):** the steady bot on the page was late for all 12 of its shifts, by 7 to 85 minutes, and the thief, living the same way, was let go. Evan decides with the reading (D56). **In part, by D57 (M1.8):** an alarm ends what you do 30 game minutes before a shift. Speed 3 is still open.
40. The journal, where you stand and your flat live in the page, not the save, so a reload loses them until M1.7. The journal can be rebuilt from the log; where you stand needs a place in the save. **Answered (M1.7):** the journal is kept beside the save, a key a day, and the place you last reached in the save's summary.
41. The camera follows you by panning, and each pan repaints the kept picture (question 13). The life reads 40.6 fps with the CPU slowed four times, against 56.4 for M1.2's block (Readings). Before M1.8's phone reading: follow in steps, or keep a margin round the screen in the layer.
42. The life sends a `time/elapse` every frame, about 60 actions a second (question 10), and compacts its log at 600. M1.7's saves need the merge question 10 proposes. **Answered (M1.7):** as question 10.
43. Your flat is the page's choice, from the block's seed. M2.2 gives people homes in the sim.
44. The interface's words are in code (`apps/game/src/life/words.ts`, `pending.ts`, `menus.ts`), not content. The content lint and M2.10's voice pass need them as records, or at least scanned.
45. A save takes 28 ms to write with the CPU slowed four times (median; 95th 63 ms), on the page's thread: the save is hashed, checked and turned to JSON there before IndexedDB takes it, and which of those costs most isn't measured (Readings). The page saves after every choice and every game hour, so a slow phone may drop a frame or two each time. Before M1.8's phone reading: measure it there; if it shows, hash in a worker or save when the page is idle.
46. The journal is the page's, kept beside the save, not in the sim, because the engine's listeners hear only events a module declares, and the chronicle's 29 aren't. D19's epilogue and an heir's reading of the family's record need it in the sim: declare those events (with their arguments) and keep the chronicle as a module, or have the epilogue read what the page keeps. M2.7 decides. It grows by about ten entries a day for good.
47. A choice is saved at once, but the write takes a few milliseconds after the outcome is shown. A tab killed inside them loses the choice, and the roll can be taken again. The browser test reloads straight after a take and the take stands; a kill wasn't tested. Saving before the outcome shows would close it, at the cost of the outcome waiting on the disk.
48. The fixture replays against today's content. While the content is the one it was saved with, it must land on its saved state; once a record changes, its log may play out otherwise, which the test allows, as a load does. A change to a slice's shape still fails it. Whether a save should name the content it was played under, and load against it, is a question for Engine-Builder.
49. A reload puts you at the last place you reached, standing. A walk in progress and a pose (asleep in bed) aren't kept.
50. A bed reached after your shift has started offers a whole sleep, to the next shift, and says nothing of the one under way. The browser bot, sent home to bed 13 minutes before a shift, arrived after it started and slept through it: a no-show, twice in three weeks, until its rules kept it up. A player can do the same. The menu could end sleep at the shift's end, or say you're due at the diner. **Answered by D58 (M1.8):** during a shift the bed says you're due at the diner, and its sleep ends with the shift.
51. Court is attended from the panel, on the day, between 08:00 and 12:00. A player who doesn't open the panel that morning misses it, and a warrant follows. The badge counts the court date, but nothing says "today". The browser bot missed its date until it was taught to look. **Answered by D58 (M1.8):** a line on the morning of a court date says you're due by noon.
52. The bot's real minutes are a floor: it thinks in no time, plays at speed 2 throughout, and waits by letting the clock run. A player's minutes a day are a playtest's reading (M1.9).
53. The alarm's 30 minutes leave about 10 over the walk, and at speed 2 a real second is 8 game minutes, so a player who takes a second or two to tap the map is still a few minutes late. The bot was, at every shift, and the diner let the thief go after 8 late starts in a row. Either the alarm sets aside more (45), or the page drops to speed 1 when it goes off, or late by under a quarter of an hour stops counting against standing. Evan decides (tune). **Answered by D60:** the alarm drops the clock to 1×.
54. A shift isn't cut short for court (D62): leaving work for a hearing is the player's to choose, and a shift that covers the court's hours means one or the other is missed. Whether the job should know of a court date, as a real employer would be told, waits for M2's work.
55. The headless bots never send `you/commute`, a verb only the page does, so in the sim's own sweeps the alarm sets aside 30 minutes, not a measured walk. The sweeps' lateness says nothing of the page's.
56. The alarm's margin of 10 minutes over the walk is a proposal (tune); the browser bot, which loses no time, was on time with it. A player who taps slowly at the alarm is the playtests' to read (M1.9).
57. Across the street from a city face is, for now, the slice's open side (a verge or a car park), since each face is planned alone. Drawing the next block's face there is the stage's step (M2.1's culling and the near-side cut, D64).
58. A north face is planned in its own frame, turned half round, so its fronts face the camera's way like every other. In the city they face away from the fixed camera (D6): what the stage shows of a north face's fronts, and of a south face's backs, is open for the drawing step.
59. M2.1's third gate asks for every walkable block over 1,000 seeds. A whole city's walkable faces take about 11 s to plan and check in Node, so 1,000 cities would take three hours. The unit test samples 1,000 faces across 10 cities on every run; `tools/city/faces.ts` walks every face of 100 (Readings). Whether that meets the gate, or the gate should say so, is Evan's call. Evan's answer, 2026-10-23: every face, over 1,000 cities; `tools/city/faces.ts` runs as shards side by side.
60. The town reaches 60 m round your block (tune): past it there is no ground to walk, and the street network's walks (walks.ts) are not yet joined to the page. Going further, by foot or by the map's tap-to-travel, is the travel milestone's (M2.9) unless Evan wants it sooner.
61. The rest of your block's face, east of the slice's lots, stands empty: the slice's block is planned alone (D67), and the city's lots there are not built on.
62. A save written in the window between a tap and its turn in the save queue can be lost by a reload straight after (the comment on PR #15). The proposed fix, a copy in localStorage on pagehide, is the engine's to make; Evan's call.
63. Gate 8 asks for the frame rate walking downtown. The reading walks the life's block, which stands beside downtown, with downtown's blocks across the street in view; walking into downtown proper waits on open question 60.
64. ~~The town's streets are nearly empty.~~ Answered by D72: tier-2 passers-by. Left open: how many is right, which waits on a look at a phone, and whether a passer-by can be stopped and met, which is M2.6's.
65. A month in one action costs 0.90 s at 4× with the people (M2.2, step 6). No action yet passes more than a night, so nothing pauses now. When prison (M2.4) or a long sleep arrives, the page should fast-forward an hour a frame, as DESIGN.md's clock says, rather than ask for the span at once.
66. ~~Hiring is far too quick.~~ Answered by D76: the line cook takes 15 in 100, and a jobless bot is hired in a median of 9.8 game days. Still quicker than a 9.6-week spell; whether to slow it further waits on the 30 careers.
67. The 29 careers' wages wait on bls.gov, which the build environment's network policy blocks. Evan can allow it under Allowed domains, or the figures can be read by hand.
68. An opening's leaver isn't tracked: the opening comes from the workplace's turnover, and the tier-1 person who left keeps their roster job and hours. Moving them for real needs a person's employer in the shares' state.
69. Off screen you walk 80 m a game minute; on your block, 1.95 m (D49). The two paces meet at your door. Whether the block's pace should come up toward the real one, or travel (M2.9) settles it.
70. The tier-1 people's hours still come from the shift templates (days, lates, nights), not from their career's shifts.
