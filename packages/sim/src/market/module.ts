/**
 * The labor market as you meet it (M2.3, D74): the openings up today, your applications and the
 * offers they bring, where you work, and your reputation, which follows you from one employer to
 * the next. Applying shows the odds first; the answer comes in one to three days and is rolled
 * against them. An offer stands two days; taking it starts the job (the job module's `hire`).
 * Being let go costs reputation, quitting less, and shifts worked win it back.
 */
import { type Action, type Beat, defineModule, type FactView, type ModuleContext } from '@eb/core';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { careerOf } from '../job/records.ts';
import { rosterOf } from '../people/roster.ts';
import { type Employer, employersOf, homeEmployer } from './employers.ts';
import { barred, hireOdds, OFFER_DAYS, PENDING, REPUTATION } from './odds.ts';
import { type Opening, openingOf, openingsOn } from './openings.ts';

/** The district your block stands in (D67). */
export const HOME_DISTRICT = 'inner-ring';

export interface Application {
  readonly opening: string;
  readonly employer: string;
  readonly career: string;
  readonly odds: number;
  /** The tick the answer comes. */
  readonly answer: number;
}

export interface Offer {
  readonly opening: string;
  readonly employer: string;
  readonly career: string;
  readonly until: number;
}

export interface MarketSlice {
  /** Where you work, or null. */
  employer: string | null;
  /** 0 to 100. */
  reputation: number;
  applications: Application[];
  offers: Offer[];
}

type View = FactView<MarketSlice> | ModuleContext<MarketSlice>;
const sliceOf = (v: View): MarketSlice => ('state' in v ? v.state : v.read()) as MarketSlice;

function employersFor(v: View): readonly Employer[] {
  const seed = v.fact('people.seed') as number;
  return employersOf(v.content, seed, rosterOf(seed, v.fact('people.count') as number), HOME_DISTRICT);
}

const applicant = (v: View) => ({
  convictions: v.fact('law.convictions') as number,
  felonies: v.fact('law.felonies') as number,
  reputation: sliceOf(v).reputation,
});

/** Why you can't apply for an opening today, or null. */
function applyProblem(v: View, o: Opening | null): string | null {
  if (!o) return 'no-opening';
  const s = sliceOf(v);
  if (s.employer === o.employer.id) return 'works-there';
  if (s.applications.some((a) => a.opening === o.id) || s.offers.some((x) => x.opening === o.id)) return 'applied';
  if (s.applications.length >= PENDING) return 'too-many';
  return barred(careerOf(v.content, o.employer.career), applicant(v));
}

export interface Listing {
  readonly opening: string;
  readonly career: string;
  readonly employer: string;
  readonly district: string;
  readonly closes: number;
  readonly odds: number;
  /** Why you can't apply, or null. */
  readonly problem: string | null;
}

/** The openings up today, as the Jobs panel lists them, odds and all. */
function listings(v: View): Listing[] {
  const day = v.fact('time.day') as number;
  return openingsOn(v.fact('people.seed') as number, employersFor(v), day).map((o) => ({
    opening: o.id,
    career: o.employer.career,
    employer: o.employer.id,
    district: o.employer.district,
    closes: o.closes,
    odds: hireOdds(careerOf(v.content, o.employer.career), applicant(v)),
    problem: applyProblem(v, o),
  }));
}

const openingNamed = (v: View, id: unknown): Opening | null =>
  typeof id === 'string'
    ? openingOf(v.fact('people.seed') as number, employersFor(v), id, v.fact('time.day') as number)
    : null;

const apply = {
  run(ctx: ModuleContext<MarketSlice>, action: Action) {
    const o = openingNamed(ctx, action.opening);
    const problem = applyProblem(ctx, o);
    if (problem || !o) return ctx.refuse(problem ?? 'no-opening');
    const odds = hireOdds(careerOf(ctx.content, o.employer.career), applicant(ctx));
    const after = MINUTES_PER_DAY + ctx.rng('hiring').int(0, 2 * MINUTES_PER_DAY);
    const tick = ctx.fact('time.tick') as number;
    ctx.write().applications.push({
      opening: o.id,
      employer: o.employer.id,
      career: o.employer.career,
      odds,
      answer: tick + after,
    });
    ctx.apply({
      effect: 'schedule',
      timer: `answer-${o.id}`,
      after: { minutes: after },
      effects: [{ effect: 'answer', opening: o.id }],
    });
    ctx.emit('applied', { opening: o.id, career: o.employer.career, odds });
  },
  options: (v: FactView<MarketSlice>) =>
    listings(v)
      .filter((l) => l.problem === null)
      .map((l) => ({ opening: l.opening })),
};

function answer(ctx: ModuleContext<MarketSlice>, opening: string): void {
  const a = ctx.read().applications.find((x) => x.opening === opening);
  if (!a) return;
  const w = ctx.write();
  w.applications = w.applications.filter((x) => x.opening !== opening);
  if (ctx.rng('hiring').int(0, 99) >= a.odds) {
    ctx.emit('turned-down', { opening, career: a.career });
    return;
  }
  const until = (ctx.fact('time.tick') as number) + OFFER_DAYS * MINUTES_PER_DAY;
  w.offers.push({ opening, employer: a.employer, career: a.career, until });
  ctx.apply({
    effect: 'schedule',
    timer: `offer-${opening}`,
    after: { minutes: OFFER_DAYS * MINUTES_PER_DAY },
    effects: [{ effect: 'lapse', opening }],
  });
  ctx.emit('offered', { opening, career: a.career });
}

