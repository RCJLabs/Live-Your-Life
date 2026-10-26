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
| Tier-1 shared places | about 12 workers to a workplace, about 30 people to a third place, 12 ties a person (24 until D71), 2 meetings an hour | `packages/sim/src/people/templates.ts`, `SHARED` and `TIES` | the city's businesses (M2.1) and M2.6's relationships |

## Departures, on purpose

When a figure is softened or sharpened for play, it is written here with the real figure beside it.

- **Pay comes the Friday after the work, not a week or two later.** Most restaurants pay a week or two in arrears, so a new hire's first paycheck comes after ten days or more. The slice is one week, and it would see no pay at all.
- **A hospital takes you in only for an illness or injury.** Health falls at the needs' pace, which brings an unfed day to zero; a real day without food puts nobody in hospital (ROADMAP open question 91).
- **Coverage is an employer's plan, Medicaid or none.** The police's plan charges no premium from the pay, and the Marketplace's subsidies aren't modelled (ROADMAP open question 97).
- **A ward's years are nobody's.** A child under 18 who carries on doesn't die, fall ill or spend in the years to 18, and what was left them waits without interest (ROADMAP open question 96).
- **An heir brings nothing of their own.** A partner or friend who carries on starts with the estate alone, no savings and no job of their own; a child who carries on leaves their brothers and sisters out of the save (ROADMAP open question 93).
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

## The city (M2.1)

Ridgefield's size and how many live in it, against two cities of the metro class (D14). Its area is the city record's: 35 cells a side of 400 m, 196 km² (75.7 square miles); its people are the districts' densities over their cells, streets included (`records/city/ridgefield.json`, `records/district/*.json`).

| Figure | Ridgefield | Comparable | Source, as read on 2026-10-23 | Primary to check |
| --- | --- | --- | --- | --- |
| Land area | 75.7 sq mi | Toledo, Ohio: 80.49 sq mi of land (2020). Grand Rapids, Michigan: 44.78 sq mi | Census Bureau QuickFacts for Toledo, via search results; Wikipedia (simple) for Grand Rapids | census.gov QuickFacts, land area in square miles, 2020 |
| People | about 290,000 at every seed (tune) | Toledo: 270,871 (2020 census). Grand Rapids: 198,893 | Wikipedia's Toledo article; Census Bureau QuickFacts for Grand Rapids | the 2020 census counts |
| People a square mile, the whole city | about 3,830 | Toledo: 3,365. Grand Rapids: 4,440 | derived from the two rows above | — |
| People a hectare by district, streets included | downtown 40, inner ring 45, old industrial 10, the strip 8, suburbs 12 (tune) | none found yet | — | tract-level densities of a comparable city's neighbourhoods |

The city as a whole sits between the two comparables. Its districts' densities are not sourced. The inner ring's 45 a hectare is about 11,650 a square mile, likely high for a Rust Belt city's older neighbourhoods. The total stays inside D4's range only because the other districts are low. Tracing each district to tract data is the next step, before households (M2.2) are built on it.

## The labor market (M2.3)

How often jobs come up, how hiring goes, and how far away work is (D73, D74). The turnover figures were read through search results quoting the federal turnover survey's tables; bls.gov itself couldn't be reached from the build environment.

| Figure | Value | Record or code | Source, as read on 2026-10-23 | Primary to check |
| --- | --- | --- | --- | --- |
| Separations a month, by industry | accommodation and food services 5.4%; retail 4.0%; manufacturing 2.7%; transportation, warehousing and utilities 3.9%; health care and social assistance 3.0%; construction 4.0%; professional and business services 4.4%; finance and insurance 1.9%; other services 3.6%; all private 3.7%. Quits are about two-thirds of these. The line cook uses food service's 54 a thousand | `career/*.json`, `employers.turnover` | JOLTS 2024 annual averages, not seasonally adjusted, tables 20 and 22 (bls.gov/news.release/jolts.t20.htm, t22.htm), via search results | the same tables, read directly |
| Staff a career has at one employer | 6 for the line cook (tune) | `employers.staff` | none: tuned so a few openings a week come up for each career | county business patterns, employees per establishment by industry |
| Days an opening stays up | 10 to 28 (tune) | `market/openings.ts`, `FILL` | none authoritative. Commercial estimates: about 18 days for food service and 38 for retail (Corporate Navigators); the federal business response survey (2022) found 12.3% of employers had a vacancy open over 30 days | a published time-to-fill for hourly jobs |
| The odds an application is taken | the line cook: 15 in 100, 8 fewer with a conviction (D76, tune) | `career/line-cook.json`, `hiring` | Pager (2003), "The Mark of a Criminal Record", American Journal of Sociology 108(5): white applicants called back 34% of the time without a record and 17% with one. A callback is not a hire, so the base is a proposal; the halving with a record is Pager's | an audit study of hires, not callbacks |
| Reputation's steps | 50 to start; 20 off for being let go, 5 for quitting, a point back for each whole shift on time (tune) | `market/odds.ts`, `REPUTATION` | none: tuned for play | — |
| An answer to an application | one to three days (tune) | `market/module.ts` | none | — |
| A walking pace | 80 m a game minute, about 1.3 m a second (tune), on your block as across the city (D119). The walk on screen keeps D49's pace, and the clock slows while you walk to count the real minutes; the passers-by are drawn at the screen's pace | `apps/game/src/city/workplace.ts`, `WALK_PACE`; `apps/game/src/life/player.ts`, `WALK_CLOCK` | none read yet: the commonly cited adult pace of 1.2 to 1.4 m a second | a pedestrian-speed study |
| How long looking for work takes | the household survey's median spell of unemployment: 9.6 weeks in 2024 | — (a check, not a figure in use) | BLS CPS annual averages, table 31 (bls.gov/cps/data/aa2024/cpsaat31.htm), via search results | the same table. A spell still under way is not the time to find a job |

