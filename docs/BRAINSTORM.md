# Brainstorm — how the idea was found

Written 2026-10-18 and 19, in one session, from the brief below and a survey of the 21 earlier RCJ Labs repositories ([research/portfolio-survey.md](research/portfolio-survey.md)). The decisions it produced are numbered in [decisions.md](decisions.md); this file keeps the reasoning and the roads not taken.

## The brief

A Sims-like life sim: work jobs, take care of needs, start a family. Crossed with GTA: do nearly anything, as few limits as possible, as many options and possibilities as possible. Jobs from chef to CIA agent. As realistic as possible. The usual stack: a browser PWA on GitHub Pages and a Google Play TWA, solo dev. The most ambitious RCJ Labs project so far.

## The one concern, and how it resolved

"GTA-like" means two things. Physical freedom (drive anywhere in real time, shoot anyone) had no precedent in any of the 21 repositories, and the record argued against building a walkable world by hand: Dirtbag's audit retired its hand-placed town ("Stick RPG's appeal was never the walking"), the Three Winters concept said "Open-world RPGs kill solo devs with content", and Engine-Builder's non-goals keep photoreal for Unreal. Systemic freedom (any verb on any person with real consequences) was feasible, and is where the portfolio's strengths sit.

Evan kept both: the walkable world (top-down 3/4, isometric) and the systemic freedom. The concern became a rule rather than a cut: nothing is placed by hand; the city and its interiors are generated from templates (CLAUDE.md).

## The ten questions

| # | Question | Options considered | The call |
| --- | --- | --- | --- |
| 1 | What does the player look at? | a city map with scenes; a real-time 2D world; 3D third person | top-down 3/4 with a map, built as isometric 2D (D1, D2) |
| 2 | How does time pass? | the clock moves only on actions; ticks with pause and speeds; real time with catch-up | ticks while in the world, pausable, with speeds (D3) |
| 3 | Who do you play, and what ends a game? | one life then an heir; a household; an undying protagonist | one life, real death, an heir (D4) |
| 4 | How big is the world, and where? | one town; one city; a region | one mid-size fictional city (D5), Rust Belt (D15) |
| 5 | How many people, at what fidelity? | three tiers; everyone persistent; a small cast | three tiers (D10) |
| 6 | Which verbs are in? | all with consequences; crime but no killing; lawful only | all of it; consequences are the only brake (D8) |
| 7 | How deep is a job? | a template plus signature careers; breadth only; depth only | one template, 3–5 signature careers (D9): crime, law, food, medicine (D14) |
| 8 | Which realism? | numbers; consequences; body; space and time | numbers, consequences, body (D11) |
| 9 | Tone and voice? | wry; satire; earnest drama; deadpan | earnest drama (D12); second person in the UI, a third-person chronicle (D16) |
| 10 | Engine or standalone? | the sim on the engine's core; standalone; wait for the engine | the sim on Engine-Builder's pure core, the stage here (D13) |

The second-order questions followed from the answers: characters (D6), camera (D7), channels (D17), interiors (D18), prison (D19), the heir (D20), the start (D21), docs first (D22), bootstrap (D23), title (D24), art (D25).

## Alternatives considered

### The view (question 1)

| Option | What exists for it | Cost | Verdict |
| --- | --- | --- | --- |
| A city map with scenes and panels | Dirtbag's current form: 22 places, 3 taps a trip, 20 a day | lowest; the GTA half is systemic only | recommended, not chosen |
| A real-time 2D world, walked and driven | 2060TD's 20 Hz stage, Afterglass's 10 Hz loop, 2060TD's A*; no touch movement since v0.956's joystick was retired | touch movement, vehicles, city-scale pathfinding, a clock that runs while you move | chosen, as isometric |
| 3D third person | Engine-Builder's 3D spike, never measured on a phone; Rapier at 1.67 MB gzipped | months of engine work before any life-sim content; stylized by the engine's own non-goal | not chosen |

### The look within 3/4 (D2)

| Option | Drawings per person | Grid | Ecosystem | Verdict |
| --- | --- | --- | --- | --- |
| Square-grid 3/4 (Stardew Valley, Zelda, Pokémon) | 4 directions | square | the largest: tilesets, Tiled, LDtk, autotiling | recommended |
| Isometric (The Sims 1, Project Zomboid) | 8 directions, or a 3D source | diamond on screen, square in data | Tiled and LDtk support it | chosen |
| Low-poly 3D under a fixed camera | one rig | none | CC0 city kits exist | not chosen |

Both isometric reference games draw 3D characters over 2D tiles (The Sims 1 from launch, Project Zomboid since build 41); Fallout 1 and 2, Diablo and Baldur's Gate pre-rendered 3D models to sprites. All did it because animated people in eight directions, across animations and outfits, are prohibitive by hand. That made the character pipeline the next question.

### Characters (D6)

| Option | How | Cost | Verdict |
| --- | --- | --- | --- |
| Pre-rendered from 3D models | CC0 rigs, headless Blender in CI, 8-direction sheets, outfits as layers composited in code | Blender in CI; modelling and animation are new territory; sheet size | recommended |
| Procedural figures drawn in code | Dirtbag's IK rig re-posed for the 3/4 camera, facings with mirroring, outfits and age as parameters | stylized by construction; animated isometric figures are hard to make read | chosen |
| 3D characters over 2D tiles | three.js draws animated people over the tile layer | three.js in the download; phone fps unmeasured; skeletal animation is new | not chosen |
| AI-generated sheets | a prompt and provenance log per sheet | consistency across directions and frames is where image models fail most | not chosen |

