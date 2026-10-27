/** The agency record (packages/content/types/agency.json, M4.3): one, the federal bureau. */
import type { RecordStore } from '@eb/core';

export const AGENCY = 'bureau';

export interface Agency {
  readonly name: string;
  readonly requires: {
    readonly least: number;
    readonly most: number;
    readonly careers: readonly string[];
    readonly minutes: number;
    readonly advanced: number;
  };
  readonly written: {
    readonly minutes: number;
    readonly pass: number;
    readonly perHour: number;
    readonly most: number;
    readonly wait: number;
  };
  readonly fitness: {
    readonly minutes: number;
    readonly least: number;
    readonly full: number;
    readonly hours: number;
    readonly wait: number;
  };
  readonly interview: { readonly minutes: number; readonly pass: number; readonly wait: number };
  readonly background: { readonly pass: number; readonly conviction: number; readonly wait: number };
  readonly again: number;
  /** The Academy's career, whose ladder leads to the agent's (D157). */
  readonly trainee: string;
}

/** The record, or null in a pack from before it. */
export const agencyOf = (store: RecordStore): Agency | null => store.get<Agency>('agency', AGENCY) ?? null;
