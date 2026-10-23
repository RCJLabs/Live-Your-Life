/**
 * Tier-1 people's templates for the population harness (M0.4, risk 2): the shifts people work,
 * how they sleep, who lives together and how many share a workplace or a bar. Data only, and
 * every number (tune): M2.2's people replace these with careers and households from content.
 */

/** A shift: when it starts, how long, on which weekdays (0 is Monday). `null` works no shift. */
export interface ShiftTemplate {
  readonly id: string;
  /** Out of the weights' total: how many people work it. */
  readonly weight: number;
  readonly start: number;
  readonly minutes: number;
  readonly days: readonly number[];
}

export const SHIFTS: readonly ShiftTemplate[] = [
  { id: 'days', weight: 45, start: 9 * 60, minutes: 8 * 60, days: [0, 1, 2, 3, 4] },
  { id: 'lates', weight: 14, start: 15 * 60, minutes: 8 * 60, days: [1, 2, 3, 4, 5] },
  { id: 'nights', weight: 7, start: 23 * 60, minutes: 8 * 60, days: [6, 0, 1, 2, 3] },
  { id: 'none', weight: 34, start: 0, minutes: 0, days: [] },
];

/**
 * Bedtime between these minutes of the day (past midnight counts on), and hours of sleep. Not
 * fewer than 7: the needs' rates (needs.ts) give back 12.5% of rest an hour asleep and take 5% an
 * hour awake, so six hours a night loses 15% of rest a day even off work, and rest never recovers.
 */
export const SLEEP = {
  bedtime: [22 * 60, 24 * 60 + 60] as const,
  hours: [7, 9] as const,
} as const;

/** People to a household, drawn from this list: most live with someone. */
export const HOUSEHOLD = [1, 1, 2, 2, 2, 3, 3, 4] as const;

/** How many people share a workplace, and a third place (a bar, a gym, a church hall). */
export const SHARED = { workplace: 12, thirdPlace: 30 } as const;

/** Ties kept per person, and new meetings a person makes in an hour at a shared place. */
export const TIES = { cap: 12, perHour: 2 } as const;
