/**
 * Starting and leaving a job (M2.3, D74). The market module hires you (`hire`, an effect, when you
 * take an offer); you leave by quitting. A new job starts as the slice's first did: standing at
 * the career's start and this week's shifts posted from tomorrow. What the old job owes is paid
 * first, at its own wage, as the final paycheck Michigan's employers owe. Skill is the career's:
 * practice carries over only into the same career.
 */
import type { Action, FactView } from '@eb/core';
import { daysAtHire, post, todayOf } from './days.ts';
import { payday } from './pay.ts';
import { careerOf } from './records.ts';
import { type JobContext, type JobSlice, timerFor } from './state.ts';

/** The job ends without a word against you: every shift signed up for is dropped. */
function leave(ctx: JobContext): void {
  const slice = ctx.write();
  for (const s of slice.signed) {
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'event') });
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'over') });
  }
  slice.signed = [];
  slice.posted = [];
  slice.employed = false;
}

export function hire(ctx: JobContext, careerId: string): void {
  const career = careerOf(ctx.content, careerId);
  const was = ctx.read();
  if (was.employed) leave(ctx);
  if (was.unpaid > 0) payday(ctx);
  const today = todayOf(ctx);
  const standing = career.standing.start;
  const posted = post(career, ctx.rng('postings'), today, daysAtHire(career, today), standing);
  const w = ctx.write();
  w.practice = was.career === careerId ? was.practice : 0;
  w.career = careerId;
  w.employed = true;
  w.standing = standing;
  w.posted = posted;
  w.signed = [];
  w.warnings = [];
  w.drawn = [];
  ctx.emit('hired', { career: careerId });
}

export const quit = {
  run(ctx: JobContext, _action: Action) {
    if (!ctx.read().employed) return ctx.refuse('no-job');
    leave(ctx);
    ctx.emit('quit', {});
  },
  // Bots aren't offered it: they keep their jobs, or look for work only once let go (bot.ts).
  options: (_view: FactView<JobSlice>) => [],
};
