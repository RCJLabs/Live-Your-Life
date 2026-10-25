/**
 * Prison (M2.4, D81): a sentence served as days, a day an action, so the page can pass it a day a
 * frame (ROADMAP open question 65). The choices are few: work the prison job, write to someone
 * outside. Standing moves month by month, and those outside remember the silence. The whole
 * minimum is served before parole is heard (truth in sentencing); a hearing is rolled at odds from
 * your standing, shown first; parole is the law's probation; the maximum, a discharge.
 */
import { type Beat, defineModule, type ModuleContext, type PreviewContext } from '@eb/core';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { offenceOf } from '../law/records.ts';
import { PRISON, prisonOf } from './records.ts';

export interface Term {
  readonly offence: string;
  readonly from: number;
  /** The day the minimum is served, and the most it can be. */
  readonly minimum: number;
  readonly maximum: number;
  /** The day of the next parole hearing. */
  readonly hearing: number;
}

export interface PrisonSlice {
  term: Term | null;
  job: boolean;
  standing: number;
  /** Cents earned at the prison job, all told. */
  earned: number;
  /** The day of the last letter, or -1. */
  wrote: number;
  /** The day the month inside began, and whether a letter went out in it. */
  month: number;
  wroteInMonth: boolean;
}

type Ctx = ModuleContext<PrisonSlice>;
type View = { content: Ctx['content']; fact(id: string, args?: Record<string, unknown>): unknown };

const MONTH = 30;
const today = (v: View): number => v.fact('time.day') as number;
const read = (v: Ctx | PreviewContext<PrisonSlice>) => v.read();

/** The odds in percent that a hearing paroles you, from your standing. */
export function paroleOdds(v: View, standing: number): number {
  const p = prisonOf(v.content).parole;
  return Math.max(5, Math.min(95, p.base + Math.floor(((standing - 50) * p.standing) / 10)));
}

/** A month in days, as the sentence counts them (a departure: 365/12, rounded down). */
const monthsToDays = (months: number): number => Math.floor((months * 365) / 12);

function admit(ctx: Ctx, event: Beat): void {
  if (event.kind !== 'prison' || !ctx.content.has('prison', PRISON)) return;
  const day = today(ctx);
  const offence = String(event.offence);
  const minimum = day + monthsToDays(event.prison as number);
  const maximum = Math.max(minimum, day + offenceOf(ctx.content, offence).days);
  const w = ctx.write();
  w.term = { offence, from: day, minimum, maximum, hearing: minimum };
  w.job = false;
  w.standing = prisonOf(ctx.content).standing.start;
  w.month = day;
  w.wroteInMonth = false;
  ctx.modes.push('prison', {});
  ctx.apply({ effect: 'tie-act', act: prisonOf(ctx.content).acts.inside });
  ctx.emit('admitted', { offence, minimum, maximum });
}

/** A month inside: standing by the work done, a tie cooled without a letter, a visit if they still care. */
function monthEnd(ctx: Ctx): void {
  const p = prisonOf(ctx.content);
  const s = ctx.read();
  // A visit from someone who still thinks well of you, before the month's silence counts.
  const known = ctx.fact('ties.familiarity') as number;
  if (known > 0 && (ctx.fact('ties.regard') as number) >= p.visit.regard) {
    ctx.apply({ effect: 'adjust-needs', needs: { company: p.visit.company } });
    ctx.emit('visited', {});
  }
  const w = ctx.write();
  w.standing = Math.max(0, Math.min(100, s.standing + (s.job ? p.standing.working : -p.standing.idle)));
  if (!s.wroteInMonth) ctx.apply({ effect: 'tie-act', act: p.acts.silent });
  w.month = today(ctx);
  w.wroteInMonth = false;
}

/** `inside-day`: the day's end. Paid for the work, fed and slept; the month, a hearing, the maximum. */
function insideDay(ctx: Ctx): void {
  const s = ctx.read();
  if (!s.term) return;
  const p = prisonOf(ctx.content);
  if (s.job) {
    ctx.apply({ effect: 'add-resource', resource: 'cash', by: p.wage });
    ctx.write().earned += p.wage;
  }
  ctx.apply({ effect: 'adjust-needs', needs: { rest: 100, food: 100, hygiene: 100 } });
  const day = today(ctx);
  if (day - s.month >= MONTH) monthEnd(ctx);
  if (day >= s.term.maximum) {
    release(ctx, 'discharged');
    return;
  }
  if (day >= s.term.hearing) {
    const chance = paroleOdds(ctx, ctx.read().standing);
    ctx.emit('hearing', { chance });
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance, effects: [{ effect: 'paroled' }] },
        { chance: 100 - chance, effects: [{ effect: 'denied' }] },
      ],
    });
  }
}

function release(ctx: Ctx, how: 'paroled' | 'discharged'): void {
  const term = ctx.read().term as Term;
  const w = ctx.write();
  w.term = null;
  w.job = false;
  if (ctx.modes.current.id === 'prison') ctx.modes.pop();
  ctx.apply({
    effect: 'served',
    offence: term.offence,
    parole: how === 'paroled' ? prisonOf(ctx.content).parole.term : 0,
  });
  ctx.emit(how, { offence: term.offence });
}

