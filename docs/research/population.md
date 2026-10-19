# The population harness (M0.4)

M0.4 measures what named people cost before the design depends on a number of them. It answers three things:

- **Risk 2 in [BRAINSTORM.md](../BRAINSTORM.md)**, whose kill criterion was written before the harness: "the harness at N = 500 for 30 game days at 4× throttle stays inside the frame budget at speed 1. Fail → a few dozen named people plus statistics for release one."
- **D10's tier-1 count**, "a few hundred to about a thousand (tune), set by the M0.4 reading". The count is Evan's call; this page gives the readings and a recommendation.
- **DESIGN.md's open question on cadence**: whether tier-1 people run per game hour or per schedule block off screen.

## What runs

The people are `packages/sim/src/people/`, pure modules on the engine's kernel. Who they are is worked out from the seed and never stored (Dirtbag's `presence.ts`, Landnám's rule). The templates are placeholders (tune), listed in [CALIBRATION.md](../CALIBRATION.md):

- **Households** of one to four.
- **Shifts.** Days, 09:00 to 17:00, Monday to Friday: 45%. Lates, 15:00 to 23:00, Tuesday to Saturday: 14%. Nights, 23:00 to 07:00, Sunday to Thursday nights: 7%. No shift: 34%.
- **Shared places:** a workplace for about 12 workers, a third place (a bar, a gym, a church hall) for about 30 people.
- **Sleep.** Seven to nine hours. Bedtime falls in an evening window, but a shift worker goes to bed early enough to be up two hours before the shift. Under M0.2's rest rates six hours can't be sustained even off work, so nobody draws six.
- **Sociability** from 0 to 99: the chance in two hundred of an evening out.

Each game hour is one of nine kinds: work, a break at work, sleep, the trip to work, rising, a meal, out, the evening at home, home. Each kind is pieces of the player's own activities. The needs are settled with the player's `settle` (needs.ts), once for each run of one activity, so a night's sleep is one settle. The tests hold the result to settling every piece of every hour one at a time, to the unit.

Ties grow at shared places. Each hour, everyone at a shared place meets two others there, picked by the seed, and each meeting adds one to both people's ties. A person keeps 24 ties. A full list lets a stranger take the place of someone met only once.

A person's state is six levels and 24 ties of two numbers each: 54 numbers. At 1,000 people that is 54,000 numbers, 187 kB as a save holds it.

The people are moved on by a timer, at one of three cadences:

- **hour:** everyone, every game hour.
- **day:** everyone, every midnight, a whole day at once.
- **staggered:** everyone once a day, in 24 shares, one share each hour, so that an action copies a twenty-fourth of them.

The levels and ties come out the same at every cadence, and the tests hold them to that. Only when the work is done, and what it costs, differ.

## The instruments

