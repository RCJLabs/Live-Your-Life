/**
 * The law module (M1.5): shoplifting in the corner shop, and the whole chain after it (D45–D48).
 * Taking something rolls at odds from who sees where you stand. Held, you wait for the police;
 * seen on camera, they come days later, at a time you are told. An appearance ticket sets a
 * court date where you plead, or a warrant follows. A first offence can be HYTA's probation.
 * What you took you can eat, or sell to the fence. It owns no money or goods: the economy and
 * inventory kits do, and it asks the life module to feed you.
 */
import { defineModule } from '@eb/core';
import { attend, checkIn, contest, courtIn, owedOf, pay, plead } from './court.ts';
import { drawFence, eat, type Fence, sale, sell } from './fence.ts';
import { hearing, lawDay, review, saleSeen, ticket, visit } from './police.ts';
import { FENCE, fenceOf } from './records.ts';
import { convict, freshLaw, type LawSlice } from './state.ts';
import { filmedNow, gotAway, heldNow, take, theft, wait } from './take.ts';

export type LawState = LawSlice & { fence: Fence | null };

export const lawModule = defineModule<LawState>({
  id: 'law',
  init: (ctx) => ({ ...freshLaw(ctx.rng('block')), fence: drawFence(ctx.content, ctx.rng('fence')) }),
  facts: {
    heat: {
      read: ({ state }) => state.heat,
      domain: { type: 'int', min: 0, max: 100 },
      label: 'what the shop remembers',
    },
    convictions: {
      read: ({ state }) => state.convictions,
      domain: { type: 'int', min: 0, max: 1000 },
      label: 'convictions on your record',
    },
    cases: { read: ({ state }) => state.cases.length, domain: { type: 'int', min: 0, max: 1000 }, label: 'open cases' },
    // The fence's hours behind the diner, for their day as one of the tier-1 people (D70); -1 without one.
    'fence-from': {
      read: ({ state, content }) =>
        state.fence && content.has('fence', FENCE) ? fenceOf(content, FENCE).hours.from : -1,
      domain: { type: 'int', min: -1, max: 24 },
      label: 'the hour the fence comes',
    },
    'fence-to': {
      read: ({ state, content }) =>
        state.fence && content.has('fence', FENCE) ? fenceOf(content, FENCE).hours.to : -1,
      domain: { type: 'int', min: -1, max: 24 },
      label: 'the hour the fence goes',
    },
    warrant: {
      read: ({ state }) => state.cases.some((k) => k.warrant),
      domain: { type: 'bool' },
      label: 'a warrant out for you',
    },
    probation: { read: ({ state }) => state.probation !== null, domain: { type: 'bool' }, label: 'on probation' },
    // D62: minutes until today's hearing opens, 0 while it's open; nothing on a day with none.
    'court-in': {
      read: (view) => courtIn(view),
      domain: { type: 'int', min: 0 },
      label: 'minutes until your court date opens today',
    },
    owed: {
      read: ({ state }) => owedOf(state),
      domain: { type: 'int', min: 0 },
      label: 'owed to the court and the shop',
    },
  },
  actions: { take, wait, attend, plead, 'check-in': checkIn, pay, sell, eat },
  effects: {
    theft,
    'got-away': gotAway,
    filmed: filmedNow,
    held: heldNow,
    ticket,
    review: (ctx) => review(ctx),
    visit,
    hearing,
    contest,
    dismissed: (ctx, effect) => ctx.emit('dismissed', { case: effect.case }),
    'found-guilty': (ctx, effect) => convict(ctx, String(effect.offence), 'trial'),
    sale,
    'sale-seen': saleSeen,
    'law-day': (ctx) => lawDay(ctx),
  },
  modes: {
    // Held by the clerk, or in the cells: the time passes until they come. The stage's elapse too.
    held: { actions: ['law/wait', 'time/*'] },
    court: { actions: ['law/plead'] },
  },
});
