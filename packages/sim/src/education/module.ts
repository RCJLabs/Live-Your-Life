/**
 * Your schooling (M2.8, D111, D112). A first life starts with a high school diploma at Michigan's
 * graduation rate, drawn from the seed; without one, the GED is the way (step 2), and the
 * community college's associate's past either (step 3). An heir's schooling is drawn the same way
 * when they carry on: what they finished is their own, not yours (open question 98).
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { educationOf } from './records.ts';

/** The highest you have finished. */
export type Schooling = 'none' | 'diploma' | 'ged' | 'associate';
export const SCHOOLING: readonly Schooling[] = ['none', 'diploma', 'ged', 'associate'];

export interface EducationSlice {
  finished: Schooling;
}

type Ctx = ModuleContext<EducationSlice>;

/**
 * A diploma or not, at the record's rate, from the education stream. A pack without the record
 * gives everyone one, and opens no stream: a replay by such a pack keeps its hash.
 */
function drawn(ctx: Pick<Ctx, 'content' | 'rng'>): Schooling {
  const r = educationOf(ctx.content);
  if (!r) return 'diploma';
  return ctx.rng('education').int(0, 9999) < r.diploma ? 'diploma' : 'none';
}

export const educationModule = defineModule<EducationSlice>({
  id: 'education',
  // Added to a save from before it, the life has a diploma: it was lived as if it had.
  init: (ctx) => ({ finished: drawn(ctx) }),
  facts: {
    finished: {
      read: ({ state }) => state.finished,
      domain: { type: 'enum', values: SCHOOLING },
      label: 'the highest schooling you have finished',
    },
    // A high school diploma or its equivalent: what most jobs that ask for schooling ask for.
    'high-school': {
      read: ({ state }) => state.finished !== 'none',
      domain: { type: 'bool' },
      label: 'a diploma or a GED',
    },
  },
  on: {
    // An heir finished their own schooling (M2.7 step 3): drawn as anyone's is.
    'lives/succeeded': (ctx) => {
      ctx.write().finished = drawn(ctx);
    },
  },
});
