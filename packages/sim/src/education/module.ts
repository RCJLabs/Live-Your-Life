/**
 * Your schooling (M2.8, D111, D112). A first life starts with a high school diploma at Michigan's
 * graduation rate, drawn from the seed; without one, the GED is the way (step 2), and the
 * community college's associate's past either (step 3), paid for by tuition, a Pell grant and
 * loans (step 4); then the state university's bachelor's, admitted at odds (M4.2, D149, D150),
 * and law school, the JD and the bar (step 2).
 * An heir's schooling is drawn the same way
 * when they carry on: what they finished is their own, not yours (open question 98).
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { aidIncome, BORROWING, type Borrow, billFor, type Paycheck } from './aid.ts';
import {
  attend,
  attendOptions,
  type CollegeSlice,
  certified,
  classDuring,
  classIn,
  emtOf,
  endTerm,
  enroll,
  enrollOptions,
  gpaOf,
  NO_COLLEGE,
  NURSING,
  type Program,
  SCHOOLS,
  schoolOf,
  type Term,
  type Which,
} from './college.ts';
import { type ExamSlice, examChance, examOptions, examResult, NO_EXAM, sitExam } from './emt.ts';
import { gedChance, result, sit, study, studyOptions, subjectOf, testOptions } from './ged.ts';
import {
  apply as applyLaw,
  applyOptions as applyLawOptions,
  barChance,
  barIn,
  barOptions,
  barResult,
  expectedLsat,
  type LawSlice,
  lawChance,
  lawOf,
  result as lawResult,
  lsatOptions,
  NO_LAW,
  sitBar,
  sitLsat,
} from './law.ts';
import { behindOf, LOANS, type Loan, month, NO_LOAN, owedNow, payBehind, termsOf } from './loans.ts';
import {
  type Admission,
  apply as applyNursing,
  applyOptions as applyNursingOptions,
  nclexChance,
  nclexOf,
  nclexOptions,
  nclexResult,
  nursingChance,
  result as nursingResult,
  sitNclex,
} from './nursing.ts';
import { educationOf } from './records.ts';
import {
  admitChance,
  result as admitResult,
  apply,
  applyOptions,
  NO_UNIVERSITY,
  type UniversitySlice,
  universityOf,
} from './university.ts';

/** The highest you have finished. */
export type Schooling = 'none' | 'diploma' | 'ged' | 'associate' | 'bachelor' | 'jd';
export const SCHOOLING: readonly Schooling[] = ['none', 'diploma', 'ged', 'associate', 'bachelor', 'jd'];

export interface EducationSlice {
  finished: Schooling;
  /** The GED's subjects passed, and the minutes studied for each (step 2). */
  ged: { passed: string[]; prep: Record<string, number> };
  /** The community college: a term enrolled for, and what has been earned (step 3). */
  college: CollegeSlice;
  /** The state university: admitted or not, a term, and what has been earned there (M4.2). */
  university: UniversitySlice;
  /** Law school: the LSAT, admitted or not, a term, the JD's credits and the bar (M4.2 step 2). */
  law: LawSlice;
  /** Gross pay over the past year, for aid, and the federal loans (step 4). */
  pay: Paycheck[];
  loan: Loan;
  /** Law school's loans, apart from the others: their own rate. */
  grad: Loan;
  /** The EMT course at the college, and the national exam (M4.4, D163). */
  emt: CollegeSlice;
  nremt: ExamSlice;
  /** The nursing programs, each with its admission; the one finished; the licensing exam (M4.4 step 2). */
  adn: CollegeSlice & Admission;
  bsn: CollegeSlice & Admission;
  nursing: 'none' | Program;
  nclex: ExamSlice;
}

const NO_GED = (): EducationSlice['ged'] => ({ passed: [], prep: {} });
const FRESH = (finished: Schooling): EducationSlice => ({
  finished,
  ged: NO_GED(),
  college: NO_COLLEGE(),
  university: NO_UNIVERSITY(),
  law: NO_LAW(),
  pay: [],
  loan: NO_LOAN(),
  grad: NO_LOAN(),
  emt: NO_COLLEGE(),
  nremt: NO_EXAM(),
  ...NO_NURSING(),
});

/** What a life before the nursing programs (version 9) has: none applied to, none finished. */
const NO_NURSING = (): Pick<EducationSlice, 'adn' | 'bsn' | 'nursing' | 'nclex'> => ({
  adn: { ...NO_COLLEGE(), admitted: false, applied: -1 },
  bsn: { ...NO_COLLEGE(), admitted: false, applied: -1 },
  nursing: 'none',
  nclex: NO_EXAM(),
});

