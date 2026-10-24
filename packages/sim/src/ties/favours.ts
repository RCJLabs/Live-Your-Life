/**
 * Favours both ways (D42). They ask you to cover a shift of theirs: a request at midnight on
 * about one day in ten, waiting on your answer until the day before. You ask them to cover a
 * shift of yours on one of their days off, once a shift, and they say yes by the odds their
 * regard gives (D43), rolled by the engine's `roll` with the odds the preview shows.
 */
import type { Action, DeepReadonly, FactView, PreviewContext, RecordStore } from '@eb/core';
import { daysFrom, todayOf } from '../job/days.ts';
import { oddsOf } from '../job/events.ts';
import { theirShift, works } from './person.ts';
import { besideOn, crewFor, kindsOf, rememberAct, type TiesContext, type TiesSlice } from './state.ts';

/** How far ahead they ask: from the day after tomorrow to six days on. */
const SOONEST = 2;
const LATEST = 6;

/** The odds they cover for you now: even, and regard's points either way (D43). */
const coverOdds = (view: { read(): DeepReadonly<TiesSlice>; content: RecordStore }): number => {
  const slice = view.read();
  const { base, regard } = crewFor(view.content, slice).cover;
  return oddsOf({ base, skill: 0, tired: 0, regard }, 0, 100, slice.regard);
};

/** Midnight: past days go, an unanswered request lapses the day before its shift, and they may ask. */
export function tiesDay(ctx: TiesContext): void {
  const slice = ctx.read();
  if (!slice.coworker) return;
  const today = todayOf(ctx);
  const off = slice.off.filter((d) => d >= today.day);
  const asked = slice.asked.filter((d) => d >= today.day);
  if (off.length !== slice.off.length || asked.length !== slice.asked.length) {
    const w = ctx.write();
    w.off = off;
    w.asked = asked;
  }
  // Gone from the diner (M2.3), a favour asked there lapses: their shift is not yours to cover.
  if (slice.request && !atDiner(ctx)) ctx.write().request = null;
  else if (slice.request && today.day >= slice.request.day - 1) {
    ctx.write().request = null;
    rememberAct(ctx, crewFor(ctx.content, slice).acts.ignored);
  }
  const crew = crewFor(ctx.content, slice);
  const rng = ctx.rng('requests');
  // One draw a day, asked or not, so a day's chance never shifts the days after it.
  if (!rng.chance(crew.asks, 100) || ctx.read().request || ctx.fact('job.employed') !== true) return;
  const days = daysFrom(today.day + SOONEST, today.day + LATEST).filter(
    (day) => besideOn(ctx, day, today) && ctx.fact('job.free', { day }) === true,
  );
  if (days.length === 0) return;
  const day = rng.pick(days);
  const shift = theirShift(slice.coworker, kindsOf(ctx.content, slice), day);
  ctx.write().request = { day, shift };
  ctx.emit('asked', { day, shift });
}

/** Still at the diner beside them: asking or covering a shift needs it (M2.3, D73). */
const atDiner = (view: { fact(id: string): unknown }): boolean => view.fact('market.at-diner') !== false;

export const answer = {
  run(ctx: TiesContext, action: Action) {
    const request = ctx.read().request;
    if (!request) return ctx.refuse('nothing-asked');
    if (!atDiner(ctx)) return ctx.refuse('not-there');
    const acts = crewFor(ctx.content, ctx.read()).acts;
    ctx.write().request = null;
    if (action.answer === 'yes') {
      ctx.apply({ effect: 'take-shift', day: request.day, shift: request.shift });
      ctx.write().off.push(request.day);
      rememberAct(ctx, acts.covered);
    } else if (action.answer === 'no') {
      rememberAct(ctx, acts.refused);
    } else {
      return ctx.refuse('bad-answer');
    }
    ctx.emit('answered', { day: request.day, yes: action.answer === 'yes' });
  },
  options: (view: FactView<TiesSlice>) => {
    const request = view.state.request;
    if (!request || !atDiner(view)) return [];
    const free = view.fact('job.free', { day: request.day }) === true;
    return free ? [{ answer: 'yes' }, { answer: 'no' }] : [{ answer: 'no' }];
  },
};

/** Your shifts ahead that they could cover: on their days off, not yet asked about. */
function askable(view: FactView<TiesSlice> | TiesContext): number[] {
  const slice = 'state' in view ? view.state : view.read();
  if (!slice.coworker || !atDiner(view)) return [];
  const today = todayOf(view);
  const crew = crewFor(view.content, slice);
  const ahead = view.fact('job.ahead') as { day: number }[];
  return ahead
    .map((s) => s.day)
    .filter((day) => !slice.asked.includes(day) && !slice.off.includes(day))
    .filter((day) => !works(slice.coworker as NonNullable<TiesSlice['coworker']>, crew, today, day));
}

export const askCover = {
  run(ctx: TiesContext, action: Action) {
    const day = action.day;
    if (typeof day !== 'number' || !askable(ctx).includes(day)) return ctx.refuse('not-askable');
    ctx.write().asked.push(day);
    ctx.apply({ effect: 'cover-ask', day });
  },
  options: (view: FactView<TiesSlice>) => askable(view).map((day) => ({ day })),
};

/** `cover-ask`: rolled at the odds its preview shows. */
export const coverAsk = {
  run(ctx: TiesContext, effect: Readonly<Record<string, unknown>>) {
    const chance = coverOdds(ctx);
    const day = effect.day as number;
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance, effects: [{ effect: 'cover-given', day }] },
        { chance: 100 - chance, effects: [{ effect: 'cover-refused', day }] },
      ],
    });
  },
  preview: (ctx: PreviewContext<TiesSlice>) => ({ chance: coverOdds(ctx) }),
};

/** They said yes: the shift is theirs, and you owe them for it. */
export function coverGiven(ctx: TiesContext, day: number): void {
  ctx.apply({ effect: 'give-shift', day });
  rememberAct(ctx, crewFor(ctx.content, ctx.read()).acts.asked);
  ctx.emit('covered', { day });
}