const inside = (v: { read(): Readonly<PrisonSlice> } | { state: Readonly<PrisonSlice> }) =>
  ('state' in v ? v.state : v.read()).term !== null;

const DAY_ARG = { type: 'int', min: 0 } as const;

export const prisonModule = defineModule<PrisonSlice>({
  id: 'prison',
  init: (ctx) => ({
    term: null,
    job: false,
    standing: ctx.content.has('prison', PRISON) ? prisonOf(ctx.content).standing.start : 50,
    earned: 0,
    wrote: -1,
    month: 0,
    wroteInMonth: false,
  }),
  facts: {
    inside: { read: ({ state }) => state.term !== null, domain: { type: 'bool' }, label: 'in prison' },
    standing: {
      read: ({ state }) => state.standing,
      domain: { type: 'int', min: 0, max: 100 },
      label: 'your standing inside',
    },
    working: { read: ({ state }) => state.job, domain: { type: 'bool' }, label: 'working the prison job' },
    'to-hearing': {
      read: (view) => (view.state.term ? Math.max(0, view.state.term.hearing - today(view)) : 0),
      domain: { type: 'int', min: 0 },
      label: 'days until the parole board hears you',
    },
    'to-maximum': {
      read: (view) => (view.state.term ? Math.max(0, view.state.term.maximum - today(view)) : 0),
      domain: { type: 'int', min: 0 },
      label: 'days until the most the sentence can hold you',
    },
  },
  events: {
    admitted: { args: { offence: { type: 'text' }, minimum: DAY_ARG, maximum: DAY_ARG }, label: 'Went to prison' },
    hearing: { args: { chance: { type: 'int', min: 0, max: 100 } }, label: 'Heard by the parole board' },
    paroled: { args: { offence: { type: 'text' } }, label: 'Paroled' },
    denied: { args: { again: DAY_ARG }, label: 'Denied parole' },
    discharged: { args: { offence: { type: 'text' } }, label: 'Discharged at the end of the sentence' },
    visited: { args: {}, label: 'Had a visit' },
    wrote: { args: {}, label: 'Wrote a letter' },
    working: { args: { working: { type: 'bool' } }, label: 'Took or left the prison job' },
  },
  actions: {
    day: {
      run: (ctx: Ctx) => {
        if (!inside(ctx)) return ctx.refuse('not-inside');
        ctx.apply({ effect: 'wait', minutes: MINUTES_PER_DAY });
        ctx.apply({ effect: 'inside-day' });
      },
      options: (view) => (inside(view) ? [{}] : []),
    },
    work: {
      run: (ctx: Ctx) => {
        if (!inside(ctx)) return ctx.refuse('not-inside');
        const job = !ctx.read().job;
        ctx.write().job = job;
        ctx.emit('working', { working: job });
      },
      options: (view) => (inside(view) ? [{}] : []),
    },
    write: {
      run: (ctx: Ctx) => {
        const s = ctx.read();
        const p = prisonOf(ctx.content);
        if (!s.term) return ctx.refuse('not-inside');
        if (s.wrote >= 0 && today(ctx) - s.wrote < p.letters.every) return ctx.refuse('wrote-lately');
        const w = ctx.write();
        w.wrote = today(ctx);
        w.wroteInMonth = true;
        ctx.apply({ effect: 'tie-act', act: p.acts.letter });
        ctx.apply({ effect: 'adjust-needs', needs: { company: p.letters.company } });
        ctx.emit('wrote', {});
      },
      options: (view) => {
        const s = view.state;
        if (!s.term || (view.fact('ties.familiarity') as number) === 0) return [];
        return s.wrote >= 0 && today(view) - s.wrote < prisonOf(view.content).letters.every ? [] : [{}];
      },
    },
  },
  effects: {
    'inside-day': (ctx) => insideDay(ctx),
    paroled: (ctx) => release(ctx, 'paroled'),
    denied: (ctx) => {
      const term = ctx.read().term as Term;
      const again = monthsToDays(prisonOf(ctx.content).parole.again);
      ctx.write().term = { ...term, hearing: Math.min(term.maximum, today(ctx) + again) };
      ctx.emit('denied', { again });
    },
    // What a hearing would be rolled at now, for the page to show first.
    'parole-odds': {
      run: () => {},
      preview: (ctx: PreviewContext<PrisonSlice>) => ({ chance: paroleOdds(ctx, read(ctx).standing) }),
    },
  },
  on: {
    'law/sentenced': admit,
    // A sentence was yours, not the heir's (M2.7 step 3).
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), {
        term: null,
        job: false,
        standing: ctx.content.has('prison', PRISON) ? prisonOf(ctx.content).standing.start : 50,
        earned: 0,
        wrote: -1,
        wroteInMonth: false,
      });
    },
  },
  modes: {
    // The world outside goes on; inside, a day at a time (D81).
    prison: { actions: ['prison/*', 'time/*'] },
  },
});
