# Calibration

Where the game's numbers come from (D11: numbers, consequences and body). Every figure the sim uses for money, time, law and the body traces to a row here with its source and date, the way an asset carries its provenance. A departure from the real figure is written beside it. Nothing in this file is a reading about the game; the game's own numbers live in ROADMAP.md's Readings.

The method is Gridiron Eras': pick a real range, run many seeded lives, check the game's distribution against the range with intervals, and write down the departures on purpose.

## Base

| Setting | Value | Status |
| --- | --- | --- |
| Base year | 2025 dollars, a fixed in-game calendar | default unless vetoed (D15) |
| Metro class | a Rust Belt or Midwest city of 250k–400k | D15 |
| State for law and tax | Michigan: its minimum wage, income tax and city income tax now, its theft law at M1.5 | D37 |

## The ledger

Rows to fill before the system that uses them is built. "Source family" names where the figure comes from; the row gets the exact source, date and value when it is filled.

| What | Source family | Used by | Filled |
| --- | --- | --- | --- |
| Wages by career, hourly and annual, by percentile | federal occupational wage statistics for the metro class | careers, the labor market | the line cook only (M1.3) |
| Minimum wage | the chosen state | careers | yes (M1.3) |
| Rent by bedrooms and district | federal fair market rents for a comparable metro; local listings for spread | housing | no |
| Utilities, phone, internet | consumer expenditure surveys | money | no |
| A grocery basket by household size | federal food-plan costs | hunger, money | no |
| Transit fare and coverage | the comparable city's transit authority | travel | no |
| Used-car prices, insurance, fuel, maintenance | market price indices; insurer averages for the state | driving | no |
| Health insurance premiums, deductibles; costs of an ER visit, a clinic visit, a prescription, with and without insurance | national health expenditure and hospital price data | health, money | no |
| Childcare by age | state market-rate surveys | family, money | no |
| Tuition: community college, in-state university, professional school | published tuition tables | education | no |
| Federal and state income tax, FICA | the tax tables for the base year | money | withholding (M1.3); the return is the money milestone's |
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

## In use

Figures the sim runs on now, with where each lives and where it comes from. Every one is from a secondary source: the build environment can't reach irs.gov, ssa.gov, michigan.gov or bls.gov (D38). Each is to be checked against the primary named beside it before it is built on further, and a test holds the records named here to this table.