- `node tools/population/bench.ts`: Node 22.22.0.
- `node tools/population/chromium.ts`: the same code in a page, in headless Chromium 141, at full CPU and with the CPU slowed four times by the DevTools protocol (M0.3's `perf.ts` does the same).
- The cloud container has four CPUs and no GPU. Its CPU slowed four times stands in for a phone. It is not a phone.

Each run is 30 game days at one size and cadence, one action a game hour, each action timed: the way speed 1 crosses hours. A batch is an action that moved people on. The mean, the 95th and the worst leave out the first game day, while the engine running the page is still compiling its code; that day's worst is shown apart. Then a month passes in one action, the way sleep at speed 3 or a prison term would pass it.

A breakdown times the parts apart from the kernel:

- the people's arithmetic, an hour and a day of it;
- an hour's plan alone, which every cadence builds once for each game hour: who is where and who meets whom;
- the kernel's copy and freeze of the slice, which it does once in every action that writes to a module. These are the engine's own functions, `cloneJson` and `freezeJson`, imported from its source;
- a lean copy and freeze beside them, for comparison: numbers copied in one pass and checked without building a path for each one. It is what a change to the engine might save, not what the engine does;
- one staggered share's day and its copy.

## Readings, 2026-10-19

### At 4× CPU, headless Chromium

| People | Cadence | ms a game minute | Batches | Mean ms | 95th ms | Worst ms | Worst, day 1 | A month in one action | People kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | hour | 0.045 | 696 | 2.6 | 5.4 | 13.2 | 35.6 | 232 ms | 17 |
| 100 | day | 0.005 | 29 | 4.6 | 6.7 | 7.8 | 6.4 | 81 ms | 17 |
| 100 | staggered | 0.018 | 696 | 1.1 | 2.2 | 18.7 | 1.8 | 151 ms | 18 |
| 300 | hour | 0.117 | 696 | 7.0 | 12.8 | 23.7 | 10.6 | 706 ms | 55 |
| 300 | day | 0.013 | 29 | 16.4 | 20.1 | 23.5 | 24.5 | 238 ms | 55 |
| 300 | staggered | 0.028 | 696 | 1.7 | 3.1 | 12.9 | 1.8 | 384 ms | 56 |
| 500 | hour | 0.184 | 696 | 11.1 | 19.1 | 27.0 | 14.5 | 1.04 s | 92 |
| 500 | day | 0.022 | 29 | 28.6 | 36.5 | 38.4 | 19.5 | 0.44 s | 92 |
| 500 | staggered | 0.048 | 696 | 2.9 | 5.7 | 10.6 | 5.8 | 0.56 s | 93 |
| 1,000 | hour | 0.366 | 696 | 22.0 | 37.5 | 64.3 | 30.4 | 1.82 s | 186 |
| 1,000 | day | 0.034 | 29 | 47.4 | 54.8 | 58.2 | 35.3 | 0.83 s | 186 |
| 1,000 | staggered | 0.069 | 696 | 4.2 | 7.9 | 18.4 | 2.9 | 1.05 s | 187 |
| 3,000 | hour | 1.079 | 696 | 64.9 | 104 | 159 | 95.1 | 6.04 s | 600 |
| 3,000 | day | 0.112 | 29 | 158 | 220 | 223 | 166 | 2.76 s | 600 |
| 3,000 | staggered | 0.168 | 696 | 10.3 | 17.1 | 49.7 | 5.9 | 2.87 s | 601 |

Where a batch's time goes, at 4×:

| People | An hour, alone | A day, alone | An hour's plan | Kernel copy | Kernel copy and freeze | Lean copy and freeze | A share's day | A share's copy and freeze |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 0.70 ms | 6.2 ms | 0.14 ms | 0.60 ms | 1.7 ms | 0.80 ms | 0.29 ms | 0.06 ms |
| 300 | 0.73 | 7.6 | 0.15 | 0.65 | 3.9 | 1.5 | 0.24 | 0.16 |
| 500 | 1.5 | 16.0 | 0.25 | 1.2 | 7.3 | 3.9 | 0.81 | 0.21 |
| 1,000 | 2.8 | 38.7 | 0.52 | 2.0 | 15.4 | 6.2 | 0.93 | 1.05 |
| 3,000 | 7.7 | 82.6 | 1.4 | 8.7 | 43.4 | 20.1 | 2.2 | 1.4 |

### At full CPU

| People | Cadence | Node: mean, 95th, worst | Chromium 1×: mean, 95th, worst |
| --- | --- | --- | --- |
| 500 | hour | 2.4, 4.1, 9.7 ms | 2.9, 4.9, 18.4 ms |
| 500 | day | 5.9, 10.5, 13.4 | 7.0, 12.2, 13.7 |
| 500 | staggered | 0.40, 0.63, 6.1 | 0.53, 0.90, 3.5 |
| 1,000 | hour | 5.0, 7.9, 17.7 | 4.9, 8.6, 27.8 |
| 1,000 | day | 10.6, 17.4, 21.1 | 10.9, 13.0, 13.4 |
| 1,000 | staggered | 0.79, 1.2, 10.8 | 0.84, 1.2, 5.5 |
| 3,000 | hour | 15.3, 24.7, 36.1 | 13.6, 21.7, 36.2 |
| 3,000 | day | 41.2, 54.4, 62.5 | 33.1, 47.7, 52.1 |
| 3,000 | staggered | 1.6, 2.8, 8.4 | 2.0, 3.4, 8.5 |

The full output of every run is at the end of this page.

Sanity, in every run: after 60 game days, the lowest health anyone had was 94%, mean health 99–100%, and people held 19 to 21 ties each.

## What the readings say

**At the hourly cadence, the kernel's copy of the slice is most of the cost.** Every action that writes to a module copies its whole slice and freezes it again. The engine's `cloneJson` copies element by element, and `freezeJson` builds a path for every element in case one is bad. At 1,000 people at 4×, that is 15.4 ms of an hourly batch's 22. The people's own hour is 2.8 ms.

**The daily cadence writes once a day but works the whole day at once.** Its batch is the largest of the three, about 47 ms at 1,000 people at 4×.

**The staggered cadence divides both.** Each hour, one share of 24 moves on a whole day. The write is a twenty-fourth of the slice, and the work a twenty-fourth of a day. At 1,000 people at 4× its batch is 4.2 ms on average, 7.9 at the 95th, 18.4 at worst.

- What it costs: a person off screen is up to a day behind. When one is met, their state will have to be settled to the minute from their plan, as the player's levels already are (M2.2).
- The ties are worked out a person at a time from who was where, which a share can do without the others. The tests hold that to the plain rule, everyone at once, including lists that have filled.

**A month in one action costs about a second at 1,000 people at 4×.** At speed 3, that is the cost of sleeping through or a month in prison. At 3,000 it is nearly 3 seconds, long enough to need yielding to the page (Gridiron Eras' 17.8 s freeze, cut by yielding per week) or a worker.

**The engine fires at most 10,000 timers in one advance** (engine `time/timers.ts`). Any cadence with an hourly timer, so hourly and staggered, cannot pass more than about 416 days in one action. D19's skip to an heir's 18th birthday passes years. It will have to pass them in several actions, or catch the people up in one effect.

**A leaner copy in the engine would cut the write by about 2.5 times at 4×**: 6.2 ms against 15.4 at 1,000 people. That is an estimate from code beside the kernel, not a change to it.

**Company drifts down.** Mean company is about 40% after a month: the templates don't give enough company for the needs' rates. M2.2's people choose their free time by need, which replaces the templates.

## Risk 2's verdict

At 500 people, 30 game days, 4× CPU:

- **Staggered:** the 95th is 5.7 ms and the worst 10.6. That is inside a 30 fps frame's 33 ms and a 60 fps frame's 16.7. **Pass, at the staggered cadence.**
- **Hourly:** the 95th is 19.1 ms and the worst 27.0. On its own that is inside a 30 fps frame. But M0.3's stage already takes about 30 ms a frame at 4× in this container, so each batch makes its frame late.
- **Daily:** the worst is 38.4 ms. Fail.

The instrument is a container CPU slowed four times, not a phone. M0.3's phone reading, still open, will say how much of a frame the stage leaves.

## The tier-1 count: Evan's call

| Count | At 4×, staggered: 95th, worst | A month in one action | People in a save | Room for M2.2 |
| --- | --- | --- | --- | --- |
| 500 | 5.7, 10.6 ms | 0.56 s | 93 kB | the most |
| **1,000 (recommended)** | 7.9, 18.4 ms | 1.05 s | 187 kB | some |
| 3,000 | 17.1, 49.7 ms | 2.87 s | 601 kB | little: the 95th is over a 60 fps frame now |

**Recommendation: 1,000 (tune), at the staggered cadence.** It is the top of D10's range, and its 95th at 4× is a quarter of a 30 fps frame. It is a ceiling to re-measure at M2.2, not a promise.

The real people will hold more numbers each than these do. Relationships with regard, attraction and a memory of acts will come, and so will careers and money. That growth is speculation until it is built: if it is four times the numbers, a share's copy grows from 1 ms to about 4 at 4×. If M2.2's reading needs it, the count drops to 500.

## Levers not taken

- **The engine's copy and freeze**, to raise in Engine-Builder: copy arrays of numbers in one pass, and build a bad element's path only when there is one. This is the lean row above.
- **Ties packed one number to a tie**, which halves the numbers a person holds.
- **The sim in a worker**, which takes every batch off the frame. No earlier game has one.
- **Yielding during long skips**, as Gridiron Eras does per week.

## Open questions

1. What "inside the frame budget" means for risk 2. Is it the batch alone inside a frame, or the batch on top of the stage's own drawing? The readings pass the first at 1,000 people. At 4× in this container the second passes nowhere, until the phone reading says what the stage costs on a phone.
2. How a staggered person is settled when they are met: to the minute, from the same plan (M2.2).
3. Long skips past 416 days: several actions, or one effect that catches the people up. Or should the engine fire a repeating timer's missed periods in one go?
4. Re-measure at M2.2 with the real people's state and choices.

## The full output

Node 22.22.0, `node tools/population/bench.ts 30`:

```
people | cadence | ms a game minute | batches after day 1 | mean ms | 95th ms | worst ms | worst on day 1 ms | a month in one action, ms | people kB | numbers | health % (lowest) | rest % | ties a person
100 | hour | 0.0093 | 696 | 0.54 | 0.83 | 4.94 | 5.62 | 53.0 | 17 | 5400 | 100 (98) | 90 | 19.4
100 | day | 0.0011 | 29 | 1.03 | 1.29 | 2.87 | 0.98 | 23.5 | 17 | 5400 | 99 (94) | 27 | 19.4
100 | staggered | 0.0036 | 696 | 0.21 | 0.28 | 3.54 | 3.31 | 36.8 | 18 | 5400 | 100 (95) | 57 | 19.4
300 | hour | 0.0236 | 696 | 1.42 | 2.95 | 9.87 | 2.77 | 152 | 55 | 16200 | 100 (98) | 91 | 20.4
300 | day | 0.0025 | 29 | 3.11 | 5.19 | 7.30 | 2.47 | 61.2 | 55 | 16200 | 99 (94) | 29 | 20.4
300 | staggered | 0.0053 | 696 | 0.32 | 0.51 | 3.41 | 0.32 | 86.3 | 56 | 16200 | 100 (94) | 57 | 20.4
500 | hour | 0.0401 | 696 | 2.40 | 4.09 | 9.65 | 7.15 | 224 | 92 | 27000 | 100 (98) | 90 | 20.9
500 | day | 0.0044 | 29 | 5.92 | 10.5 | 13.4 | 4.40 | 123 | 92 | 27000 | 99 (94) | 29 | 20.9
500 | staggered | 0.0067 | 696 | 0.40 | 0.63 | 6.09 | 0.72 | 120 | 93 | 27000 | 100 (94) | 57 | 20.8
1000 | hour | 0.0833 | 696 | 5.00 | 7.94 | 17.7 | 12.1 | 461 | 186 | 54000 | 100 (98) | 89 | 20.9
1000 | day | 0.0077 | 29 | 10.6 | 17.4 | 21.1 | 10.9 | 180 | 186 | 54000 | 99 (94) | 30 | 20.9
1000 | staggered | 0.0135 | 696 | 0.79 | 1.16 | 10.8 | 4.38 | 228 | 187 | 54000 | 100 (94) | 57 | 20.9
3000 | hour | 0.2551 | 696 | 15.3 | 24.7 | 36.1 | 26.3 | 1640 | 600 | 162000 | 100 (98) | 89 | 21.0
3000 | day | 0.0288 | 29 | 41.2 | 54.4 | 62.5 | 28.1 | 545 | 600 | 162000 | 99 (94) | 30 | 21.0
3000 | staggered | 0.0266 | 696 | 1.60 | 2.77 | 8.40 | 2.90 | 645 | 601 | 162000 | 100 (94) | 57 | 21.0

people | an hour, alone ms | a day, alone ms | an hour's plan, alone ms | kernel copy ms | kernel copy and freeze ms | lean copy and freeze ms | a share's day, alone ms | a share's copy and freeze ms
100 | 0.11 | 0.84 | 0.01 | 0.05 | 0.25 | 0.12 | 0.02 | 0.01
300 | 0.18 | 1.90 | 0.03 | 0.15 | 0.69 | 0.57 | 0.06 | 0.03
500 | 0.48 | 2.92 | 0.06 | 0.33 | 1.58 | 0.84 | 0.10 | 0.05
1000 | 0.62 | 6.68 | 0.11 | 0.67 | 3.18 | 1.55 | 0.18 | 0.15
3000 | 1.73 | 16.9 | 0.36 | 2.05 | 10.5 | 5.31 | 0.80 | 0.34
```

Headless Chromium 141 at full CPU, `node tools/population/chromium.ts 30`:

```
people | cadence | ms a game minute | batches after day 1 | mean ms | 95th ms | worst ms | worst on day 1 ms | a month in one action, ms | people kB | numbers | health % (lowest) | rest % | ties a person
100 | hour | 0.0086 | 696 | 0.47 | 1.00 | 3.20 | 13.3 | 49.3 | 17 | 5400 | 100 (98) | 90 | 19.4
100 | day | 0.0015 | 29 | 1.43 | 3.70 | 4.40 | 1.40 | 17.3 | 17 | 5400 | 99 (94) | 27 | 19.4
100 | staggered | 0.0051 | 696 | 0.31 | 0.80 | 9.90 | 0.20 | 36.1 | 18 | 5400 | 100 (95) | 57 | 19.4
300 | hour | 0.0262 | 696 | 1.56 | 2.90 | 18.4 | 3.90 | 157 | 55 | 16200 | 100 (98) | 91 | 20.4
300 | day | 0.0035 | 29 | 4.71 | 8.10 | 9.40 | 2.40 | 68.8 | 55 | 16200 | 99 (94) | 29 | 20.4
300 | staggered | 0.0071 | 696 | 0.43 | 0.70 | 5.30 | 0.50 | 134 | 56 | 16200 | 100 (94) | 57 | 20.4
500 | hour | 0.0493 | 696 | 2.92 | 4.90 | 18.4 | 29.1 | 274 | 92 | 27000 | 100 (98) | 90 | 20.9
500 | day | 0.0051 | 29 | 6.95 | 12.2 | 13.7 | 4.20 | 117 | 92 | 27000 | 99 (94) | 29 | 20.9
500 | staggered | 0.0087 | 696 | 0.53 | 0.90 | 3.50 | 0.40 | 182 | 93 | 27000 | 100 (94) | 57 | 20.8
1000 | hour | 0.0821 | 696 | 4.94 | 8.60 | 27.8 | 6.90 | 425 | 186 | 54000 | 100 (98) | 89 | 20.9
1000 | day | 0.0078 | 29 | 10.9 | 13.0 | 13.4 | 8.20 | 165 | 186 | 54000 | 99 (94) | 30 | 20.9
1000 | staggered | 0.0139 | 696 | 0.84 | 1.20 | 5.50 | 3.20 | 197 | 187 | 54000 | 100 (94) | 57 | 20.9
3000 | hour | 0.2256 | 696 | 13.6 | 21.7 | 36.2 | 15.6 | 1191 | 600 | 162000 | 100 (98) | 89 | 21.0
3000 | day | 0.0231 | 29 | 33.1 | 47.7 | 52.1 | 23.3 | 556 | 600 | 162000 | 99 (94) | 30 | 21.0
3000 | staggered | 0.0334 | 696 | 2.01 | 3.40 | 8.50 | 3.70 | 670 | 601 | 162000 | 100 (94) | 57 | 21.0

people | an hour, alone ms | a day, alone ms | an hour's plan, alone ms | kernel copy ms | kernel copy and freeze ms | lean copy and freeze ms | a share's day, alone ms | a share's copy and freeze ms
100 | 0.09 | 1.60 | 0.03 | 0.05 | 0.23 | 0.15 | 0.01 | 0.02
300 | 0.28 | 1.93 | 0.07 | 0.16 | 0.90 | 0.35 | 0.06 | 0.03
500 | 0.58 | 6.60 | 0.11 | 0.24 | 1.50 | 1.45 | 0.11 | 0.05
1000 | 0.68 | 5.06 | 0.15 | 0.65 | 3.00 | 1.30 | 0.26 | 0.10
3000 | 1.53 | 15.3 | 0.28 | 1.80 | 9.80 | 4.20 | 0.44 | 0.26
```

Headless Chromium 141 at 4× CPU, the same run (136 s):

```
people | cadence | ms a game minute | batches after day 1 | mean ms | 95th ms | worst ms | worst on day 1 ms | a month in one action, ms | people kB | numbers | health % (lowest) | rest % | ties a person
100 | hour | 0.0451 | 696 | 2.55 | 5.40 | 13.2 | 35.6 | 232 | 17 | 5400 | 100 (98) | 90 | 19.4
100 | day | 0.0052 | 29 | 4.62 | 6.70 | 7.80 | 6.40 | 81.4 | 17 | 5400 | 99 (94) | 27 | 19.4
100 | staggered | 0.0176 | 696 | 1.07 | 2.20 | 18.7 | 1.80 | 151 | 18 | 5400 | 100 (95) | 57 | 19.4
300 | hour | 0.1168 | 696 | 7.03 | 12.8 | 23.7 | 10.6 | 706 | 55 | 16200 | 100 (98) | 91 | 20.4
300 | day | 0.0131 | 29 | 16.4 | 20.1 | 23.5 | 24.5 | 238 | 55 | 16200 | 99 (94) | 29 | 20.4
300 | staggered | 0.0282 | 696 | 1.72 | 3.10 | 12.9 | 1.80 | 384 | 56 | 16200 | 100 (94) | 57 | 20.4
500 | hour | 0.1840 | 696 | 11.1 | 19.1 | 27.0 | 14.5 | 1036 | 92 | 27000 | 100 (98) | 90 | 20.9
500 | day | 0.0215 | 29 | 28.6 | 36.5 | 38.4 | 19.5 | 438 | 92 | 27000 | 99 (94) | 29 | 20.9
500 | staggered | 0.0478 | 696 | 2.91 | 5.70 | 10.6 | 5.80 | 556 | 93 | 27000 | 100 (94) | 57 | 20.8
1000 | hour | 0.3661 | 696 | 22.0 | 37.5 | 64.3 | 30.4 | 1820 | 186 | 54000 | 100 (98) | 89 | 20.9
1000 | day | 0.0341 | 29 | 47.4 | 54.8 | 58.2 | 35.3 | 829 | 186 | 54000 | 99 (94) | 30 | 20.9
1000 | staggered | 0.0689 | 696 | 4.20 | 7.90 | 18.4 | 2.90 | 1051 | 187 | 54000 | 100 (94) | 57 | 20.9
3000 | hour | 1.0790 | 696 | 64.9 | 104 | 159 | 95.1 | 6038 | 600 | 162000 | 100 (98) | 89 | 21.0
3000 | day | 0.1118 | 29 | 158 | 220 | 223 | 166 | 2762 | 600 | 162000 | 99 (94) | 30 | 21.0
3000 | staggered | 0.1684 | 696 | 10.3 | 17.1 | 49.7 | 5.90 | 2873 | 601 | 162000 | 100 (94) | 57 | 21.0

people | an hour, alone ms | a day, alone ms | an hour's plan, alone ms | kernel copy ms | kernel copy and freeze ms | lean copy and freeze ms | a share's day, alone ms | a share's copy and freeze ms
100 | 0.70 | 6.23 | 0.14 | 0.60 | 1.70 | 0.80 | 0.29 | 0.06
300 | 0.73 | 7.61 | 0.15 | 0.65 | 3.90 | 1.50 | 0.24 | 0.16
500 | 1.51 | 16.0 | 0.25 | 1.15 | 7.30 | 3.90 | 0.81 | 0.21
1000 | 2.81 | 38.7 | 0.52 | 2.00 | 15.4 | 6.20 | 0.93 | 1.05
3000 | 7.69 | 82.6 | 1.42 | 8.70 | 43.4 | 20.1 | 2.24 | 1.35
```

The rest column is the mean rest at the moment each run's people were last settled: 07:00 for the hourly cadence, midnight for the daily one, and a mix of the 24 hours for the staggered one. The three are not comparable.
