/**
 * The circle module (M2.6, D89): the tier-1 people you come to know. You meet them where you share
 * an hour with them, at work or out at one of your third places (meet.ts); time together grows
 * familiarity, more slowly at work (Hall's hours, CALIBRATION.md). Who they are, and how drawn to
 * you each is, is worked out from the seed (people/who.ts). The coworker, the fence and the
 * supplier are known through their own modules.
 */
import { defineModule, type FactView } from '@eb/core';
import { mix } from '../people/roster.ts';
import { ADULT, chemistry, DRAWN_TO, type DrawnTo, drawnBy, drawnFor, type Who, whoIs } from '../people/who.ts';
import { familiarityOf } from '../ties/memory.ts';
import { namePoolOf, type Pronouns } from '../ties/records.ts';
import {
  answered,
  askOut,
  askRoll,
  breakUp,
  dated,
  dateRoll,
  foundOut,
  goOnDate,
  planDate,
  talk,
  talked,
  talkRoll,
} from './court.ts';
import { circleDays } from './days.ts';
import { hauntsOf, meetAt, nameOf, rosterNow } from './meet.ts';
import { populationOf } from './records.ts';
import { type CircleSlice, migrateCircle2, noOne } from './state.ts';

/** Your age on the life's first day (D20). */
export const START_AGE = ADULT;

const PERSON = { person: { type: 'int', min: 0 } } as const;
const WHO = { type: 'int', min: 0 } as const;
const NAME = { type: 'text' } as const;

type View = FactView<CircleSlice>;

const minuteNow = (v: { fact(id: string): unknown }): number =>
  (v.fact('time.day') as number) * 1440 + (v.fact('time.of-day') as number);

/** Whom you are drawn to: what you said, or until then drawn from the seed at your age's shares (D91). */
export function yourDrawnTo(v: View): DrawnTo {
  if (v.state.drawnTo) return v.state.drawnTo;
  const seed = v.fact('people.seed') as number;
  return drawnFor(populationOf(v.content), START_AGE, v.fact('you.pronouns') as Pronouns, mix(seed, 67), mix(seed, 68));
}

const whoOf = (v: View, person: number): Who => {
  const pop = populationOf(v.content);
  return whoIs(pop, namePoolOf(v.content, pop.names), v.fact('people.seed') as number, person);
};

const yourAge = (v: View): number => START_AGE + Math.floor((v.fact('time.day') as number) / 365);

const tieOf = (v: View, person: number) => v.state.ties.find((t) => t.person === person);

