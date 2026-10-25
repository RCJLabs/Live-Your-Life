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
}

/** The record, or null in a pack from before it. */
export const educationOf = (store: RecordStore): EducationRecord | null =>
  store.get<EducationRecord>('education', EDUCATION) ?? null;
