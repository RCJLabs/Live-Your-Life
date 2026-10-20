/**
 * When the alarm goes off (D57, D60): a walk's time before a shift, the page drops the clock to
 * 1×, once for each shift, so the walk to the diner happens at a pace a player can follow. At 4×
 * a real second is 8 game minutes, and the browser bot, tapping as fast as it could, was still a
 * few minutes late to every shift (ROADMAP open question 53).
 */
import { ALARM_MINUTES } from '@lyl/sim';
import type { Life } from './session.ts';

/** The tick of the shift whose alarm is going off now, out in the world; null if none is. */
export function alarmFor(life: Life): number | null {
  if (life.mode.id !== 'world') return null;
  const next = life.fact('job.next-shift-in') as number | undefined;
  if (next === undefined || next > ALARM_MINUTES) return null;
  return (life.fact('time.tick') as number) + next;
}

export const ALARM_LINE = 'It’s time to walk to the diner. The clock is back to 1×.';