export const circleModule = defineModule<CircleSlice>({
  id: 'circle',
  // 2 (M2.6 step 2): courting.
  version: 2,
  migrate: { 2: migrateCircle2 },
  init: noOne,
  events: {
    met: { args: { person: WHO, name: NAME }, label: 'Met someone' },
    talked: { args: { person: WHO, good: { type: 'bool' } }, label: 'Talked with someone' },
    'asked-out': { args: { person: WHO, name: NAME, yes: { type: 'bool' } }, label: 'Asked someone out' },
    planned: { args: { person: WHO, day: { type: 'int', min: 0 } }, label: 'Planned a date' },
    dated: { args: { person: WHO, name: NAME, good: { type: 'bool' } }, label: 'Went on a date' },
    'stood-up': { args: { person: WHO, name: NAME }, label: 'Missed a date' },
    'found-out': { args: { person: WHO, name: NAME }, label: 'A partner found out about another' },
    'broke-up': { args: { person: WHO, name: NAME, by: { type: 'enum', values: ['you', 'them'] } }, label: 'Broke up' },
  },
  facts: {
    known: { read: ({ state }) => state.ties.length, domain: { type: 'int', min: 0 }, label: 'people you know' },
    dating: {
      read: ({ state }) => state.ties.filter((t) => t.status === 'dating').length,
      domain: { type: 'int', min: 0 },
      label: 'people you are dating',
    },
    name: {
      args: PERSON,
      read: (v, { person }) => nameOf(v.content, v.fact('people.seed') as number, person as number),
      label: 'their name',
    },
    out: { read: ({ state }) => state.out, domain: { type: 'int', min: -1 }, label: 'the place you are going out to' },
    'drawn-to': { read: yourDrawnTo, domain: { type: 'enum', values: DRAWN_TO }, label: 'whom you are drawn to' },
    familiarity: {
      args: PERSON,
      read: (v, { person }) => {
        const tie = tieOf(v, person as number);
        return tie ? familiarityOf(tie.together, populationOf(v.content).ties.half * 60) : 0;
      },
      domain: { type: 'int', min: 0, max: 100 },
      label: 'how well you know them',
    },
    regard: {
      args: PERSON,
      read: (v, { person }) => tieOf(v, person as number)?.regard ?? 50,
      domain: { type: 'int', min: 0, max: 100 },
      label: 'what they think of you',
    },
    attraction: {
      args: PERSON,
      read: (v, { person }) =>
        chemistry(
          populationOf(v.content),
          v.fact('people.seed') as number,
          person as number,
          whoOf(v, person as number),
          { pronouns: v.fact('you.pronouns') as Pronouns, age: yourAge(v) },
          v.fact('time.day') as number,
        ),
      domain: { type: 'int', min: 0, max: 100 },
      label: 'how drawn to you they are',
    },
    drawn: {
      args: PERSON,
      read: (v, { person }) => {
        const who = whoOf(v, person as number);
        return who.age >= ADULT && drawnBy(yourDrawnTo(v), who.pronouns);
      },
      domain: { type: 'bool' },
      label: 'whether you could be drawn to them',
    },
  },
  actions: {
    // Where you go out (D89): one of your third places, then whatever you do there.
    'go-out': {
      run: (ctx, action) => {
        const roster = rosterNow(ctx);
        const haunts = roster
          ? hauntsOf(roster, ctx.fact('people.seed') as number, populationOf(ctx.content).ties.haunts)
          : [];
        if (!haunts.includes(action.place as number)) return ctx.refuse('not-a-haunt');
        ctx.write().out = action.place as number;
      },
      options: (view) => {
        const roster = rosterNow(view);
        if (!roster) return [];
        const seed = view.fact('people.seed') as number;
        return hauntsOf(roster, seed, populationOf(view.content).ties.haunts)
          .filter((place) => place !== view.state.out)
          .map((place) => ({ place }));
      },
    },
    // Whom you are drawn to (D91): yours to say at the start and to change in settings. A setting,
    // not a turn's choice, so nothing offers it.
    'drawn-to': (ctx, action) => {
      if (!DRAWN_TO.includes(action.to as DrawnTo)) return ctx.refuse('bad-drawn-to');
      ctx.write().drawnTo = action.to as DrawnTo;
    },
    talk,
    'ask-out': askOut,
    'plan-date': planDate,
    'go-on-date': goOnDate,
    'break-up': breakUp,
  },
  effects: {
    'talk-roll': talkRoll,
    talked,
    'ask-roll': askRoll,
    answered,
    'date-roll': dateRoll,
    dated,
    'found-out': foundOut,
  },
  on: {
    // Missed dates, drift and endings (days.ts).
    'time/passed': circleDays,
    // Doing something other than socialising is leaving the place you went out to.
    'life/started': (ctx, event) => {
      if (event.activity !== 'socialize' && ctx.read().out >= 0) ctx.write().out = -1;
    },
    // An evening out: the people at your third place, hour by hour, as long as you stayed.
    'life/ended': (ctx, event) => {
      const out = ctx.read().out;
      if (out < 0 || event.activity !== 'socialize') return;
      const now = minuteNow(ctx);
      meetAt(ctx, out, now - (event.minutes as number), now, 100);
      ctx.write().out = -1;
    },
    // A shift at a tier-1 workplace: the people on with you, counted for less (Hall).
    'job/worked': (ctx, event) => {
      const place = ctx.fact('market.place') as number;
      if (place < 0) return;
      const now = minuteNow(ctx);
      meetAt(ctx, place, now - (event.minutes as number), now, populationOf(ctx.content).ties.atWork);
    },
  },
});