**A departure, measured.** The seeker bot, starting with no job, was hired in a median of 3.3 game days at one in two, and is in 9.8 at 15 in 100 (D76; Readings). Still quicker than a 9.6-week spell, though the two don't measure the same thing.

**The other 29 careers' wages are not in.** The federal occupational wage survey couldn't be reached from the build environment (bls.gov and the sites that quote it were blocked). A search found May 2024 figures for 7 of the 30 and part of 3 more, which are leads, not readings. The May 2025 figures, the base year's, came out on 15 May 2026.

## Careers by credential (M2.8 step 5)

Nine careers added with what they ask for (D114, D116). Each wage is the 25th percentile of the federal occupational wage survey (OEWS) for a hire with no experience, as the line cook's is, read through WageDex's pages quoting it: Michigan's figure for May 2024 where WageDex has one, otherwise a mid-size Michigan metro's (Lansing, Flint) for May 2025, the city's class (D14). Annual figures are divided by 2,080 hours. Every figure is secondary: bls.gov can't be reached from the build environment (D77). The share of the city's jobs is national OEWS employment over about 150 million jobs, from general knowledge, and is to be checked. Turnover is the industry's from the labor market's table above.

| Career | Wage, an hour | Asks for | Record | Share in 10,000 | Turnover | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dishwasher (`career/dishwasher.json`) | $13.01 ($27,070 a year) | nothing | none | 27 | 54, food service | WageDex, Michigan, SOC 35-9021, May 2024 (median $13.94) | secondary |
| Cashier (`career/cashier.json`) | $13.14 ($27,340) | nothing | none | 211 | 40, retail | WageDex, Michigan, SOC 41-2011, May 2024 (median $14.03) | secondary |
| Janitor (`career/janitor.json`) | $15.43 ($32,100) | nothing | none | 141 | 44, business services | WageDex, Detroit-Warren-Dearborn, SOC 37-2011, May 2025 (no statewide page found; Saginaw's 25th is $29,420) | secondary, a larger metro's |
| Warehouse worker (`career/warehouse-worker.json`) | $17.94 ($37,310) | nothing | none | 204 | 39, transportation and warehousing | WageDex, Lansing-East Lansing, SOC 53-7062, May 2025 | secondary |
| Bank teller (`career/bank-teller.json`) | $17.70 ($36,820) | a diploma or GED, BLS's typical entry education | no theft | 22 | 19, finance | WageDex, Flint, SOC 43-3071, May 2025 | secondary |
| Customer service representative (`career/customer-service.json`) | $17.38 ($36,150) | a diploma or GED, BLS's typical entry education | none | 184 | 44, business services | WageDex, Michigan, SOC 43-4051 | secondary |
| Security guard (`career/security-guard.json`) | $16.16 ($33,620) | a diploma or GED, and no felony: Michigan's rule for a guard employed by a licensed agency (MCL 338.1067(2)) | no felony | 72 | 44, business services | wage: WageDex, Lansing-East Lansing, SOC 33-9032, May 2025; the rule: LARA's guard employee requirements page, through a search summary | secondary |
| Computer support specialist (`career/computer-support.json`) | $23.56 ($49,000) | a diploma or GED; prefers an associate's, 15 points on the odds (tune) | none | 45 | 44, business services | wage: national, OEWS 2025 through O*NET (no Michigan figure found); entry: BLS's handbook, "some college, no degree", an associate's for network support | secondary, national |
| Paralegal (`career/paralegal.json`) | $23.61 ($49,100) | an associate's, BLS's typical entry education | none | 24 | 44, business services | WageDex, Lansing-East Lansing, SOC 23-2011, May 2025 (Michigan's median $61,490, May 2024) | secondary |
| Police recruit (`career/police-recruit.json`) | as above | a diploma or GED (MCOLES); prefers an associate's, 10 points on the odds (tune) | no felony | 43 | 15 | MCOLES's standards, above | secondary |

**Hiring odds and staff (tune).** The nine take 5 in 100 who apply, 3 fewer with a conviction they don't bar, and 6 staff a site, the line cook's. Given 10 to 20 in 100 and up to 25 staff, a jobless bot was working within a week 3 times in 4, against 2 in 5 before the careers and a 9.6-week median spell in the household survey: more careers are more openings to apply to at once. At 5 the share is back near the M2.3 reading (`market/seeker.test.ts`, 25% to 60%). Callback studies would replace it (open question 66 in ROADMAP).

**Employer cover.** Banks, call centres, warehouses, offices and law firms are marked as offering health cover; dishwashing, cashiering, janitorial and guard work are not (tune: by the common pattern of large employers in those industries, not a reading). The real share of workers offered cover by industry is in the Employer Costs for Employee Compensation and the National Compensation Survey, to be read.

**Pay by credential, a realism bar.** The median starting wage of the careers that ask for each credential, against those that ask for none: a diploma or GED 1.20 times, an associate's 1.60. BLS's median weekly earnings for full-time workers of 25 and over in 2024 give 1.26 ($930 against $738) and 1.49 ($1,099). The test (`market/credentials.test.ts`) holds each within 15%. The game's are starting wages, BLS's are all ages', and one career (the paralegal) stands for the associate's: the bar is thin until more careers come.

## The buses (M2.9)

Ridgefield's buses run along the arterials, every fourth cell edge: a mile apart, as Michigan's mile roads are. Every figure is from search summaries of the agencies' own pages, and is to be checked against them.

| Figure | Value | Record or code | Source, as read on 2026-10-26 | Status |
| --- | --- | --- | --- | --- |
| The fare | $1.75 a ride, at most $5.25 a day; a second bus free within 105 minutes of boarding (with a fare card) | `transit/ridgefield.json`, `fare`, `dayCap`, `transfer` | Grand Rapids' The Rapid, through the city's Paid Transit page and Experience Grand Rapids. Lansing's CATA charges $1.25 | secondary |
| How often a bus comes | every 15 minutes in the weekday rushes (6–9 and 15–18), 30 otherwise until 23:00; Saturday every 30 from 7 to 22; Sunday every 60 from 8 to 20 (tune) | `service` | one Grand Rapids line runs every 15 minutes by day and 30 in the evening; older pages give 30 minutes on neighbourhood routes. No network-wide figure found | placeholder |
| The speed | 360 m a minute, about 13.5 mph, stops and lights included | `speed` | a Transportation Research Board survey of 11 transit systems, as Streetsblog reported it (2014); large cities run nearer 8 mph | secondary, dated |
| Stops | every 400 m, a quarter mile | `stops` | the common spacing on US local routes (general knowledge) | placeholder |

## Street dealing (M2.4)

Cocaine on the street (D78, D82). Every figure was read on 2026-10-23 through search results. Michigan's legislature and court sites, and every page a fetch was tried on, were blocked from the build environment, so each row is secondary until checked (D83).

| Figure | Value | Record or code | Source, as found | Status |
| --- | --- | --- | --- | --- |
| Delivery, or possession with intent, under 50 g | felony, up to 20 years and $25,000; class D under the sentencing guidelines (MCL 777.13m) | `offence/delivery-cocaine-50.json` | MCL 333.7401(2)(a)(iv): a county bar's summary (2019); MJI's controlled substances benchbook; an unofficial copy of 777.13m | to check |
| Possession under 25 g | felony, up to 4 years and $25,000; class G | `offence/possession-cocaine-25.json` | MCL 333.7403(2)(a)(v): an unofficial copy of the statute | to check |
| Possession, 25 to 50 g | felony, up to 4 years and $25,000 | `offence/possession-cocaine-50.json` | MCL 333.7403(2)(a)(iv): the same copy, through a search summary | to check |
| A second drug offence | up to twice the term and the fine (MCL 333.7413); any earlier drug conviction counts | not in use: a repeat goes by `repeat` below instead | the statute's PDF on a legislature mirror, through a search summary | to check |
| Guidelines' ranges for a first offence (no prior record, offence variables at I) | class D 0 to 6 months; class G 0 to 3 months. With an upper limit of 18 months or less the court gives an intermediate sanction (probation, or up to a year in jail) unless it says why not (MCL 769.34(4)(a)) | `offence/*-cocaine-*.json`, `first`: jail 0 to 30 days for delivery and possession of 25 to 50 g, 0 to 7 for under 25 g, then two years' probation, one for under 25 g (tune, inside the ranges) | copies of MCL 777.65 and 777.68; MJI's sentencing benchbook | to check |
| Felony dispositions sent to prison | 19.7% in 2023; 19% to 22% since 2003 | `offence/*-cocaine-*.json`, `repeat`: anyone with a conviction before goes to prison, 12 to 36 months for delivery, 6 to 12 for under 25 g, 12 to 24 for 25 to 50 g (tune; no guidelines cell above no prior record was found) | MDOC, prison population projection report, March 2024 | to check |
| Truth in sentencing | the whole minimum is served before parole, with no good time | `prison/module.ts`: the first hearing is on the day the minimum is served | MDOC's truth-in-sentencing page | to check |
| Parole granted | about two in three of about 10,000 decisions a year; another source gives 33% to 43% for 2018–21, which disagrees | `prison/state-prison.json`, `parole`: 65 in 100 at a standing of 50, 3 more or fewer for every 10 points of standing (tune); denied, heard again in 12 months; paroled, 2 years' supervision (tune) | MDOC testimony to the House (undated); Senate Fiscal Agency | conflicting: to settle |
| Bail | 10% of the bond posted to be released (MCL 765.6(2)), given back as the case ends; no typical amount for a delivery charge found | `trade/cocaine.json`, `bail`: a $5,000 bond, so $500 posted, set at 09:00 the morning after (tune) | the statute through a search summary; a law firm | to check; the amount unsourced |
| HYTA and drug delivery | HYTA excludes a "major controlled substance offence", which looks like it includes any 7401(2)(a) charge: delivery is not offered HYTA. A first possession can be deferred under MCL 333.7411, once in a lifetime | `offence/*.json`, `deferral`: offered on possession under 25 g only, as HYTA under its age; MCL 333.7411 for those over it is not built | MJI's benchbook; a copy of MCL 761.2 (the reading of "major" is an inference) | to check |
| A gram on the street | $81 in 2021, $120 in 2020: the sale is half a gram for $40 | `trade/cocaine.json`, `sale` | UNODC's World Drug Report through Statista, whose wording of the change between the years is inconsistent | to check |
| What the supplier charges | 3.5 g $180, 7 g $320, an ounce (28.3 g) $1,200 (tune) | `trade/cocaine.json`, `supplier.sells` | none found. UNODC gave $4,000 to $45,000 a kilogram wholesale in 2018; unsourced pages give $1,100 to $1,800 an ounce; police "street values" in Michigan seizures run from about $700 to $10,700 an ounce | placeholder |
| The police acting on what was seen | after 3 sales seen, 2 to 7 days later, at a time you are told (D46) | `trade/cocaine.json`, `police` | none: tuned for play | — |
| From arrest to the court date | 21 to 56 days (tune) | `trade/cocaine.json`, `court` | none found | a circuit court's median days from arraignment to disposition |
| A not-guilty plea's odds of dismissal | 35% on sales seen only, 10% with the drugs found on you (tune) | `trade/cocaine.json`, `contest` | none found | dismissal and acquittal rates for drug delivery charges |
| A probation violation | 30 days in jail (tune) | `law/drugs.ts`, `VIOLATION_DAYS` | none found | — |
| Buyers by the hour, who sees, heat | the trade's `corner`, `seen` and `heat` (tune) | `trade/cocaine.json` | none: tuned for play | — |
| The crew | trust of 3 (purchases, and fronts paid back on time) and heat of 30 or less to be brought in; an ounce fronted at $1,000 against $1,200 bought, due in 14 days; 5 trust lost for a front unpaid (tune) | `trade/cocaine.json`, `crew` | none found | — |
| The recruit | asked with familiarity 40 and regard 60 or more; sells 3 nights a week, a buyer at 20 in 100 each ten minutes through four hours; keeps 40% of the takings; a sale seen at 4 in 100; once arrested, names you at 70 in 100 less a point for each point of their regard (tune) | `trade/cocaine.json`, `crew.recruit` | none found | — |
| Held at most | under 50 g, the weight the charges above go by (tune) | `deal/trade.ts`, `MOST_HELD` | none: keeps a street seller inside the tiers built | — |
| What street sellers earned | about $30 an hour, 1990 dollars, for daily sellers in Washington DC (Reuter, MacCoun and Murphy); about $3.30 an hour, 1995 dollars, for a Chicago gang's foot soldiers (Levitt and Venkatesh, 2000), with 5.9 arrests and a 25% chance of death over four years | — (a check for B6, not a figure in use) | RAND reprint RP-171; NBER working paper 6592, through summaries | to check |

| The maximum a sentence holds | the offence's statutory maximum: 20 years for delivery, 4 for possession | `prison/module.ts` | Michigan's indeterminate sentencing, from memory: the court sets the minimum, and the maximum is the statute's | to check |
| Pay at a prison job | $1.50 a day (tune) | `prison/state-prison.json`, `wage` | none read; Michigan's prison wages are recalled as under $4 a day | to find |
| Standing, letters and visits | standing 50 to start, 4 a month up with the job and 2 down without; a letter a week; a visit a month from someone whose regard is 55 or more (tune) | `prison/state-prison.json` | none: tuned for play | — |

**A departure, on purpose.** Working in a crew is charged only as the sales themselves. Michigan's conspiracy statute (MCL 750.157a) and the federal one are not built. A recruit's statement counts against you as two sales seen.

**A departure, on purpose.** A felony in Michigan goes from arraignment in district court through a preliminary examination to circuit court, where it is pleaded or tried. The game has one court date. The guidelines' prior record variable counts every prior conviction; so does the game, and a retail fraud conviction makes a later drug charge a repeat.

**A departure.** The tier-1 people out on the street are those on their way to a shift (people/day.ts's commute hour). With only the line cook's shifts so far (M2.3), almost nobody passes outside the hours before 06:00 and 14:00, and the day's other hours look quieter than a real street. The passers-by drawn on the page (D72) are not counted. More careers will spread it.

## The police (M2.4)

Police officer as a career (D80): the requirements, the academy, the pay, the ladder. Read on 2026-10-24 through search results; Michigan's and the federal sites were blocked from the build environment.

| Figure | Value | Record | Source, as found | Status |
| --- | --- | --- | --- | --- |
| Who may be licensed | 18 or older; a high school diploma or GED for a recruit an agency hires; no conviction punishable by more than a year, so no felony | `career/police-recruit.json`, `requires.record: no-felony` | MCOLES's standards list (michigan.gov), through a search summary | to check |
| The academy | 16 weeks, 800 hours: 10-hour days, Monday to Friday (practice 48,000 minutes before patrol) | `career/police-recruit.json`, `shifts`, `ladder` | Northern Michigan University's academy page (16 weeks, 800 hours); Kellogg Community College's (19 weeks) | to check |
| A recruit's pay | $26.04 an hour, paid from the academy | `career/police-recruit.json`, `wage` | the City of Grand Rapids' 2025 posting on governmentjobs.com | to check |
| A patrol officer's pay | $28.28 an hour, the posting's rate after six months | `career/police-officer.json`, `wage` | the same posting | to check |
| A detective's pay | $28.28 an hour: the officer's, a placeholder (Evan's call, 2026-10-24). Grand Rapids' 2025–28 contracts give 4% raises a year; no rates were read | `career/detective.json`, `wage` | none | placeholder |
| Patrol to detective | after 6,000 hours on patrol (about three years) at a standing of 70 (tune) | `career/police-officer.json`, `ladder` | none read | (tune) |
| Hiring | 10 in 100 to start, 5 fewer with a misdemeanour (kept low: a department's background check and tests take weeks, and the answer here comes in days); 40 recruits to an employer; 15 in a thousand leave a month (tune) | `career/police-recruit.json`, `hiring`, `employers` | none read for Michigan departments | (tune) |
| Police among the city's jobs | 43 jobs in 10,000: patrol officers 646,310 in May 2023, of about 150 million jobs | every career's `employers.share`; the line cook's 94 is from memory (about 1.4 million restaurant cooks) | BLS occupational profile 33-3051, May 2023, through a search summary; the cooks' figure is not read | to check; cooks to find |

**A departure.** Patrol works days, 07:00 to 15:00, and afternoons, 15:00 to 23:00. There is no midnight shift, because a shift can't run past midnight yet.

## People and relationships (M2.6)

Who the tier-1 people are and how you come to know them (D89, D91). Read on 2026-10-24 through search results; gallup.com and census.gov were not reachable from the build environment.

| Figure | Value | Record | Source, as found | Status |
| --- | --- | --- | --- | --- |
| Adults by age | 18–24: 116; 25–34: 170; 35–44: 165; 45–54: 153; 55–64: 166; 65–85: 230, per thousand adults | `population/ridgefield.json`, `ages` | from memory of the Census Bureau's national estimates for 2023; Michigan's table (ACS S0101) not read | placeholder |
| Whom people are drawn to, by age | per thousand, drawn to their own gender and to anyone: 18–28, 95 and 136; 29–44, 68 and 74; 45–60, 31 and 20; 61–79, 18 and 12; 80 and over, 11 and 7 | `population/ridgefield.json`, `drawn` | Gallup's 2024 survey, through news coverage: 9.3% of US adults LGBTQ+; by generation, Gen Z 23.1%, millennials 14.2%, Gen X 5.1%, baby boomers 3.0%, the silent generation 1.8%; 56% of LGBTQ+ adults bisexual, 59% of Gen Z's and 52% of millennials'. Generations are taken as ages in 2025. The older generations' bisexual share, 40%, is a guess | to check; older bisexual shares (tune) |
| Hours to a friend | familiarity at half after 90 hours together; time at work counts half | `population/ridgefield.json`, `ties.half`, `ties.atWork` | Hall (2018/2019), *Journal of Social and Personal Relationships*, through the University of Kansas's summary: about 50 hours from acquaintance to casual friend, 90 to friend, over 200 to close friend; hours working together count for less. The half is a reading of "less" (tune) | to check |
| People met an hour out | 2 of those at your third place, as the tier-1 people meet each other (D71) | `population/ridgefield.json`, `ties.perHour` | none | (tune) |
| Chemistry | drawn from the seed for each pair, 0 to 100; 2 points less a year of age between you past 5 years (D101; 4 left an 18-year-old with 837 of 997 people feeling nothing) | `population/ridgefield.json`, `chemistry` | none: the shape of age gaps in couples is to read (open question) | (tune) |

| Courting's chances and steps | talking, asking out, dates, drift, endings and finding out, each from attraction, regard and familiarity | `courtship/ridgefield.json` | none: tuned for play until the year's rates (M2.6 step 6) are read against surveys of dating and cohabitation | (tune) |
| A date's cost | $60 for two | `courtship/ridgefield.json`, `date.cost` | none read | placeholder |

| A marriage licence | $20 for residents ($30 for others), usable after 3 days, the ceremony within 33 days of applying | `courtship/ridgefield.json`, `licence` | the county clerks of Berrien, Mason, Lapeer, Menominee and Newaygo counties, through a search summary; some give the licence 30 days and the ceremony 33 | to check |
| A magistrate's ceremony | $50 | `courtship/ridgefield.json`, `wedding.fee` | none read | placeholder |
| A divorce | $175 to file with no children ($255 with), judgment no sooner than 60 days after filing (180 with children), MCL 552.9f | `courtship/ridgefield.json`, `divorce` | divorce.law's Michigan guides, through a search summary | to check |
| Moving in | asked after 60 days of dating: 8 in 100 at the first ask, about 24 by the fifth monthly ask (tune). Of couples who move in, about 25% do by 4 months and 50% by a year | `courtship/ridgefield.json`, `moveIn` | Stanford's How Couples Meet and Stay Together survey, through Quartz's analysis. The suitor bot's year: of 6 couples, 3 within 120 days of the first yes, median 150 (ROADMAP Readings); too few to hold to the shape | (tune), N too small |
| Dating within a year | for a life out every evening: 40 to 80 in 100 (a proposal) | the suitor bot (`circle/suitor.ts`) | a secondhand report of a OnePoll survey: 45.7% of singles had no date in the past year; Pew (2023): 47% of adults under 30 are single. A life looking every evening should do better than all singles; the range is derived, not read | inside: 48 in 100 after D101 (28 before) |
| Cohabitation to marriage | first cohabitations last a median 22 months; 40% of women had married within three years of moving in, 27% had split | `courtship/ridgefield.json`, `propose` | the National Survey of Family Growth, through PMC articles in a search summary | to read against step 6 |
| A partner's share of the rent | half, if they work (D95) | `courtship/ridgefield.json`, `share` | none: a proposal | (tune) |

| Whose body can carry | per thousand: 994 of those who use she, 6 of those who use he, 500 of those who use they | `population/ridgefield.json`, `carry` | Gallup 2024: 1.3% of adults transgender, through news coverage, split half each way; they at half is a guess | (tune) |
| A night's chance of a pregnancy | 2 in 100 without protection; 2 in 1,000 with a condom | `pregnancy/michigan.json`, `night` | Wilcox and colleagues, through Duke's and PMC's pages: a single act falls in the fertile window 25% of the time, with a chance there up to about 10% a day; 25% × about 8% gives 2%. A condom used as most do fails 13% a year (Trussell); at about 80 nights a year that is about 0.2% a night. Both are derived, not read as such | derived |
| By the carrier's age | the chance's share left: 100% to 29, 90% from 30, 65% from 35, 30% from 40, 3% from 45, none from 50 | `pregnancy/michigan.json`, `ages` | none read: the shape of fertility by age is to read | (tune) |
| Miscarriage | 10 in 100 known pregnancies, 80% of them in the first trimester | `pregnancy/michigan.json`, `loss` | ACOG Practice Bulletin 200 (2018), through an excerpt | to check |
| Ending a pregnancy | pills to week 11, $600; a procedure after, $850, to week 24 | `pregnancy/michigan.json`, `end` | Hey Jane's Michigan page (state average $600 for pills, $700–$950 in clinic, from ANSIRH 2017–2023) and Michigan Public (2023); week 24 as viability under Proposal 3 is from memory | to check |
| A partner going on with a pregnancy | 80 in 100 | `pregnancy/michigan.json`, `partner` | none: a proposal | (tune) |
| Birth | from week 38, over 21 days; $2,655 to the one who gives birth | `pregnancy/michigan.json`, `term`, `birth` | Peterson-KFF's analysis of 2018–2020 claims: $2,655 out of pocket for a vaginal birth with large-group insurance, through news coverage; uninsured, about $15,712 | to check; a departure (open question 81) |

| A child's care | 140 minutes a day under 6, 50 from 6 to 17; half of it from a partner you live with | `pregnancy/michigan.json`, `care.needs`, `care.partner` | BLS, American Time Use Survey 2023: adults in households with children under 6 gave 2.3 hours a day of primary childcare, with the youngest 6 to 17, 52 minutes. The half from a partner is a proposal (mothers gave about 2.5 hours and fathers 1.5 in IWPR's reading of the same survey) | to check; partner (tune) |
| Daycare | $46 a day worked, for a child under 5 | `pregnancy/michigan.json`, `care.daycare` | Child Care Aware's 2023 figures through WXYZ: center care in Michigan over $12,000 a year for an infant or toddler, family child care about $9,000; $12,000 over 260 weekdays | to check |
| A report and its investigation | 3 days short of care within 14 bring a report; the investigation closes after 30 days | `pregnancy/michigan.json`, `care.neglect`, `care.investigation` | MDHHS: an investigation begins within 24 hours and has 30 days to finish. The days that bring a report are a proposal | 30 days to check; the rest (tune) |
| A safety plan after a finding (D102) | open 90 days; 2 more days short of care within it move the child to the other parent, or into foster care | `pregnancy/michigan.json`, `care.plan` | Michigan's Children's Protective Services Manual, PSM 714-4: ongoing-service cases with a history of neglect or a severe one stay open at least 90 days, until the child is safe and the risk falls; a 2019 legislative testimony: concerns typically resolved within 6 months. The 2 days are not sourced | 90 days traced; 2 days (tune). Departure: Michigan charges parents for foster care; here nobody pays |

| Child support's base | 20 in 100 of the parents' combined net income for one child, 30 for two, 35 for three, 38 for four | `pregnancy/michigan.json`, `support.base` | none read: Michigan's base schedule wasn't reachable | placeholder |
| The parenting time offset | (A's nights^2.5 × B's base − B's nights^2.5 × A's base) / (A's nights^2.5 + B's nights^2.5) | `packages/sim/src/family/support.ts`, `supportFor` | the 2025 Michigan Child Support Formula Manual, section 3.03, through a search summary | to check |
| Nights a year | 292 with the parent the child lives with, 73 with the other (alternate weekends and a weeknight) | `pregnancy/michigan.json`, `support.nights` | divorce.law's Michigan parenting-time calculator (about 73 nights for every other weekend and a weeknight); county guidelines give 64.5 to 95.5 by age | to check |
| Net income for support | an hourly wage at 30 hours a week, 85 in 100 kept | `pregnancy/michigan.json`, `support.hours`, `support.keep` | none: a proposal until a household's money is kept | (tune) |

**Departures.** Transgender adults (1.3% in the same survey) are counted with LGBTQ+ adults as not straight; the game has no gender identity apart from pronouns yet. People who use they are drawn to women or men at the binary shares, or to anyone; nobody is drawn to no one, though about 1% of adults name another identity, asexual among them.

## Lives (M2.7)

| What | Figure | Where it's used | Source | Status |
| --- | --- | --- | --- | --- |
| A year's chance of dying, by age and body | per 100,000, a straight line between rows from 18 to 110; a body that can carry reads the life table's female column, one that can't its male | `mortality/united-states.json` | CDC's United States Life Tables, 2021 (NVSR 72-12, Table 2), through search summaries: male 0.001361 at 20, 0.002048 at 40, 0.006679 at 50, 0.014341 at 60. Every other row, and the whole female column, is a placeholder from memory of the table's shape: cdc.gov, ftp.cdc.gov and ssa.gov couldn't be reached from the build environment | 4 male rows traced; the rest placeholders, to check against Table 2 and 3 |
| A month's chance | the year's over 12, rolled every 30 days; at 18, about 1 in 100,000 a month for a body that can't carry | `lives/module.ts`, `MONTH` | derived. A twelfth of the year's chance understates it slightly when the chance is large (at a year's 10%, by about 5%); kept for whole-number rolls | derived, a departure at old ages |
| Health let fall | below 20, the chance is tripled | `mortality/united-states.json`, `health` | none: a stand-in. Illness (step 2) takes health but doesn't yet raise the chance of its own | (tune) |
| Body for the table | the life table's sex, read as the body's | `lives/module.ts` | the tables are by sex; the game's bodies (D96) are the nearest it holds | a departure |
| A cold | 250 in 100 people a year; 7 days; no work missed | `illness/michigan.json` | CDC's common cold page, through search summaries: adults have 2 to 3 colds a year, lasting 7 to 10 days | secondary |
| The flu | 12 in 100 a year; 7 days, 4 off work; a visit shortens it by a day | `illness/michigan.json` | CDC's 2023–24 burden estimate, through search summaries: about 40 million illnesses and 18 million medical visits, among about 335 million people. The days off and the day a visit saves (antivirals) are placeholders | rate secondary; days (tune) |
| An injury at work | 1 in 100 full-time years, by the minutes worked (2,000 hours a year); 10 days, 8 off; a visit saves 2 | `illness/michigan.json`, `shiftChance` | BLS's 2023 Survey of Occupational Injuries and Illnesses, through search summaries: 0.9 cases with days away from work per 100 full-time workers, a median of about 8 days away | secondary |
| A doctor's visit | $171 without cover; $2 with Medicaid; 90 minutes; weekdays 08:00 to 17:00 | `illness/michigan.json`, `visit` | Zocdoc's 2024 price guide, through search summaries: $171 for a primary care visit without insurance. Healthy Michigan's copay for an office visit, $2, from search summaries | secondary |
| A hospital day | $3,000 without cover; nothing with Medicaid; 4 days; 20 health a day | `illness/michigan.json`, `hospital` | a placeholder near KFF's expenses per inpatient day for Michigan's hospitals, not traced; the stay and the health are (tune). An emergency visit alone runs about $2,715 (Zocdoc, secondary) | placeholder |
| Medicaid's line | $1,732 a month for one, $632 for each more in the household; a wage counted at 130 hours a month | `illness/michigan.json`, `medicaid` | Healthy Michigan Plan, 2025: 133% of the poverty line (138% with the disregard), $20,780 a year for one, through search summaries; each more person is the 2025 guideline's step, $5,500, at 138%. 130 hours is 30 a week, the full-time line | secondary |
| An employer's plan | a visit's copay $26; a hospital day $500 to you; offered by the police (a public employer), not the diner | `illness/michigan.json`, `visit.employer`, `hospital.employer`; `career/*.json`, `insurance` | the copay near KFF's 2023 Employer Health Benefits Survey's average primary-care copay, from memory, not traced; the hospital day a placeholder for a deductible and coinsurance spread over a stay; who offers it by the employer's kind, not traced | placeholder |
| The small-estate limit | $53,000: an estate up to it passes by affidavit, at no cost | `estate/michigan.json`, `small` | Michigan's EPIC (MCL 700.3983), indexed yearly by the date of death, through search summaries: $53,000 for deaths in 2026 (two estate guides), $27,000 for 2023. The 2025 figure, the base year's, wasn't found; the treasury's yearly adjustment table holds it | secondary, a year off |
| Probate's cost | 5% of an estate above the limit | `estate/michigan.json`, `probate` | none: a placeholder for court fees and an attorney's, which vary with the estate | placeholder (tune) |
| Debts and the estate | debts are paid from what you left; past it, they die with it and the heir owes none | `lives/heir.ts` | the general rule of Michigan's EPIC, by search summaries: an heir isn't liable for the dead's debts beyond the estate. A creditor's claim period and the order of claims aren't modelled | a simplification |

## Education (M2.8)

| What | Figure | Where it's used | Source | Status |
| --- | --- | --- | --- | --- |
| A diploma at 18 | 83 in 100 (82.8%, the class of 2024's four-year rate) | the start (D112) | Michigan Department of Education, through search summaries (press release of 21 February 2025); the class of 2025's rate was just over 84% | secondary |
| The GED | four subject tests at $43.50 each, $174 in all, in person; one discounted retake each | the GED (step 2) | Michigan's Workforce Development page on high school equivalency, through search summaries; older pages give $37.50 | secondary |
| The GED's tests | 115, 150, 90 and 70 minutes (mathematical reasoning, language arts, science, social studies); passed by 55, 59, 77 and 58 in 100 who sit them; 85 in 100 who sit all four earn the GED | `education/michigan.json`, `ged.subjects` | lengths from GED test guides, through search summaries; pass rates from Montgomery County, Maryland's FY19 results (small counts, one county); the 85 in 100 from GED Testing Service data via Equity in Higher Ed (2014–2018) | secondary; the subject rates a placeholder |
| Study and the GED | two points on the chance for each hour studied for a subject, at most 95 in 100; the centre open weekdays 09:00 to 17:00 | `education/michigan.json`, `ged.perHour`, `most`, `opens`, `closes` | none | (tune) |
| The college's terms and credits | fall from 1 September and spring from 13 January, 16 weeks each; courses of 3 credits meeting 150 minutes a week; an associate's at 60 credits and a 2.00 average | `education/michigan.json`, `college` | the common pattern of Michigan's community colleges (16-week semesters, 60 credits for an associate's, 2.0 to graduate), from general knowledge; to check against one college's catalog | placeholder |
| Grades | half attendance, half the rule of thumb's two hours of study a week for each credit; A from 90, B 80, C 70, D 60 | `education/michigan.json`, `college.study`, `grades` | the two-hours-a-credit rule of thumb is common in college advising; the score is a game's | (tune) |
| Community college tuition | $113 a billable contact hour in district, 2025–26 (and held for 2026–27); $7.50 a contact hour technology and facilities fee; $50 registration and $15 student service fee a term. A course's contact hours are taken as its credits, so 12 credits are $1,511 a term | `education/michigan.json`, `aid.tuition`, `hourFee`, `termFee` | Macomb Community College's tuition and fee schedule and its news release of March 2025, through search summaries; other colleges run $149 (Gogebic) to $155 (Mid Michigan) a credit | secondary |
| The Pell grant | at most $7,395 a year, at least $740 (2025–26), half a year's a term, in proportion below 12 credits; the most for an independent student without children at an adjusted gross income up to 175% of the poverty line. Here it falls in a straight line to the least at 275%, nothing above (tune: the real award is the most less the Student Aid Index, and 275% is confirmed only for a dependent student's parents). Income is your gross pay over the past 365 days, not the year before last's, and you count as independent at any age (D115) | `education/michigan.json`, `aid.pell` | the Department of Education's 2025–26 Federal Student Aid Handbook (application and verification guide, chapter 3; volume 7, chapter 2), and CRS's report on the FAFSA Simplification Act, through search summaries | secondary; the line between shares a game's |
| The poverty line | $14,580 a year for a household of one: the 2023 guideline, which the 2025–26 award year uses | `education/michigan.json`, `aid.pell.line` | HHS's poverty guidelines for 2023, from general knowledge; the FSA handbook names the prior-prior year's guideline | to check |
| Federal Direct loans | 6.39% fixed for undergraduates, first paid out from 1 July 2025 to 30 June 2026 (6.52% for 2026–27, not used); a 1.057% origination fee; an independent student's limit $9,500 in the first year and $10,500 in the second; at least half time (six credits) to borrow and to defer; repaid from six months after leaving school over 10 years on the standard plan, at least $50 a month. All are treated as unsubsidized (open question 101 in ROADMAP) | `education/michigan.json`, `aid.loans` | several colleges' financial aid pages (UW–La Crosse, Gettysburg, Washington and Lee, NJIT, Chapman), through search summaries | secondary |
| A borrower's death | federal Direct loans are discharged; the estate owes nothing (D113, amended) | `education/loans.ts`, the heir | consumer guides (Credible, MoneyLion, Harvard Law School's financial aid office), through search summaries; 34 CFR 685.212 not read | secondary |
| The police's requirement | a high school diploma or GED for an employed recruit; an associate's for a pre-service recruit by the academy's end | careers (step 5) | MCOLES's licensing standards (updated July 2025), through search summaries | secondary |
| Pay by credential | median weekly earnings, full-time, 25 and over, 2024: $930 with a diploma, $1,020 with some college and no degree, $1,099 with an associate's, $738 without a diploma | careers (step 5) | BLS, Employment Projections' education-pays table and CPS table 37b, through search summaries | secondary |
| Finishing an associate's part time | of students starting part time at a public two-year college (fall 2012), 4.0 in 100 had graduated by the end of year 2, 15.1 by year 4 and 20.9 by year 6; full-time starters 32 by year 6 | the student bot's reading (ROADMAP Readings) | the National Student Clearinghouse's Yearly Success and Progress report, through search summaries | secondary |
| Borrowing for an associate's | 33 in 100 associate's graduates of public colleges had ever borrowed (2019–20), owing $15,530 on average if they had | the student bot's reading | the Community College Research Center's fact sheet on community colleges and student debt, through search summaries | secondary |
| Retaking a course | a course taken again counts at the better grade, both staying on the record; a student under 2.00 may also have up to 30 credits of D and E grades set aside once (academic renewal, not built) | `education/michigan.json`, `college.retake` (C or lower, tune) | Macomb Community College's Academic Renewal and Course Repeat Policy (macomb.edu), through a search summary | secondary |

## Open questions

1. Which state the city borrows for law and tax. Answered: Michigan (D37).
2. Whether rents and wages are drawn from one comparable city or from the class average.
3. How often the ledger is re-checked against newer data, and whether a later base year ever replaces 2025 in a save.
4. Every figure in use is from a secondary source (In use). They are checked against their primaries once the build environment can reach them, or by hand.
5. Whether a new hire's wage is the 25th percentile, or nearer the 10th ($13.84), for someone of eighteen with no experience.
6. Which tract data stands for each district's density (The city), and whether the inner ring's 45 a hectare comes down once it is traced.
7. How quickly someone with no job is hired. Answered for now by D76 (15 in 100); what reading should hold it, since a spell of unemployment is not quite the measure, is open.
8. The 29 careers' wages, when bls.gov can be reached.
9. The age gaps between partners, by age (the Census Bureau's tables of married couples), so chemistry's fall with a gap can be read rather than tuned.
