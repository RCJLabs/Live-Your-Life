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
}

/** The record, or null in a pack from before it. */
export const educationOf = (store: RecordStore): EducationRecord | null =>
  store.get<EducationRecord>('education', EDUCATION) ?? null;
