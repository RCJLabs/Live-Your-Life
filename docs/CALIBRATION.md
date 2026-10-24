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
| A walking pace across the city | 80 m a minute, about 1.3 m a second (tune). On your block you walk 1.95 m a game minute, tuned for play (D49) | `apps/game/src/city/workplace.ts`, `WALK_PACE` | none read yet: the commonly cited adult pace of 1.2 to 1.4 m a second | a pedestrian-speed study |
| How long looking for work takes | the household survey's median spell of unemployment: 9.6 weeks in 2024 | — (a check, not a figure in use) | BLS CPS annual averages, table 31 (bls.gov/cps/data/aa2024/cpsaat31.htm), via search results | the same table. A spell still under way is not the time to find a job |

**A departure, measured.** The seeker bot, starting with no job, was hired in a median of 3.3 game days at one in two, and is in 9.8 at 15 in 100 (D76; Readings). Still quicker than a 9.6-week spell, though the two don't measure the same thing.

**The other 29 careers' wages are not in.** The federal occupational wage survey couldn't be reached from the build environment (bls.gov and the sites that quote it were blocked). A search found May 2024 figures for 7 of the 30 and part of 3 more, which are leads, not readings. The May 2025 figures, the base year's, came out on 15 May 2026.

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
| Chemistry | drawn from the seed for each pair, 0 to 100; 4 points less a year of age between you past 5 years | `population/ridgefield.json`, `chemistry` | none: the shape of age gaps in couples is to read (open question) | (tune) |

| Courting's chances and steps | talking, asking out, dates, drift, endings and finding out, each from attraction, regard and familiarity | `courtship/ridgefield.json` | none: tuned for play until the year's rates (M2.6 step 6) are read against surveys of dating and cohabitation | (tune) |
| A date's cost | $60 for two | `courtship/ridgefield.json`, `date.cost` | none read | placeholder |

**Departures.** Transgender adults (1.3% in the same survey) are counted with LGBTQ+ adults as not straight; the game has no gender identity apart from pronouns yet. People who use they are drawn to women or men at the binary shares, or to anyone; nobody is drawn to no one, though about 1% of adults name another identity, asexual among them.

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
