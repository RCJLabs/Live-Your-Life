/** The education record (packages/content/types/education.json, M2.8): one, Michigan's. */
import type { RecordStore } from '@eb/core';

export const EDUCATION = 'michigan';

export interface GedSubject {
  readonly id: string;
  readonly name: string;
  readonly minutes: number;
  /** In 100 who sit it, those who pass with no study of their own here. */
  readonly pass: number;
}

export interface College {
  readonly name: string;
  readonly terms: readonly {
    readonly id: string;
    readonly month: number;
    readonly day: number;
    readonly weeks: number;
  }[];
  /** Days before a term starts that enrolling opens. */
  readonly enroll: number;
  readonly courses: readonly { readonly id: string; readonly name: string; readonly credits: number }[];
  readonly slots: readonly { readonly days: readonly string[]; readonly hour: number; readonly minutes: number }[];
  /** Hours of study a week, for each credit, that a full grade asks. */
  readonly study: number;
  readonly grades: readonly { readonly letter: string; readonly least: number; readonly points: number }[];
  readonly associate: number;
  /** The least grade point average for the associate's, in hundredths. */
  readonly gpa: number;
  /** Grade points at or under which a course may be retaken (step 8); absent, none may. */
  readonly retake?: number;
}

/**
 * The EMT course at the community college (M4.4 step 1, D163): a term's courses taken together,
 * graded as the college's, the certificate at its credits, then the national exam.
 */
export interface EmtCourse extends Omit<College, 'associate' | 'retake'> {
  readonly certificate: number;
  readonly exam: {
    readonly price: number;
    readonly minutes: number;
    readonly first: number;
    readonly repeat: number;
    readonly wait: number;
  };
  readonly retake?: undefined;
}

/**
 * The public university (M4.2 step 1, D149): its terms, courses and grades as the college's, with
 * the bachelor's at `degree` credits, its own price, and admission at odds.
 */
export interface University extends Omit<College, 'associate'> {
  readonly degree: number;
  /** Evening sections (D152): when a term's courses meet if taken by evening; absent, none. */
  readonly evening?: College['slots'];
  /** The most college credits it takes in transfer. */
  readonly transfer: number;
  /** In cents: a credit, a credit once `after` credits are earned, and the term's fee. */
  readonly price: {
    readonly perCredit: number;
    readonly upper: { readonly after: number; readonly perCredit: number };
    readonly termFee: number;
  };
  /**
   * In 100 who apply, those admitted: from high school, from a GED, and in transfer at the least
   * college average (hundredths); less for a conviction and a felony on the record; and the days
   * before you can apply again.
   */
  readonly admit: {
    readonly diploma: number;
    readonly ged: number;
    readonly transfer: number;
    readonly gpa: number;
    readonly conviction: number;
    readonly felony: number;
    readonly wait: number;
  };
}

/**
 * The law school (M4.2 step 2, D149, D150): terms, courses and grades as the university's, the JD
 * at `degree` credits; the LSAT, admission at odds from it and the university's average, its own
 * loans, and the bar exam.
 */
export interface LawSchool extends Omit<University, 'transfer' | 'admit'> {
  readonly admit: {
    readonly at: number;
    readonly lsat: number;
    readonly perPoint: number;
    readonly gpa: number;
    readonly perTenth: number;
    readonly most: number;
    readonly conviction: number;
    readonly felony: number;
    readonly wait: number;
  };
  readonly lsat: {
    readonly price: number;
    readonly minutes: number;
    readonly mean: number;
    /** Tenths of a point a standard deviation. */
    readonly spread: number;
    readonly perHour: number;
    readonly most: number;
    readonly wait: number;
  };
  readonly loans: { readonly rate: number; readonly fee: number; readonly year: number };
  readonly bar: {
    readonly days: readonly { readonly month: number; readonly day: number }[];
    readonly price: number;
    readonly again: number;
    readonly minutes: number;
    readonly first: number;
    readonly repeat: number;
    readonly hours: number;
    readonly least: number;
  };
}

/** Paying for the college (step 4, D113), in cents unless said. */
export interface Aid {
  readonly tuition: number;
  readonly hourFee: number;
  readonly termFee: number;
  readonly pell: {
    readonly most: number;
    readonly least: number;
    readonly line: number;
    readonly full: number;
    readonly none: number;
    readonly fullTime: number;
  };
  readonly loans: {
    /** Hundredths of a percent a year. */
    readonly rate: number;
    /** Thousandths of a percent of what is borrowed. */
    readonly fee: number;
    readonly half: number;
    readonly limits: readonly { readonly credits: number; readonly year: number }[];
    readonly grace: number;
    readonly months: number;
    readonly leastMonth: number;
  };
}

export interface EducationRecord {
  readonly name: string;
  /** In 10,000 eighteen-year-olds, those with a high school diploma. */
  readonly diploma: number;
  readonly ged: {
    readonly subjects: readonly GedSubject[];
    readonly price: number;
    readonly opens: number;
    readonly closes: number;
    readonly perHour: number;
    readonly most: number;
  };
  /** The community college (step 3); absent in a pack from before it. */
  readonly college?: College;
  /** The EMT course (M4.4); absent in a pack from before it. */
  readonly emt?: EmtCourse;
  /** The university (M4.2); absent in a pack from before it. */
  readonly university?: University;
  /** The law school (M4.2 step 2); absent in a pack from before it. */
  readonly law?: LawSchool;
  /** Paying for it (step 4); absent in a pack from before it, when a term is free. */
  readonly aid?: Aid;
}

/** The record, or null in a pack from before it. */
export const educationOf = (store: RecordStore): EducationRecord | null =>
  store.get<EducationRecord>('education', EDUCATION) ?? null;
