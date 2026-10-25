/** The education record (packages/content/types/education.json, M2.8): one, Michigan's. */
import type { RecordStore } from '@eb/core';

export const EDUCATION = 'michigan';

export interface EducationRecord {
  readonly name: string;
  /** In 10,000 eighteen-year-olds, those with a high school diploma. */
  readonly diploma: number;
  readonly ged: { readonly subjects: number; readonly price: number };
}

/** The record, or null in a pack from before it. */
export const educationOf = (store: RecordStore): EducationRecord | null =>
  store.get<EducationRecord>('education', EDUCATION) ?? null;
