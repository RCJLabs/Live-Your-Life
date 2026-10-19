# Live Your Life (working title)

A life sim in a fictional Rust Belt city where you can do nearly anything a person can do, and the world answers the way the real one would. Isometric, drawn in code, for the browser as a PWA and for Google Play as a TWA. Solo dev (Evan, RCJ Labs).

**Status: Phase 0, foundations. Nothing to play yet.** The design is written down (decisions dated, numbers as readings, scope cut before code). The workspace is built on Engine-Builder's kernel, with the game's calendar and clock and the checks (M0.1), and the first rules: needs, a job and rent, played by bots (M0.2). The page is an art test of one city block drawn in code, six people, day and night (M0.3); it works offline. A harness measures what a city of named people costs (M0.4). The first street is generated from content files, with a walk grid under it (M1.1), and two walkable interiors, a flat and the diner, with someone walking between them (M1.2). The first job is the line cook's: shifts posted and signed up for, standing, events that stop a shift for a choice, and pay with Michigan's withholding, played by bots (M1.3). The other line cook is the first relationship: they get to know you on the line, remember what you do, and ask and grant favours by what they think of you (M1.4).

Start at eighteen with what your family gave you. Work, study, cook, steal, police, heal; rent, buy, marry, raise; age, die, and hand the city to your heir.

## Run it

Node 22.18+ and pnpm 10 are required; Corepack picks up the pinned pnpm.

```sh
git clone --recurse-submodules https://github.com/RCJLabs/Live-Your-Life
pnpm install
pnpm dev      # the game at http://localhost:5173
pnpm check    # everything CI runs: typecheck, lint, tests, build
```

The rest of the commands are in `CLAUDE.md`.

## Where things are

| Path | What |
| --- | --- |
| `ROADMAP.md` | The plan, with a CURRENT MILESTONE marker and the Readings table |
| `docs/BRAINSTORM.md` | How the idea was found: the questions, the alternatives, the pitch, the risks, the cut ladder |
| `docs/DESIGN.md` | Pillars, non-goals, the out list, and every system as proposed |
| `docs/decisions.md` | Every decision, dated, with the options considered |
| `docs/VOICE.md` | How the game speaks |
| `docs/CALIBRATION.md` | Where the numbers come from |
| `docs/research/portfolio-survey.md` | What the earlier RCJ Labs games already prove, and what they lend this one |
| `CLAUDE.md` | Session rules and commands |
| `packages/sim/` | The rules, on Engine-Builder's kernel |
| `apps/game/` | The PWA |
| `engine/` | Engine-Builder, a submodule pinned to a commit |

## Rules in one breath

The sim decides and the stage renders. Content is data. Nothing is placed by hand. Saves never break. Numbers are readings. Odds on screen are the odds rolled. Mobile first. Offline always.
