# Calibration

Where the game's numbers come from (D11: numbers, consequences and body). Every figure the sim uses for money, time, law and the body traces to a row here with its source and date, the way an asset carries its provenance. A departure from the real figure is written beside it. Nothing in this file is a reading about the game; the game's own numbers live in ROADMAP.md's Readings.

The method is Gridiron Eras': pick a real range, run many seeded lives, check the game's distribution against the range with intervals, and write down the departures on purpose.

## Base

| Setting | Value | Status |
| --- | --- | --- |
| Base year | 2025 dollars, a fixed in-game calendar | default unless vetoed (D15) |
| Metro class | a Rust Belt or Midwest city of 250k–400k | D15 |
| State for law and tax | to pick: one state's theft thresholds, drug schedules, sentencing ranges, income tax | open question in DESIGN.md |

## The ledger

Rows to fill before the system that uses them is built. "Source family" names where the figure comes from; the row gets the exact source, date and value when it is filled.

| What | Source family | Used by | Filled |
| --- | --- | --- | --- |
| Wages by career, hourly and annual, by percentile | federal occupational wage statistics for the metro class | careers, the labor market | no |
| Minimum wage | the chosen state | careers | no |
| Rent by bedrooms and district | federal fair market rents for a comparable metro; local listings for spread | housing | no |
| Utilities, phone, internet | consumer expenditure surveys | money | no |
| A grocery basket by household size | federal food-plan costs | hunger, money | no |
| Transit fare and coverage | the comparable city's transit authority | travel | no |
| Used-car prices, insurance, fuel, maintenance | market price indices; insurer averages for the state | driving | no |
| Health insurance premiums, deductibles; costs of an ER visit, a clinic visit, a prescription, with and without insurance | national health expenditure and hospital price data | health, money | no |
| Childcare by age | state market-rate surveys | family, money | no |
| Tuition: community college, in-state university, professional school | published tuition tables | education | no |
| Federal and state income tax, FICA | the tax tables for the base year | money | no |
| Loan and credit-card rates by credit band | federal consumer credit data | money | no |
| Fines: shoplifting, traffic, DUI | the chosen state's schedules | law | no |
| Bail schedules and bond fees | the chosen county's schedule | law | no |
| Sentencing ranges: theft by value, assault, drug possession and distribution, DUI | the chosen state's code and guidelines | law | no |
| Clearance and detection rates by offence | federal crime reporting | law (the odds shown) | no |
| The effect of a record on hiring and housing | audit studies of callbacks with a record | careers, housing | no |
| Recidivism and re-arrest rates | justice statistics | law, careers | no |
| Life tables by age and sex | social security actuarial tables | aging, death | no |
| Illness incidence by age; injury rates by occupation | public health and labor statistics | health | no |
| Sleep need and the effects of sleep debt | sleep research summaries | needs | no |
| Addiction onset and relapse rates by substance | public health surveys | health | no |
| Marriage, divorce, birth rates by age | vital statistics | relationships, family | no |
| Time use by activity for employed adults | the federal time-use survey | schedules, the tick | no |

## Realism bars

Tests the first year must pass, in the shape Landnám's balance bars take. Each is a proposal (tune) until its ledger rows are filled, and each names what it would mean if it failed.

| Bar | Statement | Why it matters |
| --- | --- | --- |
| B1 | A bot working full time at the median wage affords the median one-bedroom, a used car and groceries with at least 10% of net pay left over the year | the middle is livable, so choices are real |
| B2 | A bot at the minimum wage, full time, cannot afford the median one-bedroom alone; with a roommate, it can | the floor is hard, not fatal |
| B3 | One uninsured emergency visit costs more than a month of median rent | the body is a financial risk |
| B4 | A felony record cuts callbacks from template employers by about half for two years, then fades | the record is a consequence that lasts |
| B5 | A bot who sleeps, eats and avoids crime dies at an age inside the life tables' middle range; a bot who does not, dies earlier | the body model is calibrated |
| B6 | A dealer at the street tier, over a year, earns less per hour than the median wage once arrests and lost time are counted | cruelty is never optimal, measured |
| B7 | Nine in ten shoplifting events go undetected at the moment; most that are detected end in a fine or a misdemeanour, not prison | the odds shown match the real shape |

## Placeholders

Figures the sim uses before their ledger row is filled. None is a real figure. Each is replaced when its row is.

| Figure | Value | Where | Replaced by |
| --- | --- | --- | --- |
| The hourly wage | $15, paid gross: no tax yet | `packages/sim/src/dials.ts`, `JOB` | the wages and tax rows, at M1.3's line cook |
| The shift | Tuesday to Saturday, 15:00 to 23:00 | `packages/sim/src/dials.ts`, `JOB` | the career template, M1.3 |
| Payday | Fridays at 23:30, for the minutes worked since the last | `packages/sim/src/dials.ts`, `PAYDAY` | the career template, M1.3 |
| Rent | $550 a month, due on the 1st | `packages/sim/src/dials.ts`, `RENT` | the rent row, with housing |
| A meal | $4 | `packages/sim/src/dials.ts`, `COSTS` | the grocery-basket row, with meals by cost and quality |
| Cash at the start | $300 | `packages/sim/src/dials.ts`, `START_CASH` | the background pick (D21) |
| Twilight | dark from 19:45 to 22:00, light from 04:30 to 06:30, every day: a June evening | `packages/stage/src/light.ts`, `TWILIGHT` | sunrise and sunset for the city's latitude, by date |
| How fast needs fall and recover | DESIGN.md's table, (tune) | `packages/sim/src/needs.ts`, `RATES` | the sleep row for rest; the others are tuned for play and written below as departures |

## Departures, on purpose

None yet. When a figure is softened or sharpened for play, it is written here with the real figure beside it.

## Open questions

1. Which state the city borrows for law and tax.
2. Whether rents and wages are drawn from one comparable city or from the class average.
3. How often the ledger is re-checked against newer data, and whether a later base year ever replaces 2025 in a save.
