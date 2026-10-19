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

None yet. Phase 0 of ROADMAP.md adds the workspace, the engine submodule, the checks and the harnesses, and fills this section with them.

## Layout (planned; settled in Phase 0)

```
engine/             Engine-Builder, a git submodule pinned to a commit
packages/sim/       the rules: modules and kits on @eb/core (pure)
packages/content/   careers, events, places, templates, laws as JSON, with schemas
packages/stage/     the isometric renderer: Canvas2D, drawn in code
packages/ui/        panels, the chronicle, the map, input
apps/game/          the PWA shell: Vite, the service worker, saves, the gate
tools/              harnesses: the week bot, the population bench, the content lint, calibration checks
docs/               design, decisions, voice, calibration, research
```

## Writing

- Plain words, short sentences, no hype. Name the actual thing ("the facade grammar"), not a category ("the system").
- Comments say why, not what. Credit a pattern's source repo when it is ported ("from dirtbag's presence.ts").
- Every doc ends with its open questions, if it has any.
- No model names or tool attributions in docs, code comments or data files.