| Figure | Value | Record | Source, as read on 2026-10-19 | Primary to check |
| --- | --- | --- | --- | --- |
| The line cook's wage | $14.73 an hour, before tax: the 25th percentile of Michigan's restaurant cooks, $30,640 a year at 2,080 hours, for a hire with no experience (tune). The median is $17.58 | `career/line-cook.json`, `wage` | WageDex, "Cooks, Restaurant, Michigan" (wagedex.com/jobs/cooks-restaurant/michigan), citing the federal occupational wage survey for May 2024 | BLS OEWS, SOC 35-2014, Michigan, May 2024; and May 2025, the base year's, which replaces it |
| Michigan's minimum wage | $12.48 an hour from 21 February 2025 ($10.56 before). Checked by a test against every career | — | Michigan's Department of Labor and Economic Opportunity, news release of 1 October 2024; Fox 2 Detroit. Senate Bill 8 (2025) changed the later years; 2026's figure is reported as $13.73 and is not used | michigan.gov/leo, the minimum wage schedule |
| Federal income tax withholding, single, standard | after $8,600 a year: 0% to $6,400; 10% to $18,325; 12% to $54,875; 22% to $109,750; 24% to $203,700; 32% to $256,925; 35% to $632,750; 37% above. A test holds the tax at the start of each row to the table's $0, $0, $1,192.50, $5,578.50, $17,651.00, $40,199.00, $57,231.00 and $188,769.75 | `tax/federal-single.json` | IRS Publication 15-T for 2025 (December 2024), Worksheet 1A and its annual table: the $6,400 row as quoted in search results; the rows above it are 2025's brackets from the IRS's release of Rev. Proc. 2024-40, plus $6,400. The One Big Beautiful Bill Act's later changes to 2025 change the return, not 2025's withholding | irs.gov/pub/irs-pdf/p15t.pdf |
| Social Security | 6.2% of pay up to $176,100 a year | `tax/social-security.json` | the Social Security Administration's release of October 2024, as the Journal of Accountancy and The Tax Adviser reported it | ssa.gov, the contribution and benefit base |
| Medicare | 1.45% of all pay. The extra 0.9% on pay over $200,000 a year is not withheld: no career in the slice comes near it | `tax/medicare.json` | the same | ssa.gov; IRS Publication 15 |
| Michigan income tax withholding | 4.25% of pay less $5,800 a year for each exemption; the player claims one | `tax/michigan.json` | Michigan Treasury's calendar-year tax information (2025: 4.25%, $5,800), as quoted in search results; Bloomberg Tax on the 2025 withholding guide, Form 446 | michigan.gov/taxes, Form 446 for 2025 |
| The city's income tax, resident | 1% of pay less $600 a year for each exemption: the Uniform City Income Tax Act's standard rates (D38). Detroit levies 2.4% and Grand Rapids 1.5%; most others levy 1% | `tax/city-resident.json` | National Tax Tools and Richify's tables of Michigan city income taxes | the Act (MCL 141.501 and after); Michigan Treasury's city income tax pages |

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
| The diner's habits | two shifts a day, 06:00 to 14:00 and 14:00 to 22:00, every day; next week's posted on Thursdays, 3 to 6 shifts by standing; at most 5 a week, which keeps a cook under the 40 hours that would mean overtime; paid on Fridays at 06:00 | `career/line-cook.json` | none: an employer's habits, tuned for play. Michigan has no law on when shifts are posted |
| Standing, warnings and skill | the steps in D39; skill at half after 400 hours of practice | `career/line-cook.json` | none: tuned for play (D39) |
| Shift events | one in about half of shifts; their odds and outcomes | `shift-event/` | none: tuned for play, and their words are drafts for the voice pass (D40) |
| Rent | $550 a month, due on the 1st | `packages/sim/src/dials.ts`, `RENT` | the rent row, with housing |
| A meal | $4 | `packages/sim/src/dials.ts`, `COSTS` | the grocery-basket row, with meals by cost and quality |
| Cash at the start | $300 | `packages/sim/src/dials.ts`, `START_CASH` | the background pick (D21) |
| Twilight | dark from 19:45 to 22:00, light from 04:30 to 06:30, every day: a June evening | `packages/stage/src/light.ts`, `TWILIGHT` | sunrise and sunset for the city's latitude, by date |
| How fast needs fall and recover | DESIGN.md's table, (tune) | `packages/sim/src/needs.ts`, `RATES` | the sleep row for rest; the others are tuned for play and written below as departures |
| Tier-1 shifts | days 45%, lates 14%, nights 7%, no shift 34%, at fixed hours | `packages/sim/src/people/templates.ts`, `SHIFTS` | the employment and shift-work rows, with M2.2's careers |
| Tier-1 households | one to four people, most living with someone | `packages/sim/src/people/templates.ts`, `HOUSEHOLD` | the household-size row, with M2.1's households by income band |
| Tier-1 sleep | 7 to 9 hours, bedtime 22:00 to 01:00 unless a shift moves it | `packages/sim/src/people/templates.ts`, `SLEEP` | the sleep row; under M0.2's rest rates fewer than 7 hours can't last, a departure to write when the row is filled |
| Street and lot sizes | lots 6 to 12 m wide and 12 m deep, a 3.5 m sidewalk, an 8.4 m roadway | `packages/content/records/street/main.json` and `building/` | none: distances are tuned for play, not measured (D11) |
| Room and door sizes | a studio 4.1 to 4.6 m by 8.7 m with a bathroom 2.3 m square; the diner's back room 4.2 by 3.45 m; inside doors 0.9 m and the front door 1 m; the apartment house 10 to 11 m wide | `packages/content/records/interior/`, `room/` and `building/apartment.json` | none: distances are tuned for play, not measured (D11) |
| Tier-1 shared places | about 12 workers to a workplace, about 30 people to a third place, 24 ties a person, 2 meetings an hour | `packages/sim/src/people/templates.ts`, `SHARED` and `TIES` | the city's businesses (M2.1) and M2.6's relationships |

