/**
 * Corners and the crews who hold them (M4.1 step 2, D148). Each corner, yours on your block and the
 * one each of your crew works, is held by a rival crew or open, worked out from the seed for each
 * four-week stretch, so corners change hands without anything stored. Selling on a held corner
 * brings a warning, then another; after them, trouble: run off it for days (step 3 makes trouble
 * violent at odds). Warnings start over when the stretch turns.
 */
import type { DeepReadonly } from '@eb/core';
import { mix } from '../people/roster.ts';
import { tradeOf } from './records.ts';
import type { DealContext, DealView } from './state.ts';
import { sliceOf } from './state.ts';
import { beatenAt } from './violence.ts';

/** Days a holder keeps a corner before it may change hands (tune). */
export const STRETCH = 28;
/** Your own corner's key; a member's is their person number plus one. */
export const YOURS = 0;
const SALT = 7177;

export interface Standing {
  /** Warnings this stretch. */
  warned: number;
  /** The stretch they were counted in, or -1. */
  stretch: number;
  /** The day you are run off until, or -1. */
  off: number;
}

export const noStanding = (): Standing => ({ warned: 0, stretch: -1, off: -1 });

const stretchOf = (v: DealView): number => Math.floor((v.fact('time.day') as number) / STRETCH);
const traded = (v: DealView): boolean => v.content.has('trade', 'cocaine');

/** Who holds a corner this stretch: a tier-1 person who heads a rival crew, -2 for one nobody you could know heads, or -1 for open. */
export function holder(v: DealView, key: number): number {
  if (!traded(v)) return -1;
  const seed = (v.fact('people.seed') as number | undefined) ?? 0;
  const h = mix(seed, SALT, key, stretchOf(v));
  if (h % 100 >= tradeOf(v.content).rivals.held) return -1;
  const n = (v.fact('people.count') as number | undefined) ?? 0;
  if (n === 0) return -2;
  const head = mix(h, 31) % n;
  // Convicted on an agent's case (M4.3 step 3, D159), they hold nothing while they are away.
  return v.fact('federal.away', { person: head }) === true ? -1 : head;
}

/** The rival crew, as the journal names it: by whoever heads it. */
export const rivalName = (v: DealView, who: number): string =>
  who >= 0 ? `${v.fact('circle.name', { person: who }) as string}’s crew` : 'another crew';

/** Warnings left before trouble on a corner, this stretch. */
export function warningsLeft(v: DealView, s: DeepReadonly<Standing>): number {
  const n = tradeOf(v.content).rivals.warnings;
  return s.stretch === stretchOf(v) ? Math.max(0, n - s.warned) : n;
}

export const runOff = (v: DealView, s: DeepReadonly<Standing>): boolean => s.off > (v.fact('time.day') as number);

/**
 * An hour or a night on a held corner, as its holder sees it: a warning while some are left,
 * then trouble. True if whoever was selling was run off and sells nothing.
 */
export function noticed(ctx: DealContext, s: Standing, person: number, key: number): boolean {
  const who = holder(ctx, key);
  if (who === -1) return false;
  const r = tradeOf(ctx.content).rivals;
  const stretch = stretchOf(ctx);
  if (s.stretch !== stretch) {
    s.stretch = stretch;
    s.warned = 0;
  }
  s.warned += 1;
  const rival = rivalName(ctx, who);
  const yours = person < 0;
  const name = yours ? '' : (ctx.fact('circle.name', { person }) as string);
  if (s.warned <= r.warnings) {
    ctx.emit('warned', { person, yours, name, rival, left: r.warnings - s.warned });
    return false;
  }
  s.off = (ctx.fact('time.day') as number) + r.off;
  ctx.emit('run-off', { person, yours, name, rival, days: r.off });
  // Run off you may be beaten as well (D146); one of your crew's hurts are theirs, not yours to carry.
  if (yours) ctx.apply(beatenAt(tradeOf(ctx.content).violence.trouble, 'rivals'));
  return true;
}

/** Your corner's holder and your warnings left, for the page and the preview. */
export const yourCorner = (v: DealView) => ({
  holder: holder(v, YOURS),
  left: warningsLeft(v, sliceOf(v).rival),
});
