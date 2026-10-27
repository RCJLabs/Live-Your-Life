/**
 * The deal module's slice (D78): what you hold, the police's attention, your sales, and what was
 * seen of them, the start of a case file (step 2 builds the case on it). Heat fades by the day,
 * worked out when it is read from the day it was last set, so no midnight timer is needed and a
 * save from before the trade starts without one.
 */
import type { DeepReadonly, FactView, ModuleContext, PreviewContext } from '@eb/core';
import type { Fence } from '../law/fence.ts';
import { TRADE, tradeOf } from './records.ts';

/** A sale someone saw and could tell of. */
export interface Sighting {
  readonly day: number;
  readonly hour: number;
  /** Tenths of a gram. */
  readonly grams: number;
  /** The people passing the corner then. */
  readonly passing: number;
}

export interface DealSlice {
  /** Whom you buy from, drawn from the seed as the fence is; null in a world without the trade. */
  supplier: Fence | null;
  /** What you hold, in tenths of a gram. */
  held: number;
  /** The police's attention to you, as of the start of `asOf`. */
  heat: number;
  asOf: number;
  sales: number;
  /** Cents taken in sales, all told. */
  takings: number;
  seen: Sighting[];
  /** The supplier's trust in you, from purchases and fronts paid back (D79). */
  trust: number;
  /** In their crew; cut off from their fronts after one went unpaid (D86). */
  crew: boolean;
  cutOff: boolean;
  /** What a front left owed, in cents, and the day it is due; -1 with none. */
  owed: number;
  due: number;
  /** The coworker, selling for you since this day (D85); -1 if not. */
  recruit: number;
  /** The last day the crew's days were settled to. */
  settled: number;
  /** Introduced to the wholesale connect (M4.1, D145). */
  connect: boolean;
  /** Your own crew: people you know, selling what you front them (D145). */
  members: Member[];
}

/** One of your crew: a tier-1 person you know, and what is between you and them. */
export interface Member {
  /** Their number in the roster, as the circle knows them. */
  readonly person: number;
  readonly since: number;
  /** What they hold of yours, in tenths of a gram. */
  held: number;
  /** What their front leaves them owing you, in cents, and the day it is due; -1 with none. */
  owed: number;
  due: number;
  /** Cents from their sales toward what they owe. */
  taken: number;
  /** A front gone unpaid: no more until it is settled or you let them go. */
  cutOff: boolean;
}

/** What a save from before the crew (deal version 1) gains (M2.4 step 4). */
export const NO_CREW = { trust: 0, crew: false, cutOff: false, owed: 0, due: -1, recruit: -1, settled: 0 } as const;

/** What a save from before your own crew (deal version 2) gains (M4.1 step 1). */
export const noBoss = (): Pick<DealSlice, 'connect' | 'members'> => ({ connect: false, members: [] });

export type DealContext = ModuleContext<DealSlice>;
export type DealView = FactView<DealSlice> | DealContext | PreviewContext<DealSlice>;

export const sliceOf = (v: DealView): DeepReadonly<DealSlice> => ('state' in v ? v.state : v.read());

export const HEAT_MAX = 100;
/** Heat a year old is gone whatever is kept: no longer loop needed. */
const FADE_DAYS = 365;

/** Heat today: what was set on `asOf`, kept a share each day since. */
export function heatOf(v: DealView): number {
  const s = sliceOf(v);
  if (s.heat === 0 || !v.content.has('trade', TRADE)) return s.heat;
  const keep = tradeOf(v.content).heat.keep;
  const days = Math.min(FADE_DAYS, (v.fact('time.day') as number) - s.asOf);
  let heat = s.heat;
  for (let d = 0; d < days && heat > 0; d++) heat = Math.floor((heat * keep) / 10_000);
  return heat;
}

/** Heat raised by `by`, from today's. */
export function raiseHeat(ctx: DealContext, by: number): void {
  const now = heatOf(ctx);
  const w = ctx.write();
  w.heat = Math.min(HEAT_MAX, now + by);
  w.asOf = ctx.fact('time.day') as number;
}
