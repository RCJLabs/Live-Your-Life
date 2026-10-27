/**
 * Federal law (M4.3, D153–D156): the federal bureau's special agents. Step 1 is the application in
 * stages (apply.ts); step 2 the Academy and the agent's ranks (academy.ts); step 3 the cases (cases.ts).
 * Posted in the city (D156).
 */
import { defineModule } from '@eb/core';
import { hired, left, report, reportOptions } from './academy.ts';
import {
  apply,
  applyOptions,
  decide,
  type FederalSlice,
  NO_APPLICATION,
  prepare,
  prepareOptions,
  result,
  STAGES,
  sit,
  sitOptions,
  stageChance,
} from './apply.ts';
import {
  addEvidence,
  caseResult,
  indict,
  indictChance,
  indictOptions,
  isAway,
  open,
  openOptions,
  release,
  succeeded,
  supplierDown,
  TARGETS,
} from './cases.ts';
import { agencyOf } from './records.ts';

const STAGE = { type: 'enum', values: STAGES } as const;
const CHANCE = { type: 'int', min: 0, max: 100 } as const;
const TARGET = { type: 'enum', values: TARGETS } as const;

export const federalModule = defineModule<FederalSlice>({
  id: 'federal',
  version: 2,
  migrate: {
    // Cases (M4.3 step 3, D159): none open, nobody away.
    2: (slice) => ({ ...(slice as FederalSlice), case: null, away: [], down: -1 }),
  },
  // Added to a save from before it, the life has never applied.
  init: () => NO_APPLICATION(),
  events: {
    applied: { args: { due: { type: 'int', min: 0 } }, label: 'Applied to the federal bureau' },
    prepared: {
      args: { for: { type: 'enum', values: ['written', 'fitness'] }, minutes: { type: 'int', min: 1 } },
      label: 'Studied or trained for the application',
    },
    passed: { args: { stage: STAGE, chance: CHANCE }, label: 'Passed a stage of the application' },
    failed: { args: { stage: STAGE, chance: CHANCE }, label: 'Failed a stage of the application' },
    cleared: { args: {}, label: 'Cleared for the Academy' },
    reported: { args: { career: { type: 'ref', to: 'career' } }, label: 'Reported to the Academy' },
    opened: { args: { target: TARGET, name: { type: 'text' } }, label: 'Opened a case' },
    convicted: {
      args: { target: TARGET, name: { type: 'text' }, chance: CHANCE, years: { type: 'int', min: 0 } },
      label: 'A case ended in convictions',
    },
    declined: {
      args: { target: TARGET, name: { type: 'text' }, chance: CHANCE },
      label: 'A case was declined',
    },
  },
  actions: {
    apply: { run: (ctx) => apply(ctx), options: applyOptions },
    prepare: { run: (ctx, a) => prepare(ctx, a.for, a.minutes), options: prepareOptions },
    sit: { run: (ctx) => sit(ctx), options: sitOptions },
    report: { run: (ctx) => report(ctx), options: reportOptions },
    open: { run: (ctx, a) => open(ctx, a.target, a.person), options: openOptions },
    indict: { run: (ctx) => indict(ctx), options: indictOptions },
  },
  effects: {
    'stage-result': (ctx, e) => result(ctx, String(e.stage), e.passed === true, e.chance as number),
    'case-result': (ctx, e) => caseResult(ctx, e.held === true, e.chance as number),
    // The chance an indictment holds, for the page to show before it is asked for: the one rolled.
    'case-odds': {
      run: () => {},
      preview: (ctx) => {
        const a = agencyOf(ctx.content);
        return { chance: a ? indictChance(ctx as never, a) : 0 };
      },
    },
    // The chance of passing the stage you are at, for the page to show before it is sat: the one rolled.
    'federal-odds': {
      run: () => {},
      preview: (ctx) => {
        const a = agencyOf(ctx.content);
        return { chance: a ? stageChance(ctx as never, a) : 0 };
      },
    },
  },
  facts: {
    stage: { read: ({ state }) => state.stage, domain: STAGE, label: 'where your application to the bureau stands' },
    due: {
      read: ({ state }) => state.due,
      domain: { type: 'int', min: -1 },
      label: 'the day the application’s next stage can be sat or is decided',
    },
    // Heard by the shift events' conditions: the case work comes only with a case.
    working: { read: ({ state }) => state.case !== null, domain: { type: 'bool' }, label: 'working a case' },
    evidence: {
      read: ({ state }) => state.case?.evidence ?? 0,
      domain: { type: 'int', min: 0, max: 100 },
      label: 'the evidence in your open case',
    },
    // Heard by the trade (deal/rivals.ts, trade.ts): who is away on your cases.
    away: {
      read: (view, args) => isAway(view as never, Number(args.person)),
      args: { person: { type: 'int', min: 0 } },
      domain: { type: 'bool' },
      label: 'a crew head away, convicted on your case',
    },
    'supplier-down': {
      read: (view) => supplierDown(view as never),
      domain: { type: 'bool' },
      label: 'the supplier’s crew away, convicted on your case',
    },
  },
  on: {
    // The background is decided at the turn of its day.
    'time/passed': (ctx) => {
      decide(ctx);
      release(ctx);
    },
    'job/evidence': (ctx, beat) => addEvidence(ctx, beat),
    'job/hired': (ctx, beat) => hired(ctx, beat),
    'job/let-go': (ctx) => left(ctx),
    'job/quit': (ctx) => left(ctx),
    // An heir's application and cases are their own: none yet. Who is away stays away.
    'lives/succeeded': (ctx) => succeeded(ctx),
  },
});