const offerNamed = (v: View, id: unknown): Offer | undefined => sliceOf(v).offers.find((x) => x.opening === id);

const accept = {
  run(ctx: ModuleContext<MarketSlice>, action: Action) {
    const offer = offerNamed(ctx, action.opening);
    if (!offer) return ctx.refuse('no-offer');
    ctx.apply({ effect: 'cancel-timer', timer: `offer-${offer.opening}` });
    const w = ctx.write();
    w.offers = w.offers.filter((x) => x.opening !== offer.opening);
    w.employer = offer.employer;
    ctx.apply({ effect: 'hire', career: offer.career });
    // The opening is yours: nobody else fills it (people/work.ts).
    ctx.emit('took', { opening: offer.opening, career: offer.career });
  },
  options: (v: FactView<MarketSlice>) => sliceOf(v).offers.map((x) => ({ opening: x.opening })),
};

const decline = {
  run(ctx: ModuleContext<MarketSlice>, action: Action) {
    const offer = offerNamed(ctx, action.opening);
    if (!offer) return ctx.refuse('no-offer');
    ctx.apply({ effect: 'cancel-timer', timer: `offer-${offer.opening}` });
    ctx.write().offers = ctx.read().offers.filter((x) => x.opening !== offer.opening);
  },
  options: () => [],
};

function moveReputation(ctx: ModuleContext<MarketSlice>, by: number): void {
  const w = ctx.write();
  w.reputation = Math.min(100, Math.max(0, w.reputation + by));
}

/** The market, for a life hired at the start into `career` (the slice's line cook) or none. */
export const marketModule = (career?: string) =>
  defineModule<MarketSlice>({
    id: 'market',
    init: (ctx) => ({
      // A career worked on your block starts you there; one worked elsewhere has no employer yet.
      employer: career && careerOf(ctx.content, career).place ? homeEmployer(career) : null,
      reputation: REPUTATION.start,
      applications: [],
      offers: [],
    }),
    facts: {
      // Still at the job the life began with, beside its crew (ties/state.ts).
      'at-diner': {
        read: ({ state }) => state.employer?.endsWith('-home') === true,
        domain: { type: 'bool' },
        label: 'working at your block’s diner',
      },
      // The roster's place of a tier-1 workplace you work at, where you meet the people on with you (M2.6).
      place: {
        read: ({ state }) => (state.employer?.startsWith('w') ? Number(state.employer.slice(1)) : -1),
        domain: { type: 'int', min: -1 },
        label: 'the tier-1 workplace you work at, or -1',
      },
      reputation: {
        read: ({ state }) => state.reputation,
        domain: { type: 'int', min: 0, max: 100 },
        label: 'your reputation as a worker',
      },
      offers: {
        read: ({ state }) => state.offers.length,
        domain: { type: 'int', min: 0 },
        label: 'job offers standing',
      },
      waiting: {
        read: ({ state }) => state.applications.length,
        domain: { type: 'int', min: 0 },
        label: 'applications waiting',
      },
      // Lists for the Jobs panel: no domain.
      openings: (view) => listings(view),
    },
    events: {
      applied: {
        args: { opening: { type: 'text' }, career: { type: 'text' }, odds: { type: 'int', min: 0, max: 100 } },
        label: 'Applied for a job',
      },
      'turned-down': { args: { opening: { type: 'text' }, career: { type: 'text' } }, label: 'Turned down for a job' },
      offered: { args: { opening: { type: 'text' }, career: { type: 'text' } }, label: 'Offered a job' },
      lapsed: { args: { opening: { type: 'text' }, career: { type: 'text' } }, label: 'Let a job offer lapse' },
      took: { args: { opening: { type: 'text' }, career: { type: 'text' } }, label: 'Took a job offered' },
    },
    actions: { apply, accept, decline },
    effects: {
      answer: (ctx, effect) => answer(ctx, String(effect.opening)),
      lapse: (ctx, effect) => {
        const offer = offerNamed(ctx, effect.opening);
        if (!offer) return;
        ctx.write().offers = ctx.read().offers.filter((x) => x.opening !== offer.opening);
        ctx.emit('lapsed', { opening: offer.opening, career: offer.career });
      },
    },
    on: {
      'job/let-go': (ctx) => {
        ctx.write().employer = null;
        moveReputation(ctx, REPUTATION.letGo);
      },
      'job/quit': (ctx) => {
        ctx.write().employer = null;
        moveReputation(ctx, REPUTATION.quit);
      },
      // A whole shift worked on time (job/shifts.ts), once a shift however often it was broken off.
      'job/standing': (ctx: ModuleContext<MarketSlice>, event: Beat) => {
        if (event.why === 'worked') moveReputation(ctx, REPUTATION.worked);
      },
    },
  });
