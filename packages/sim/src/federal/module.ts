/**
 * Federal law (M4.3, D153–D156): the federal bureau's special agents. Step 1 is the application in
 * stages (apply.ts); the Academy, the agent's career and cases follow. Posted in the city (D156).
 */
import { defineModule } from '@eb/core';
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
import { agencyOf } from './records.ts';

const STAGE = { type: 'enum', values: STAGES } as const;
const CHANCE = { type: 'int', min: 0, max: 100 } as const;

export const federalModule = defineModule<FederalSlice>({
  id: 'federal',
  version: 1,
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
  },
  actions: {
    apply: { run: (ctx) => apply(ctx), options: applyOptions },
    prepare: { run: (ctx, a) => prepare(ctx, a.for, a.minutes), options: prepareOptions },
    sit: { run: (ctx) => sit(ctx), options: sitOptions },
  },
  effects: {
    'stage-result': (ctx, e) => result(ctx, String(e.stage), e.passed === true, e.chance as number),
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
  },
  on: {
    // The background is decided at the turn of its day.
    'time/passed': (ctx) => decide(ctx),
    // An heir's application is their own: none yet.
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), NO_APPLICATION());
    },
  },
});