type Ctx = ModuleContext<EducationSlice>;
const PROGRAM = { type: 'enum', values: NURSING } as const;

/** Version 8: each school's term, if one is under way, was taken by day. */
export function migrateTerms(s: EducationSlice): EducationSlice {
  const byDay = <T extends { term: Term | null }>(x: T): T =>
    x.term ? { ...x, term: { ...x.term, evening: false } } : x;
  return { ...s, college: byDay(s.college), university: byDay(s.university), law: byDay(s.law) };
}

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
  // 2 (step 2): the GED's subjects passed and studied for. 3 (step 3): the college. 4 (step 4):
  // pay for aid and the loans; a save from before has borrowed nothing, and its pay before is not known.
  // 5 (step 8): each course's last grade, for retakes; a save from before has none, so its courses
  // passed can't be retaken (their grades weren't kept). 6 (M4.2 step 1): the university; a save
  // from before has not applied. 7 (step 2): law school and its loans; a save from before has
  // neither. 8 (D152): a term taken by day or by evening; a term from before was by day. 9 (M4.4
  // step 1): the EMT course and its exam; a save from before has taken neither. 10 (step 2): the
  // nursing programs and their exam; a save from before has applied to neither.
  version: 10,
  migrate: {
    2: (slice) => ({ ...(slice as object), ged: NO_GED() }),
    3: (slice) => ({ ...(slice as object), college: NO_COLLEGE() }),
    4: (slice) => ({ ...(slice as object), pay: [], loan: NO_LOAN() }),
    5: (slice) => {
      const s = slice as EducationSlice;
      return { ...s, college: { ...s.college, grades: {} } };
    },
    6: (slice) => ({ ...(slice as object), university: NO_UNIVERSITY() }),
    7: (slice) => ({ ...(slice as object), law: NO_LAW(), grad: NO_LOAN() }),
    8: (slice) => migrateTerms(slice as EducationSlice),
    9: (slice) => ({ ...(slice as object), emt: NO_COLLEGE(), nremt: NO_EXAM() }),
    10: (slice) => ({ ...(slice as object), ...NO_NURSING() }),
  },
  // Added to a save from before it, the life has a diploma: it was lived as if it had.
  init: (ctx) => FRESH(drawn(ctx)),
  events: {
    studied: { args: { subject: { type: 'text' }, minutes: { type: 'int', min: 1 } }, label: 'Studied' },
    sat: {
      args: { subject: { type: 'text' }, passed: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } },
      label: 'Sat a GED test',
    },
    earned: { args: { credential: { type: 'enum', values: SCHOOLING } }, label: 'Earned a credential' },
    enrolled: {
      args: {
        term: { type: 'text' },
        courses: { type: 'int', min: 1 },
        start: { type: 'int', min: 0 },
        school: { type: 'enum', values: SCHOOLS },
      },
      label: 'Enrolled for a term',
    },
    attended: { args: { course: { type: 'text' } }, label: 'Went to class' },
    admitted: {
      args: {
        admitted: { type: 'bool' },
        chance: { type: 'int', min: 0, max: 100 },
        transfer: { type: 'int', min: 0 },
      },
      label: 'Heard from the university',
    },
    lsat: { args: { score: { type: 'int', min: 120, max: 180 } }, label: 'Sat the LSAT' },
    'law-admitted': {
      args: { admitted: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } },
      label: 'Heard from the law school',
    },
    bar: { args: { passed: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } }, label: 'Sat the bar exam' },
    certified: { args: {}, label: 'Earned the EMT certificate' },
    'nursing-admitted': {
      args: {
        program: PROGRAM,
        name: { type: 'text' },
        admitted: { type: 'bool' },
        chance: { type: 'int', min: 0, max: 100 },
      },
      label: 'Heard from a nursing program',
    },
    nursed: { args: { program: PROGRAM, name: { type: 'text' } }, label: 'Finished a nursing program' },
    nclex: {
      args: { passed: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } },
      label: 'Sat the nursing licensing exam',
    },
    nremt: {
      args: { passed: { type: 'bool' }, chance: { type: 'int', min: 0, max: 100 } },
      label: 'Sat the national EMT exam',
    },
    billed: {
      args: {
        charge: { type: 'int', min: 0 },
        pell: { type: 'int', min: 0 },
        borrowed: { type: 'int', min: 0 },
        fee: { type: 'int', min: 0 },
        cash: { type: 'int', min: 0 },
        refund: { type: 'int', min: 0 },
      },
      label: 'Paid for a term',
    },
    'loan-due': { args: { cents: { type: 'int', min: 0 }, paid: { type: 'bool' } }, label: 'A loan payment came due' },
    'loan-paid': { args: { cents: { type: 'int', min: 0 } }, label: 'Paid what was behind on the loans' },
    graded: {
      args: { course: { type: 'text' }, grade: { type: 'text' }, score: { type: 'int', min: 0, max: 100 } },
      label: 'Graded',
    },
  },
  actions: {
    study: { run: (ctx, a) => study(ctx, a.subject, a.minutes), options: studyOptions },
    'take-test': { run: (ctx, a) => sit(ctx, a.subject), options: testOptions },
    enroll: { run: (ctx, a) => enroll(ctx, a.courses, a.borrow, a.school, a.evening), options: enrollOptions },
    apply: { run: (ctx) => apply(ctx), options: applyOptions },
    'take-lsat': { run: (ctx) => sitLsat(ctx), options: lsatOptions },
    'apply-law': { run: (ctx) => applyLaw(ctx), options: applyLawOptions },
    'sit-bar': { run: (ctx) => sitBar(ctx), options: barOptions },
    'sit-nremt': { run: (ctx) => sitExam(ctx), options: examOptions },
    'apply-nursing': { run: (ctx, a) => applyNursing(ctx, a.program), options: applyNursingOptions },
    'sit-nclex': { run: (ctx) => sitNclex(ctx), options: nclexOptions },
    'pay-loan': {
      run: (ctx) => payBehind(ctx),
      // Offered only when all of it can be paid, as rent owed is.
      options: (v) =>
        behindOf(v.state) > 0 && (v.fact('economy.amount', { resource: 'cash' }) as number) >= behindOf(v.state)
          ? [{}]
          : [],
    },
    attend: { run: (ctx, a) => attend(ctx, a.course), options: attendOptions },
  },
  effects: {
    // A term's bill, for the page to show before you enroll: the same sum enrolling charges.
    'college-bill': {
      run: () => {},
      preview: (ctx, e) => {
        const which: Which = SCHOOLS.includes(e.school as Which) ? (e.school as Which) : 'college';
        const how = (BORROWING as readonly string[]).includes(String(e.borrow)) ? (e.borrow as Borrow) : 'none';
        const open = schoolOf(ctx as never, which);
        return open ? { ...billFor(ctx as never, which, Number(e.courses), how) } : {};
      },
    },
    'admit-result': (ctx, e) => admitResult(ctx, e.admitted === true, e.chance as number),
    'law-result': (ctx, e) => lawResult(ctx, e.admitted === true, e.chance as number),
    'bar-result': (ctx, e) => barResult(ctx, e.passed === true, e.chance as number),
    'nremt-result': (ctx, e) => examResult(ctx, e.passed === true, e.chance as number),
    'nursing-result': (ctx, e) => nursingResult(ctx, e.program as Program, e.admitted === true, e.chance as number),
    'nclex-result': (ctx, e) => nclexResult(ctx, e.passed === true, e.chance as number),
    // A nursing program's chance of admitting you now, and the licensing exam's: the ones rolled.
    'nursing-odds': {
      run: () => {},
      preview: (ctx, e) => {
        const which = NURSING.find((x) => x === e.program);
        const p = which ? schoolOf(ctx as never, which) : null;
        return { chance: which && p ? nursingChance(ctx as never, which, p as never) : 0 };
      },
    },
    'nclex-odds': {
      run: () => {},
      preview: (ctx) => {
        const n = nclexOf(ctx);
        return { chance: n ? nclexChance(ctx as never, n) : 0 };
      },
    },
    // The national EMT exam's chance now, for the page to show before you sit it: the one rolled.
    'nremt-odds': {
      run: () => {},
      preview: (ctx) => {
        const c = emtOf(ctx);
        return { chance: c ? examChance(ctx as never, c) : 0 };
      },
    },
    // For the page, before you act: the law school's chance, the bar's, and the LSAT score study
    // has earned, about which a sitting falls (its spread in tenths of a point).
    'law-odds': {
      run: () => {},
      preview: (ctx) => {
        const l = lawOf(ctx);
        return { chance: l ? lawChance(ctx as never, l) : 0 };
      },
    },
    'bar-odds': {
      run: () => {},
      preview: (ctx) => {
        const l = lawOf(ctx);
        return { chance: l ? barChance(ctx as never, l) : 0 };
      },
    },
    'lsat-odds': {
      run: () => {},
      preview: (ctx) => {
        const l = lawOf(ctx);
        return l ? { expected: expectedLsat(ctx as never, l), spread: l.lsat.spread } : {};
      },
    },
    // The chance of being admitted now, for the page to show before you apply: the one rolled.
    'admit-odds': {
      run: () => {},
      preview: (ctx) => {
        const u = universityOf(ctx);
        return { chance: u ? admitChance(ctx as never, u) : 0 };
      },
    },
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
      read: ({ state }) => gpaOf(state.college),
      domain: { type: 'int', min: 0, max: 400 },
      label: 'your college grade point average, in hundredths',
    },
    admitted: {
      read: ({ state }) => state.university.admitted,
      domain: { type: 'bool' },
      label: 'admitted to the state university',
    },
    // The university's credits, transfer included, and its average, in hundredths, without them.
    'degree-credits': {
      read: ({ state }) => state.university.credits,
      domain: { type: 'int', min: 0 },
      label: 'university credits earned',
    },
    'degree-gpa': {
      read: ({ state }) => gpaOf(state.university),
      domain: { type: 'int', min: 0, max: 400 },
      label: 'your university grade point average, in hundredths',
    },
    lsat: {
      read: ({ state }) => state.law.lsat,
      domain: { type: 'int', min: -1, max: 180 },
      label: 'your best LSAT score, or -1',
    },
    'law-admitted': {
      read: ({ state }) => state.law.admitted,
      domain: { type: 'bool' },
      label: 'admitted to law school',
    },
    // The EMT course's certificate and the national exam (M4.4): heard by the market's licences.
    'emt-certified': {
      read: (v) => certified(v as never),
      domain: { type: 'bool' },
      label: 'the EMT course’s certificate earned',
    },
    // For the nursing student bot (M4.4 step 5), as a player sees on the School tab.
    'adn-admitted': {
      read: ({ state }) => state.adn.admitted,
      domain: { type: 'bool' },
      label: 'admitted to the college’s nursing program',
    },
    nursing: {
      read: ({ state }) => state.nursing,
      domain: { type: 'enum', values: ['none', ...NURSING] },
      label: 'the nursing program you finished, or none',
    },
    'rn-licensed': {
      read: ({ state }) => state.nclex.licensed,
      domain: { type: 'bool' },
      label: 'licensed as a registered nurse',
    },
    'emt-licensed': {
      read: ({ state }) => state.nremt.licensed,
      domain: { type: 'bool' },
      label: 'licensed as an EMT',
    },
    licensed: {
      read: ({ state }) => state.law.licensed,
      domain: { type: 'bool' },
      label: 'admitted to the bar',
    },
    // And the bar's doors on its day (step 5): what you do ends then too.
    'class-in': {
      read: (v) => {
        const times = [classIn(v), barIn(v)].filter((m): m is number => m !== undefined);
        return times.length > 0 ? Math.min(...times) : undefined;
      },
      domain: { type: 'int', min: 1 },
      label: 'minutes until a class of yours, or the bar exam, starts today',
    },
    // Whether a class meets in a span (M4.4 step 5): what the nursing student bot weighs a shift against.
    'class-during': {
      args: { day: { type: 'int', min: 0 }, minute: { type: 'int', min: 0 }, minutes: { type: 'int', min: 1 } },
      read: (v, { day, minute, minutes }) => classDuring(v, day as number, minute as number, minutes as number),
      domain: { type: 'bool' },
      label: 'a class of yours meets in that span',
    },
    'aid-income': {
      read: (v) => aidIncome(v),
      domain: { type: 'int', min: 0 },
      label: 'your gross pay over the past year, as aid counts it',
    },
    // The federal loans: all owed with interest to date, and payments behind. Discharged at death.
    owed: {
      read: (v) =>
        LOANS.reduce((n, key) => n + owedNow(v.state[key], termsOf(v, key), v.fact('time.day') as number), 0),
      domain: { type: 'int', min: 0 },
      label: 'owed on student loans',
    },
    behind: {
      read: ({ state }) => behindOf(state),
      domain: { type: 'int', min: 0 },
      label: 'student loan payments behind',
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
    // Pay, kept for a year for aid.
    'job/paid': (ctx, event) => {
      const today = ctx.fact('time.day') as number;
      const kept = ctx.read().pay.filter((p) => p.day > today - 365);
      ctx.write().pay = [...kept, { day: today, gross: event.gross as number }];
    },
    // The 1st of the month: a loan payment, with the rent (loans.ts).
    'home/rent': (ctx) => month(ctx),
    // An heir finished their own schooling (M2.7 step 3): drawn as anyone's is. The loans die with
    // the one who took them: federal loans are discharged at death (D113, amended).
    'lives/succeeded': (ctx) => {
      Object.assign(ctx.write(), FRESH(drawn(ctx)));
    },
  },
});
