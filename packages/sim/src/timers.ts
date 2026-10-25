/**
 * The life's daily timer (M0.2): each midnight, the job's postings and payday (job/shifts.ts), the
 * coworker's asks (ties/favours.ts), then heat, warrants and probation (law/police.ts). Set at the
 * start (game.ts), and set again after a ward's years (lives/, D108), which pass with it stopped.
 */
import type { ScheduleSpec } from '@eb/core';

export const MIDNIGHT_TIMER = 'midnight';

/** The midnight timer, first due in `minutes`. */
export const midnightTimer = (minutes: number): ScheduleSpec => ({
  timer: MIDNIGHT_TIMER,
  after: { minutes },
  every: { days: 1 },
  effects: [{ effect: 'job-day' }, { effect: 'ties-day' }, { effect: 'law-day' }],
});
