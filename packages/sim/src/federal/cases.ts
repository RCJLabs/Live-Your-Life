/**
 * An agent's cases (M4.3 step 3, D159): one at a time, against the crime the city has. A rival
 * crew's head, who holds a corner this stretch, or the supplier's crew. The work adds evidence (the
 * shift events' `evidence`, heard as `job/evidence`); with enough, you ask for an indictment, its
 * chance the evidence up to the record's most, shown first and rolled as shown. Convicted, the
 * head is away for the sentence and their corner is open; the supplier's crew away, nobody sells
 * to you. What is away belongs to the city, so an heir finds it as it was left.
 */
import type { Beat, FactView, ModuleContext } from '@eb/core';
import { holder } from '../deal/rivals.ts';
import type { DealView } from '../deal/state.ts';
import { careerOf } from '../job/records.ts';
import { type FederalSlice, NO_APPLICATION } from './apply.ts';
import { type Agency, agencyOf } from './records.ts';

export type Target = 'crew' | 'supplier';
export const TARGETS = ['crew', 'supplier'] as const;
/** The supplier's crew has no one tier-1 head: its case names nobody. */
export const NOBODY = -1;

export interface Case {
  target: Target;
  /** The crew's head, or NOBODY for the supplier's crew. */
  person: number;
  opened: number;
  /** 0 to 100. */
  evidence: number;
}

export interface Away {
  readonly person: number;
  /** The day they are out. */
  readonly until: number;
}

type Ctx = ModuleContext<FederalSlice>;
type View = FactView<FederalSlice> | Ctx;
const slice = (v: View) => ('state' in v ? v.state : v.read());
const today = (v: View) => v.fact('time.day') as number;
const traded = (v: View) => v.content.has('trade', 'cocaine');

/** The careers an agent holds: the trainee's ladder past the Academy. */
export function ranks(v: Pick<View, 'content'>, a: Agency): string[] {
  const out: string[] = [];
  let next = careerOf(v.content, a.trainee).ladder?.next;
  while (next && !out.includes(next)) {
    out.push(next);
    next = careerOf(v.content, next).ladder?.next;
  }
  return out;
}

export const isAway = (v: View, person: number): boolean =>
  slice(v).away.some((x) => x.person === person && x.until > today(v));
export const supplierDown = (v: View): boolean => slice(v).down > today(v);

/** The name a line gives the target. */
export function targetName(v: View, target: Target, person: number): string {
  return target === 'supplier' ? 'the supplier’s crew' : `${v.fact('circle.name', { person }) as string}’s crew`;
}

/** Why no case can be opened now, or null. */
export function caseProblem(v: View, a: Agency): string | null {
  const s = slice(v);
  if (s.stage !== 'sworn') return 'not-an-agent';
  if (v.fact('job.employed') !== true || !ranks(v, a).includes(v.fact('job.career') as string)) return 'not-an-agent';
  if (s.case) return 'case-open';
  // Anyone who has bought or sold in the trade is a witness to it, not its investigator.
  if (traded(v) && ((v.fact('deal.sales') as number) > 0 || (v.fact('deal.trust') as number) > 0)) return 'recused';
  return null;
}

/** The targets open to a case: each crew head holding a corner, and the supplier's crew. */
export function openOptions(v: View): { target: Target; person: number }[] {
  const a = agencyOf(v.content);
  if (!a || !traded(v) || caseProblem(v, a)) return [];
  const heads = new Set<number>();
  for (let k = 0; k < a.cases.corners; k++) {
    const p = holder(v as unknown as DealView, k);
    if (p >= 0) heads.add(p);
  }
  const out = [...heads].sort((x, y) => x - y).map((person) => ({ target: 'crew' as Target, person }));
  return supplierDown(v) ? out : [...out, { target: 'supplier', person: NOBODY }];
}

export function open(ctx: Ctx, target: unknown, person: unknown): void {
  const offered = openOptions(ctx).some((o) => o.target === target && o.person === person);
  if (!offered) return void ctx.refuse('no-case');
  const c: Case = { target: target as Target, person: person as number, opened: today(ctx), evidence: 0 };
  ctx.write().case = c;
  ctx.emit('opened', { target: c.target, name: targetName(ctx, c.target, c.person) });
}

/** Evidence from the work, to the open case, up to 100. */
export function addEvidence(ctx: Ctx, beat: Beat): void {
  const c = ctx.read().case;
  if (!c) return;
  ctx.write().case = { ...c, evidence: Math.min(100, c.evidence + (beat.points as number)) };
}

/** In 100, the chance an indictment holds: the evidence, up to the record's most; 0 with no case. */
export function indictChance(v: View, a: Agency): number {
  const c = slice(v).case;
  return c ? Math.min(a.cases.most, c.evidence) : 0;
}

/** Asking for an indictment: with the evidence the record asks, 08:00 to 17:00. */
export function indictOptions(v: View): Record<string, never>[] {
  const a = agencyOf(v.content);
  const c = slice(v).case;
  const minute = v.fact('time.of-day') as number;
  const open = minute >= 8 * 60 && minute < 17 * 60;
  return a && c && c.evidence >= a.cases.least && open ? [{}] : [];
}

export function indict(ctx: Ctx): void {
  const a = agencyOf(ctx.content);
  if (!a || indictOptions(ctx).length === 0) return void ctx.refuse('no-indictment');
  const chance = indictChance(ctx, a);
  const effect = (held: boolean) => ({ effect: 'case-result', held, chance });
  ctx.apply({
    effect: 'roll',
    outcomes: [
      { chance, effects: [effect(true)] },
      { chance: 100 - chance, effects: [effect(false)] },
    ],
  });
}

/** The case decided: convicted and away for the sentence, or declined. Either way it is closed. */
export function caseResult(ctx: Ctx, held: boolean, chance: number): void {
  const a = agencyOf(ctx.content) as Agency;
  const c = ctx.read().case as Case;
  const name = targetName(ctx, c.target, c.person);
  const w = ctx.write();
  w.case = null;
  if (!held) return void ctx.emit('declined', { target: c.target, name, chance });
  const days = a.cases[c.target].sentence;
  if (c.target === 'supplier') w.down = today(ctx) + days;
  else w.away = [...w.away.filter((x) => x.person !== c.person), { person: c.person, until: today(ctx) + days }];
  ctx.emit('convicted', { target: c.target, name, chance, years: Math.round(days / 365) });
}

/** At the turn of the day, sentences served are let out of the slice. */
export function release(ctx: Ctx): void {
  const s = ctx.read();
  if (s.away.some((x) => x.until <= today(ctx))) ctx.write().away = s.away.filter((x) => x.until > today(ctx));
}

/** An heir's application and cases are their own, none yet; who is away on the last life's cases stays away. */
export function succeeded(ctx: Pick<Ctx, 'read' | 'write'>): void {
  const { away, down } = ctx.read();
  Object.assign(ctx.write(), { ...NO_APPLICATION(), away: [...away], down });
}
