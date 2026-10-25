/**
 * The family module's slice (M2.6 step 4): a pregnancy you're part of, the children born to you,
 * and what a birth left owed. Who a child is (name, pronouns, body) is drawn once, at birth.
 */
import type { DeepReadonly, RecordStore } from '@eb/core';
import type { Pronouns } from '../ties/records.ts';

/** You, where a person's number would be. */
export const YOU = -1;

export interface Pregnancy {
  /** Who carries: YOU, or the partner's number. */
  readonly carrier: number;
  /** The other parent: the partner's number, or YOU. */
  readonly other: number;
  readonly conceived: number;
  known: boolean;
  /** The carrier's choice once it's known: still open, or to go on (D97). */
  choice: 'open' | 'continue';
  /** The day it is lost, or -1: rolled when it's known. */
  loss: number;
  readonly due: number;
}

export interface Child {
  readonly born: number;
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
  readonly carries: boolean;
  /** The other parent's number. */
  readonly other: number;
  /** Who they live with: you, or the other parent. */
  with: 'you' | 'them';
}

export interface FamilySlice {
  pregnancy: Pregnancy | null;
  children: Child[];
  /** Cents a birth or daycare cost that couldn't be paid. */
  owed: number;
  settled: number;
  /** Minutes of care given on a day (D98): today's, until the day is settled. */
  care: { day: number; minutes: number };
  /** Days your children went without enough care, within the record's window. */
  missed: number[];
  /** A report to child protective services, open until its investigation closes. */
  report: { made: number; closes: number } | null;
  /** Investigations that found the care wanting. */
  findings: number;
  /** The last day daycare was paid for. */
  daycare: number;
}

export const noFamily = (): FamilySlice => ({
  pregnancy: null,
  children: [],
  owed: 0,
  settled: 0,
  care: { day: -1, minutes: 0 },
  missed: [],
  report: null,
  findings: 0,
  daycare: -1,
});

/** Version 2 (M2.6 step 4b): a child's care. What was there stays. */
export const migrateFamily2 = (slice: unknown): FamilySlice => ({
  ...noFamily(),
  ...(slice as Partial<FamilySlice>),
});

/** Anything that reads the family: a fact's view, a module's context or a preview's. */
export type FamilyView = {
  readonly content: RecordStore;
  fact(id: string, args?: Readonly<Record<string, unknown>>): unknown;
} & ({ readonly state: DeepReadonly<FamilySlice> } | { read(): DeepReadonly<FamilySlice> });

export const familyOf = (v: FamilyView): DeepReadonly<FamilySlice> => ('state' in v ? v.state : v.read());
