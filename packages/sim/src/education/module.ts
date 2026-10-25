/**
 * Your schooling (M2.8, D111, D112). A first life starts with a high school diploma at Michigan's
 * graduation rate, drawn from the seed; without one, the GED is the way (step 2), and the
 * community college's associate's past either (step 3). An heir's schooling is drawn the same way
 * when they carry on: what they finished is their own, not yours (open question 98).
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { attend, attendOptions, type CollegeSlice, endTerm, enroll, enrollOptions, NO_COLLEGE } from './college.ts';
import { gedChance, result, sit, study, studyOptions, subjectOf, testOptions } from './ged.ts';
import { educationOf } from './records.ts';

/** The highest you have finished. */
export type Schooling = 'none' | 'diploma' | 'ged' | 'associate';
export const SCHOOLING: readonly Schooling[] = ['none', 'diploma', 'ged', 'associate'];

export interface EducationSlice {
  finished: Schooling;
  /** The GED's subjects passed, and the minutes studied for each (step 2). */
  ged: { passed: string[]; prep: Record<string, number> };
  /** The community college: a term enrolled for, and what has been earned (step 3). */
  college: CollegeSlice;
}

const NO_GED = (): EducationSlice['ged'] => ({ passed: [], prep: {} });

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
  // 2 (step 2): the GED's subjects passed and studied for. 3 (step 3): the college.
  version: 3,
  migrate: {
    2: (slice) => ({ ...(slice as object), ged: NO_GED() }),
    3: (slice) => ({ ...(slice as object), college: NO_COLLEGE() }),
  },
  // Added to a save from before it, the life has a diploma: it was lived as if it had.
  init: (ctx) => ({ finished: drawn(ctx), ged: NO_GED(), college: NO_COLLEGE() }),
  events: {
    studied: { args: { subject: { type: 'text' }, minutes: { type: 'int', min: 1 } }, label: 'Studied' },
    sat: {
      args: { subject: { type: 'text' }, passed: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } },
      label: 'Sat a GED test',
    },
    earned: { args: { credential: { type: 'enum', values: SCHOOLING } }, label: 'Earned a credential' },
    enrolled: {
      args: { term: { type: 'text' }, courses: { type: 'int', min: 1 }, start: { type: 'int', min: 0 } },
      label: 'Enrolled for a term',
    },
    attended: { args: { course: { type: 'text' } }, label: 'Went to class' },
    graded: {
      args: { course: { type: 'text' }, grade: { type: 'text' }, score: { type: 'int', min: 0, max: 100 } },
      label: 'Graded',
    },
  },
  actions: {
    study: { run: (ctx, a) => study(ctx, a.subject, a.minutes), options: studyOptions },
    'take-test': { run: (ctx, a) => sit(ctx, a.subject), options: testOptions },
    enroll: { run: (ctx, a) => enroll(ctx, a.courses), options: enrollOptions },
    attend: { run: (ctx, a) => attend(ctx, a.course), options: attendOptions },
  },
  effects: {
    'ged-result': (ctx, e) => result(ctx, e.subject as string, e.passed === true, e.chance as number),
    // The chance of passing a subject now, for the page to show before you sit it.
    'ged-odds': {
      run: () => {},
      preview: (ctx, e) => {
        const r = educationOf(ctx.content);
        const s = r ? subjectOf(r, String(e.subject)) : undefined;
        return { chance: r && s ? gedChance(ctx as never, r, s) : 0 };
      },
    },
  },
  facts: {
    finished: {
      read: ({ state }) => state.finished,
      domain: { type: 'enum', values: SCHOOLING },
      label: 'the highest schooling you have finished',
    },
    // A high school diploma or its equivalent: what most jobs that ask for schooling ask for.
    credits: {
      read: ({ state }) => state.college.credits,
      domain: { type: 'int', min: 0 },
      label: 'college credits earned',
    },
    // Hundredths: 250 is a 2.50.
    gpa: {
      read: ({ state }) =>
        state.college.graded > 0 ? Math.floor((state.college.points * 100) / state.college.graded) : 0,
      domain: { type: 'int', min: 0, max: 400 },
      label: 'your college grade point average, in hundredths',
    },
    'high-school': {
      read: ({ state }) => state.finished !== 'none',
      domain: { type: 'bool' },
      label: 'a diploma or a GED',
    },
  },
  on: {
    // A term's end, graded (college.ts).
    'time/passed': (ctx) => endTerm(ctx),
    // An heir finished their own schooling (M2.7 step 3): drawn as anyone's is.
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), { finished: drawn(ctx), ged: NO_GED(), college: NO_COLLEGE() });
    },
  },
});