## Departures, on purpose

When a figure is softened or sharpened for play, it is written here with the real figure beside it.

- **Pay comes the Friday after the work, not a week or two later.** Most restaurants pay a week or two in arrears, so a new hire's first paycheck comes after ten days or more. The slice is one week, and it would see no pay at all.
- **Withholding is not the tax owed.** A year's withholding is settled by a return, with a refund or a bill. The return is the money milestone's; until then, what is withheld is gone.

## Theft and the law (M1.5, to fill)

Figures found for D45–D48, from secondary sources. Each gets its primary source checked before it is built on: the legislature's site, the courts' benchbook, NASP's own pages. ROADMAP open question 21 names the same block on government sites.

| Figure | Value | Source, as found | Status |
| --- | --- | --- | --- |
| Retail fraud, third degree | under $200 and no prior conviction; misdemeanour; up to 93 days, and a fine of $500 or 3× the value, whichever is greater | MCL 750.356d as summarised by FindLaw; the legislature's PDF of the statute was found but not read in full | to check |
| Retail fraud, second degree | $200 to $1,000, or under $200 with a prior conviction; up to a year, and a fine of $2,000 or 3× the value | the same | to check: the penalty |
| Receiving or concealing stolen property | under $200: a misdemeanour, 93 days, $500 or 3× the value; $200 to $1,000 or with a prior: a year, $2,000 or 3× | MCL 750.535, from memory of its structure; not found in a source | to check |
| The fine and costs a court imposes on a plea | $200 fine and $125 costs (third degree), $500 and $125 (second) | none found; the statute gives only the most | (tune), a departure until sourced |
| HYTA's probation | 6 months, a check-in every 30 days, $30 a month | none found | (tune) |
| Civil demand | the value of unrecovered goods, plus 10× the retail price, at least $50 and at most $200 | MCL 600.2953, legislature PDF, summarised | to check |
| HYTA | offences from 18 to 26 since 1 October 2021 (2020 PA 396); prosecutor's consent needed for some ages; the record is nonpublic during and after; not for offences punishable by life, or traffic offences | Michigan Judicial Institute's sentencing benchbook, 6.15; a law firm's summary | to check: the age floor and the consent rule |
| How often shoplifters are caught | about once in 48 thefts, and handed to police in half of those | NASP, as quoted by local news and police leaflets; offenders' self-reports | weak anchor; the game departs from it |
| What a fence pays | 10% to 25% of retail, usually toward the low end; about 30% at traditional venues, per an industry training manual | a Canadian police research project in NCJRS (1970s); a loss-prevention manual | old and regional; ¼ proposed (D48) |
| A loaf of white bread, $2.34 | $1.87 a pound in 2025 (May: $1.876); a 20 oz loaf | BLS average price data, U.S. city average, via officialdata.org and BLS regional tables in search results | to check; no corner-shop markup applied |
| Ground coffee, 12 oz, $6.14 | $8.18 a pound in 2025 | the same | to check |
| Soup, a candy bar, razor cartridges, cold medicine, a phone charger, an energy drink, a soda | $2.19, $1.99, $19.99, $10.99, $14.99, $3.49, $2.49 | none found | (tune), departures until sourced |

**In use (M1.5).** `records/offence/*.json`, `records/crime/shoplifting.json` (odds, demand, HYTA, court days), `records/fence/back-lot.json` (share, trouble) and `records/item/*.json` (prices). The odds of being noticed are the game's own (tune), set far above the once-in-48 anchor: one clerk in a small shop sees much of it, and that is the point of the sight lines.

## Open questions

1. Which state the city borrows for law and tax. Answered: Michigan (D37).
2. Whether rents and wages are drawn from one comparable city or from the class average.
3. How often the ledger is re-checked against newer data, and whether a later base year ever replaces 2025 in a save.
4. Every figure in use is from a secondary source (In use). They are checked against their primaries once the build environment can reach them, or by hand.
5. Whether a new hire's wage is the 25th percentile, or nearer the 10th ($13.84), for someone of eighteen with no experience.
