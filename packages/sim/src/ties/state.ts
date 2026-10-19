/**
 * The ties module's slice (M1.4): the player's relationships, for now one, the coworker (D41),
 * and the rules its parts share: their crew record, and whether they are beside you on a day.
 */
import type { DeepReadonly, FactView, ModuleContext, RecordStore } from '@eb/core';
import { type Today, todayOf } from '../job/days.ts';
import { careerFor } from '../job/state.ts';
import { type Memory, NEUTRAL, remember } from './memory.ts';
import { type Coworker, works } from './person.ts';
import { actOf, type Crew, crewOf } from './records.ts';

export interface TiesSlice {
  /** The career whose crew they are, or null when nobody works beside you. */
  career: string | null;
  coworker: Coworker | null;
  /** Minutes on the line beside them: what familiarity grows from. */
  together: number;
  /** 0 to 100, from 50 (D43). */
  regard: number;
  /** What they remember of you, by kind of act, the latest last (D44). */
  memory: Memory[];
  /** Days they're off because you took their shift. */
  off: number[];
  /** Days of yours you've asked them to cover: once a shift. */
  asked: number[];
  /** A shift of theirs they've asked you to cover, waiting on your answer. */
  request: { day: number; shift: string } | null;
}

export type TiesContext = ModuleContext<TiesSlice>;
type Viewer = FactView<TiesSlice> | TiesContext | { readonly content: RecordStore; read(): DeepReadonly<TiesSlice> };

export const nobody = (): TiesSlice => ({
  career: null,
  coworker: null,
  together: 0,
  regard: NEUTRAL,
  memory: [],
  off: [],
  asked: [],
  request: null,
});

const sliceOf = (view: Viewer): DeepReadonly<TiesSlice> => ('state' in view ? view.state : view.read());

// Each crew is checked once: the records are frozen, and facts read them many times a turn.
const checked = new WeakMap<object, Crew>();

/** The crew record the coworker comes from, checked. Throws for a slice with nobody. */
export function crewFor(content: RecordStore, slice: Pick<TiesSlice, 'career'>): Crew {
  if (slice.career === null) throw new Error('ties: nobody works beside you');
  const career = careerFor(content, slice);
  if (!career.crew) throw new Error(`ties: career "${slice.career}" has no crew`);
  const known = checked.get(career.crew);
  if (known) return known;
  checked.set(career.crew, crewOf(content, slice.career, career.crew));
  return career.crew;
}

/** The shift kinds of their career, for the shifts they work on days you don't. */
export const kindsOf = (content: RecordStore, slice: Pick<TiesSlice, 'career'>): string[] =>
  careerFor(content, slice).shifts.map((s) => s.id);

/** Whether they work a day, favours counted: the diner pairs its two cooks, so on yours they're beside you. */
export function besideOn(view: Viewer & { fact(id: string): unknown }, day: number, today: Today = todayOf(view)) {
  const slice = sliceOf(view);
  if (!slice.coworker || slice.off.includes(day)) return false;
  return works(slice.coworker, crewFor(view.content, slice), today, day);
}

/** An act they remember, by its record's weight, on today's day (D44). */
export function rememberAct(ctx: TiesContext, act: string): void {
  const weight = actOf(ctx.content, act).regard;
  const slice = ctx.write();
  remember(slice, act, weight, todayOf(ctx).day);
  ctx.emit('remembered', { act, regard: slice.regard });
}