The reading behind the chosen option's risk: Climbing World Traveler's isometric style test found a 60 px figure "too small to read moves" on a phone. So in this game faces do not carry emotion; posture, bubbles, panels and the chronicle do. The art spike (M0.3) carries a kill criterion for this.

### Camera (D7)

A fixed angle needs one drawing per object and never shows a back face; four rotations need four drawings per object, or a 3D source. Fixed, with zoom, was chosen; cutaways and hidden roofs follow.

### Interiors (D18)

Walkable and generated from templates, phased in (chosen); exteriors walkable and every interior a scene and panel (the fallback if the art spike fails); only the home walkable.

### Prison, the heir, the start (D19–D21)

Prison as time passing with sparse choices, not a playable world and not a summary card. The heir in the order child of 18, spouse, close tie, with a ward who skips to 18. The start at 18 with a background pick, so childhood is lived only by heirs born in-game and the education systems can be bounded at launch.

## The converged pitch

**Pitch.** An isometric life sim in a fictional Rust Belt city where you can do nearly anything a person can do, and the world answers the way the real one would. Start at eighteen with what your family gave you. Work, study, cook, steal, police, heal; rent, buy, marry, raise; age, die, and hand the city to your heir.

**Core loop.** Days of ticks you pause and speed: needs and money push, routines carry the ordinary, interruptions and choices are the play. Weeks: shifts, paydays, rent, court dates. Years: ladders, relationships, children, the record. Lives: the chronicle, then the heir.

**Why it fits.** Named people never units (kept); aging is load-bearing (kept); ethics are gameplay with consequences seasons later (kept and widened); the environment as antagonist becomes the city and its economy; solo-dev scope discipline through the pure sim, data content, bots and readings. It replaces one line of the studio's design DNA on purpose: "you don't kill anything" becomes "anything a person can do, and what it costs".

**What is new for the portfolio.** A real-time isometric world, NPC schedules at city scale, driving, a law system, walkable interiors, a serious voice. None exists in any repository. What is proven: the pure sim and the kernel, seeded derived worlds, saves that never break, bots and calibration harnesses, the Play pipeline, art drawn in code.

**Scope: L.** Cuttable to the slice (Phase 1), then to a first year that is whole (Phase 2).

## Risks, with kill criteria

| # | Risk | Test | If it fails |
| --- | --- | --- | --- |
| 1 | Procedural isometric people do not read on a phone (figures of 40–60 px) | after a two-week art spike, a stranger looking at a 390 px screenshot can tell who is working, sleeping or arguing, and which building is the restaurant | interiors become scenes inside the isometric city (D18's fallback); people keep the drawn style in scenes, Dirtbag's proven form |
| 2 | Tier-1 population cost | the harness at N = 500 for 30 game days at 4× CPU throttle stays inside the frame budget at speed 1 | a few dozen named people plus statistics for release one |
| 3 | Content volume for earnest drama across four careers, law and family | measure the authoring rate on the slice's events; project the first year's count | cut the signature careers to crime and food |
| 4 | Accretion, v0.956's first root cause | the cut ladder is written now; every system has a "done when" and a reading; files under ~300 lines; one milestone per session | — |
| 5 | Human playtests deferred, a habit across the portfolio | a playtest gate at the slice with a tester brief, never "testers carried" | — |
| 6 | Engine coupling: Engine-Builder is at Phase 3 and moving fast | a pinned submodule, deliberate bumps, life-sim kits built here first and ported back by decision | — |
| 7 | Store rating: Mature content on Play | the IARC questionnaire answered before the store listing; the out list enforced by a content lint | — |

## Cut ladder for release one, most cuttable first

1. Medicine (becomes a template career).
2. Law above detective.
3. Interiors beyond home, restaurant and precinct.
4. Owned-car driving (keep travel time, bus and rideshare).
5. Districts beyond two.
6. Education beyond community college.
7. Crime above the crew tier.

The floor: the first year whole, crime to crew, law to detective, food to chef, two districts, three interiors, aging and the heir intact.

## What the earlier games already prove

The ceilings, as borrowed readings (the full survey is in research/portfolio-survey.md):

| Thing | Best reading in the portfolio | Where |
| --- | --- | --- |
| Simulated people | 864 rostered players and 32 AI managers, per week | Gridiron Eras |
| Deep lifecycles at once | a few dozen named people over 520 weeks, with marriage, children, succession | Ludus |
| Sim cost per action | 20–40 µs on the kernel; 193 µs with four kits | Engine-Builder |
| Real-time 2D | 20 ticks a second, 40 fps at 4× CPU slowdown | 2060TD |
| 3D | 5,000 instanced trees, no phone reading | Engine-Builder's spike |
| Taps per day of life-sim play | 20 | Dirtbag |
| Download | 490 KB; 178 kB gzipped | Dirtbag; 2060TD |

Nowhere in the portfolio: real-time NPC movement or schedules, vehicles, crowds beyond a busyness level, a procedural city, the sim in a Web Worker, touch movement controls, or a household budget built on wages.

## Open questions

1. Whether the next rounds of the brainstorm (needs, relationships, driving, schedules) happen in this file, in DESIGN.md's sections, or as issues.
2. Whether a comparison against outside games (The Sims 4, Project Zomboid, Kenshi, RimWorld, BitLife) earns a section here before the slice.
