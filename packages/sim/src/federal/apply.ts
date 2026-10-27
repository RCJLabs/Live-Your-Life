/**
 * A special agent's application (M4.3 step 1, D154), in stages. With a bachelor's, the age and two
 * years of professional work (one with a JD), and no felony, you apply. Then the written test,
 * sat on or after its day, at a chance raised by the hours you studied for it; the fitness test,
 * at a chance raised by the hours you trained; the interview; and the polygraph and background
 * investigation, which take their weeks and weigh a conviction. Each chance is shown first and
 * rolled as shown. Failing a stage ends the application; you can apply again after the record's
 * days. Passing all four clears you for the Academy (academy.ts).
 */
import type { FactView, ModuleContext } from '@eb/core';
import { type Agency, agencyOf } from './records.ts';

/** After the background: cleared, then at the Academy once reported, then sworn in as an agent (academy.ts). */
export const STAGES = ['none', 'written', 'fitness', 'interview', 'background', 'cleared', 'academy', 'sworn'] as const;
export type Stage = (typeof STAGES)[number];
/** The stages that are sat, as an action; the background is waited out. */
export const SAT = ['written', 'fitness', 'interview'] as const;

export interface FederalSlice {
  stage: Stage;
  /** The day the current stage can be sat, or is decided; -1 before applying. */
  due: number;
  /** The day an application last ended in a refusal, or -1. */
  refused: number;
  /** Minutes studied for the written test and trained for the fitness test. */
  study: number;
  training: number;
  /** Applications made. */
  tries: number;
}

export const NO_APPLICATION = (): FederalSlice => ({
  stage: 'none',
  due: -1,
  refused: -1,
  study: 0,
  training: 0,
  tries: 0,
});

type Ctx = ModuleContext<FederalSlice>;
type View = FactView<FederalSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());
const today = (v: View) => v.fact('time.day') as number;

/** Minutes worked in the careers the record counts as professional. */
export function professional(v: View, a: Agency): number {
  return a.requires.careers.reduce((n, c) => n + ((v.fact('job.worked', { career: c }) as number | undefined) ?? 0), 0);
}

/** Why you can't apply now, or null. */
export function applyProblem(v: View, a: Agency): string | null {
  const s = slice(v);
  if (s.stage !== 'none') return 'applying';
  if (s.refused >= 0 && today(v) - s.refused < a.again) return 'too-soon';
  const finished = v.fact('education.finished') as string;
  if (finished !== 'bachelor' && finished !== 'jd') return 'bachelor';
  const age = v.fact('circle.your-age') as number;
  if (age < a.requires.least || age > a.requires.most) return 'age';
  const needed = finished === 'jd' ? a.requires.advanced : a.requires.minutes;
  if (professional(v, a) < needed) return 'experience';
  if (((v.fact('law.felonies') as number | undefined) ?? 0) > 0) return 'felony';
  return null;
}

export function applyOptions(v: View): Record<string, never>[] {
  const a = agencyOf(v.content);
  return a && applyProblem(v, a) === null ? [{}] : [];
}

export function apply(ctx: Ctx): void {
  const a = agencyOf(ctx.content);
  const problem = a ? applyProblem(ctx, a) : 'no-agency';
  if (problem) ctx.refuse(problem);
  const w = ctx.write();
  Object.assign(w, { stage: 'written', due: today(ctx) + (a as Agency).written.wait, study: 0, training: 0 });
  w.tries += 1;
  ctx.emit('applied', { due: w.due });
}

/** In 100, the chance of passing the stage you are at now; 0 where there is none. */
export function stageChance(v: View, a: Agency): number {
  const s = slice(v);
  if (s.stage === 'written')
    return Math.min(a.written.most, a.written.pass + Math.floor(s.study / 60) * a.written.perHour);
  if (s.stage === 'fitness') {
    const asked = a.fitness.hours * 60;
    return a.fitness.least + Math.floor(((a.fitness.full - a.fitness.least) * Math.min(asked, s.training)) / asked);
  }
  if (s.stage === 'interview') return a.interview.pass;
  if (s.stage === 'background') {
    const convicted = ((v.fact('law.convictions') as number | undefined) ?? 0) > 0;
    return Math.max(0, a.background.pass - (convicted ? a.background.conviction : 0));
  }
  return 0;
}

/** Sitting the stage you are at: on or after its day, 08:00 to 17:00. */
export function sitOptions(v: View): Record<string, never>[] {
  const s = slice(v);
  const minute = v.fact('time.of-day') as number;
  const sat = (SAT as readonly string[]).includes(s.stage);
  return agencyOf(v.content) && sat && today(v) >= s.due && minute >= 8 * 60 && minute < 17 * 60 ? [{}] : [];
}

export function sit(ctx: Ctx): void {
  const a = agencyOf(ctx.content);
  if (!a || sitOptions(ctx).length === 0) ctx.refuse('no-stage');
  const stage = ctx.read().stage as (typeof SAT)[number];
  ctx.apply({ effect: 'wait', minutes: (a as Agency)[stage].minutes });
  roll(ctx, a as Agency);
}

/** The stage's outcome rolled at the chance shown. */
function roll(ctx: Ctx, a: Agency): void {
  const chance = stageChance(ctx, a);
  const stage = ctx.read().stage;
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [{ effect: 'stage-result', stage, passed: true, chance }] },
      { chance: 100 - chance, effects: [{ effect: 'stage-result', stage, passed: false, chance }] },
    ],
  });
}

/** The background is decided on its day, at the turn of the day. */
export function decide(ctx: Ctx): void {
  const a = agencyOf(ctx.content);
  const s = ctx.read();
  if (a && s.stage === 'background' && today(ctx) >= s.due) roll(ctx, a);
}

const NEXT: Readonly<Record<string, Stage>> = {
  written: 'fitness',
  fitness: 'interview',
  interview: 'background',
  background: 'cleared',
};

export function result(ctx: Ctx, stage: string, passed: boolean, chance: number): void {
  const a = agencyOf(ctx.content) as Agency;
  ctx.emit(passed ? 'passed' : 'failed', { stage, chance });
  const w = ctx.write();
  if (!passed) {
    Object.assign(w, { stage: 'none', due: -1, refused: today(ctx) });
    return;
  }
  const next = NEXT[stage] as Stage;
  w.stage = next;
  w.due = next === 'cleared' ? -1 : today(ctx) + a[next as 'fitness' | 'interview' | 'background'].wait;
  if (next === 'cleared') ctx.emit('cleared', {});
}

/** Preparing: study for the written test before it is sat, training for the fitness test before it is. */
export function prepareOptions(v: View): { for: 'written' | 'fitness'; minutes: number }[] {
  const s = slice(v);
  if (!agencyOf(v.content)) return [];
  // Training can start as soon as you apply, while the written test is still ahead.
  if (s.stage === 'written')
    return [
      { for: 'written', minutes: 60 },
      { for: 'fitness', minutes: 60 },
    ];
  if (s.stage === 'fitness') return [{ for: 'fitness', minutes: 60 }];
  return [];
}

export function prepare(ctx: Ctx, what: unknown, minutes: unknown): void {
  const offered = prepareOptions(ctx).some((o) => o.for === what && o.minutes === minutes);
  if (!offered) ctx.refuse('no-preparing');
  const w = ctx.write();
  if (what === 'written') w.study += minutes as number;
  else w.training += minutes as number;
  ctx.apply({ effect: 'wait', minutes: minutes as number });
  ctx.emit('prepared', { for: what as string, minutes: minutes as number });
}
