/**
 * The ties module (M1.4): the player's relationships, for now the one with the other line cook
 * (D41). Familiarity grows with minutes beside them; regard moves with what you do (D42, D43);
 * they remember kinds of act (D44). It hears the job's events, never reaches into its slice,
 * and asks it to take or give a shift when a favour is done.
 */
import { defineModule, type InitContext } from '@eb/core';
import type { LifeStart } from '../calendar.ts';
import { careerOf } from '../job/records.ts';
import { answer, askCover, coverAsk, coverGiven, tiesDay } from './favours.ts';
import { familiarityOf } from './memory.ts';
import { drawCoworker } from './person.ts';
import { crewOf, namePoolOf } from './records.ts';
import { besideOn, crewFor, nobody, rememberAct, type TiesContext, type TiesSlice } from './state.ts';

/** Hired at the start, as the job is (job/module.ts): the coworker is drawn then. */
export interface Hired {
  readonly career: string;
  readonly start: LifeStart;
}

function hiredAt(ctx: InitContext, hire: Hired): TiesSlice {
  const crew = careerOf(ctx.content, hire.career).crew;
  if (!crew) return nobody();
  crewOf(ctx.content, hire.career, crew);
  const coworker = drawCoworker(namePoolOf(ctx.content, crew.names), crew, ctx.rng('people'));
  return { ...nobody(), career: hire.career, coworker };
}

const dayOf = (data: Readonly<Record<string, unknown>>): number => data.day as number;

/** What they remember when something happens on a shift of theirs. */
const onTheirShift = (which: 'late' | 'noShow') => (ctx: TiesContext, event: Readonly<Record<string, unknown>>) => {
  const slice = ctx.read();
  if (slice.coworker && besideOn(ctx, dayOf(event))) rememberAct(ctx, crewFor(ctx.content, slice).acts[which]);
};

export function tiesModule(hire?: Hired) {
  return defineModule<TiesSlice>({
    id: 'ties',
    init: (ctx) => (hire ? hiredAt(ctx, hire) : nobody()),
    facts: {
      beside: {
        read: (view) => view.fact('job.on-shift') === true && besideOn(view, view.fact('time.day') as number),
        domain: { type: 'bool' },
        label: 'the coworker beside you',
      },
      regard: { read: ({ state }) => state.regard, domain: { type: 'int', min: 0, max: 100 }, label: 'their regard' },
      familiarity: {
        read: ({ state, content }) =>
          state.coworker ? familiarityOf(state.together, crewFor(content, state).half) : 0,
        domain: { type: 'int', min: 0, max: 100 },
        label: 'how well you know them',
      },
      asking: { read: ({ state }) => state.request !== null, domain: { type: 'bool' }, label: 'a favour asked of you' },
    },
    actions: { 'ask-cover': askCover, answer },
    effects: {
      'ties-day': (ctx) => tiesDay(ctx),
      // An act in a shift event, remembered if they were beside you that day (D42).
      'shift-act': (ctx, effect) => {
        if (ctx.read().coworker && besideOn(ctx, dayOf(effect))) rememberAct(ctx, String(effect.act));
      },
      'cover-ask': coverAsk,
      'cover-given': (ctx, effect) => coverGiven(ctx, dayOf(effect)),
      'cover-refused': (ctx, effect) => ctx.emit('refused', { day: dayOf(effect) }),
    },
    on: {
      'job/worked': (ctx, event) => {
        if (ctx.read().coworker && besideOn(ctx, dayOf(event))) ctx.write().together += event.minutes as number;
      },
      'job/late': onTheirShift('late'),
      'job/no-show': onTheirShift('noShow'),
    },
  });
}
