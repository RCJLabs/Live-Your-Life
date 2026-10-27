/**
 * The Academy (M4.3 step 2, D157): cleared, you report, and the job module takes you on as the
 * agency's trainee, a career like the police recruit's, worked on weekdays in the city. Its
 * ladder makes you a special agent once its weeks are worked in good standing, and the agent's
 * ranks climb the grades the same way (D158). Leaving the Academy any way but up ends the
 * application, as a refusal does.
 */
import type { Beat, FactView, ModuleContext } from '@eb/core';
import { careerOf } from '../job/records.ts';
import type { FederalSlice } from './apply.ts';
import { agencyOf } from './records.ts';

type Ctx = ModuleContext<FederalSlice>;
type View = FactView<FederalSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());

/** Reporting to the Academy: once cleared, 08:00 to 17:00. */
export function reportOptions(v: View): Record<string, never>[] {
  const minute = v.fact('time.of-day') as number;
  const open = minute >= 8 * 60 && minute < 17 * 60;
  return agencyOf(v.content) && slice(v).stage === 'cleared' && open ? [{}] : [];
}

export function report(ctx: Ctx): void {
  const a = agencyOf(ctx.content);
  if (!a || reportOptions(ctx).length === 0) return void ctx.refuse('not-cleared');
  ctx.write().stage = 'academy';
  ctx.apply({ effect: 'hire', career: a.trainee });
  // Heard by the market: the field office is where you work now.
  ctx.emit('reported', { career: a.trainee });
}

/** A job taken while at the Academy: the agent's first rank swears you in; any other ends it. */
export function hired(ctx: Ctx, beat: Beat): void {
  const a = agencyOf(ctx.content);
  if (!a || ctx.read().stage !== 'academy' || beat.career === a.trainee) return;
  if (beat.career === careerOf(ctx.content, a.trainee).ladder?.next) ctx.write().stage = 'sworn';
  else left(ctx);
}

/** Let go from the Academy, or quitting it: the application is over, and a new one waits its days. */
export function left(ctx: Ctx): void {
  if (ctx.read().stage !== 'academy') return;
  Object.assign(ctx.write(), { stage: 'none', due: -1, refused: ctx.fact('time.day') as number });
}
