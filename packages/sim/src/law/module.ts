/**
 * The law module (M1.5): shoplifting in the corner shop, and the whole chain after it (D45–D48).
 * Taking something rolls at odds from who sees where you stand. Held, you wait for the police;
 * seen on camera, they come days later, at a time you are told. An appearance ticket sets a
 * court date where you plead, or a warrant follows. A first offence can be HYTA's probation.
 * What you took you can eat, or sell to the fence. It owns no money or goods: the economy and
 * inventory kits do, and it asks the life module to feed you.
 */
import { defineModule } from '@eb/core';
import { attend, checkIn, contest, convictAndSentence, courtIn, owedOf, pay, plead } from './court.ts';
import { arraign, drugCase, postBail, released, remand } from './drugs.ts';
import { drawFence, eat, type Fence, sale, sell } from './fence.ts';
import { hearing, lawDay, newVisit, review, saleSeen, ticket, visit } from './police.ts';
import { FENCE, fenceOf } from './records.ts';
import { crime, freshLaw, type LawSlice } from './state.ts';
import { filmedNow, gotAway, heldNow, take, theft, wait } from './take.ts';

export type LawState = LawSlice & { fence: Fence | null };

/** Bail posted, given back as the case ends. */
const giveBack = (ctx: Parameters<typeof arraign>[0], bail: unknown): void => {
  if (typeof bail === 'number' && bail > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: bail });
};

export const lawModule = defineModule<LawState>({
  id: 'law',
  // 2 (M2.4): probation says whose it is, HYTA's or a sentence's; a prison sentence to serve.
  version: 2,
  migrate: {
    2: (slice) => {
      const s = slice as LawState;
      return { ...s, probation: s.probation ? { ...s.probation, trainee: true } : null, prison: null };
    },
  },
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
    'prison-months': {
      read: ({ state }) => state.prison?.months ?? 0,
      domain: { type: 'int', min: 0 },
      label: 'months of a prison sentence passed and not yet served',
    },
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
  events: {
    // Declared for the prison module, which hears a prison sentence (M2.4, D81).
    sentenced: {
      args: {
        offence: { type: 'text' },
        kind: { type: 'enum', values: ['probation', 'jail', 'prison'] },
        jail: { type: 'int', min: 0 },
        probation: { type: 'int', min: 0 },
        prison: { type: 'int', min: 0 },
      },
      label: 'Sentenced',
    },
  },
  actions: { take, wait, attend, plead, 'check-in': checkIn, pay, sell, eat, 'post-bail': postBail, remand },
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
    dismissed: (ctx, effect) => {
      giveBack(ctx, effect.bail);
      ctx.emit('dismissed', { case: effect.case });
    },
    'found-guilty': (ctx, effect) => {
      giveBack(ctx, effect.bail);
      convictAndSentence(ctx, String(effect.offence), 'trial');
    },
    // M2.4: a drug case (drugs.ts).
    'drug-case': (ctx) => drugCase(ctx, (day) => newVisit(ctx, day, { why: 'raid', item: '', case: 0 })),
    arraign,
    released,
    // A prison sentence served (prison/module.ts): parole is a sentence's probation, without HYTA.
    served: (ctx, effect) => {
      const w = ctx.write();
      w.prison = null;
      const days = effect.parole as number;
      if (days <= 0) return;
      const day = ctx.fact('time.day') as number;
      const every = crime(ctx).hyta.every;
      w.probation = { until: day + days, next: day + every, offence: String(effect.offence), trainee: false };
    },
    sale,
    'sale-seen': saleSeen,
    'law-day': (ctx) => lawDay(ctx),
  },
  modes: {
    // Held by the clerk, or in the cells: the time passes until they come. The stage's elapse too.
    held: { actions: ['law/wait', 'time/*'] },
    court: { actions: ['law/plead'] },
    // Arraigned (M2.4): post bail or stay in jail.
    bail: { actions: ['law/post-bail', 'law/remand'] },
  },
});
