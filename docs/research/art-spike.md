# The art spike: the stranger test (M0.3)

This page is for the tester, not for the stranger. It is how M0.3's [you] gates get taken: the stranger's answers, the frame rate on a phone, and the decision that follows.

What it decides is risk 1 in [BRAINSTORM.md](../BRAINSTORM.md): whether people drawn in code read on a phone. The kill criterion was written before the spike was built:

> A stranger, from a 390 px screenshot, can tell who is working, sleeping or arguing, and which building is the restaurant.

It is judged as D28 says. Bubbles are on, as the game is designed. One stranger's answers decide. Up to three are asked, and each is recorded. The screenshot with posture only is shown first, so the bubbles don't lead.

## What to show

The screenshots in [art-spike/](art-spike/) are 390 × 844 CSS pixels, drawn at 2×, which is the most the game draws at. Show each one full screen on a phone, so it is the size the game would be.

| Shot | File | What it shows | People's height |
| --- | --- | --- | --- |
| A | `a-posture-only.png` | Day, walls down, no bubbles | 23–25 px |
| B | `b-with-bubbles.png` | The same moment, with bubbles | 23–25 px |
| C | `c-night.png` | The same, at 22:30 | 23–25 px |
| D | `d-close-diner.png` | Closer: the diner fills the width | 33–36 px |
| E | `e-close-flat.png` | Closer: the flat fills the width | 36–40 px |
| F | `f-landscape.png` | Landscape, 844 × 390 | 35–38 px |

`g-walls-up.png` (the buildings whole) and `h-with-controls.png` (the page as it opens) are for reference, not for the test.

The live page shows the same moments at these addresses, after `https://rcjlabs.github.io/Live-Your-Life/`:
- A is `?at=13:00&bubbles=0&hud=0&freeze=1.2`.
- B drops `&bubbles=0`.
- C has `at=22:30`.
- D and E add `&view=close&focus=diner` or `&focus=apartment`.
- Tap the picture to bring the controls back.

## How to run it

It takes about five minutes a stranger. Ask someone who hasn't seen the game or heard about it. Say only that it is a game in progress. Don't point, and don't correct them between screenshots.

1. Show A and ask: "This is a screenshot from a game in progress. What do you see going on?" Write down what they say, in their words.
2. Still on A, ask these in this order, and write down what they point at:
   1. "Which building is a restaurant?"
   2. "Is anyone working? Who?"
   3. "Is anyone asleep? Who?"
   4. "Are any two people arguing? Who?"
3. Show B and ask the four questions again.
4. Show C: "The same place at night. Can you tell the same things?" Write down what changes.
5. Show F last: "Is this easier or harder to read than the first one?"

## The answers

- **The restaurant** is the diner: the checkerboard floor, the red stools at the counter, the EAT sign on its pole.
- **Working** is the cook in white with a paper cap, behind the griddle in the diner. The person at the table outside is eating there, not working; the one walking is passing.
- **Asleep** is the person in the bed in the flat, under the blue blanket.
- **Arguing** is the two people on the sidewalk in front of the apartment house, one pointing, one with open hands.

The criterion passes, as D28 judges it, if the first stranger gets all four right on B.

## Answers

| Stranger | Date | What they saw on A, in their words | A: restaurant, working, asleep, arguing | B: the same | C: night | F: landscape | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |

## The frame rate on your phone

1. Open the live page, installed or in the browser, on the view it opens with.
2. Tap Measure. It runs the clock at speed 1 for eleven seconds; leave the phone alone.
3. Tap Copy. The line names the frame rate, the slowest frames, the screen, its pixel ratio and the browser. It goes in ROADMAP.md's Readings.

To compare, measure again at night (tap Night first). Then measure at `?cache=0`, which draws every piece in the plain painter's order every frame instead of keeping the still picture.

## What the headless readings already say

These were taken in headless Chromium in the cloud container, with no GPU, so they are not a phone's numbers (ROADMAP.md's Readings has the instruments).

**People's height.** In CSS pixels, a person is:
- 23–25 px in the wide framing that holds the diner and the flat;
- 33–40 px close up on one building;
- 35–38 px in landscape.

Climbing World Traveler found a 60 px figure too small to read moves. Dirtbag's side-view people, which do read, are about 86 px.

**Frame rate.** At full CPU speed every path holds 60 fps, the display's own rate. With the CPU slowed four times, a stand-in for a slow phone:

| Path | Frames a second |
| --- | --- |
| The kept still picture, by day | 33.8 |
| The kept still picture, at night | 19.1 |
| Everything drawn every frame | 14.1 |

At night two full-screen layers are laid over each frame. The container does that in software; a phone does it on its GPU.

## The decision

After the test, Evan chooses:
- continue with walkable interiors (D18 as it stands), or
- fall back to interiors as scenes inside the isometric city (D18's fallback).

It goes in docs/decisions.md with the date and the answers that decided it.

Levers to try before falling back, if the people don't read. These are untested ideas, not findings:
- Draw people about a fifth larger than true scale against the buildings, a common isometric cheat.
- Open on a closer framing, one building at a time.
- Make the city view landscape.
- Use a heavier ink line.

## Open questions

1. Whether the city view should open in landscape. In portrait, two buildings in the frame make people about 24 px tall.
2. Whether people are drawn larger than true scale.
