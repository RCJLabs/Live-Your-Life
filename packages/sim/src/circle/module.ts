/**
 * The circle module (M2.6, D89): the tier-1 people you come to know. You meet them where you share
 * an hour with them, at work or out at one of your third places (meet.ts); time together grows
 * familiarity, more slowly at work (Hall's hours, CALIBRATION.md). Who they are, and how drawn to
 * you each is, is worked out from the seed (people/who.ts). The coworker, the fence and the
 * supplier are known through their own modules.
 */
import { defineModule, type FactView } from '@eb/core';
import { mix } from '../people/roster.ts';
import {
  ADULT,
  carriesFor,
  chemistry,
  DRAWN_TO,
  type DrawnTo,
  drawnBy,
  drawnFor,
  type Who,
  whoIs,
} from '../people/who.ts';
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
import { type CircleSlice, migrateCircle2, migrateCircle3, migrateCircle4, noOne, partnered } from './state.ts';
import {
  askIn,
  fileDivorce,
  licence,
  marry,
  movedIn,
  moveInRoll,
  night,
  nightRoll,
  proposal,
  propose,
  proposeRoll,
  separate,
  shareRent,
  stay,
} from './together.ts';

/** Your age on the life's first day (D20). */
export const START_AGE = ADULT;

const PERSON = { person: { type: 'int', min: 0 } } as const;
const WHO = { type: 'int', min: 0 } as const;
const NAME = { type: 'text' } as const;
const DAY = { type: 'int', min: 0 } as const;

type View = FactView<CircleSlice>;

const minuteNow = (v: { fact(id: string): unknown }): number =>
  (v.fact('time.day') as number) * 1440 + (v.fact('time.of-day') as number);

/** Whom you are drawn to: what you said, or until then drawn from the seed at your age's shares (D91). */
export function yourDrawnTo(v: View): DrawnTo {
  if (v.state.drawnTo) return v.state.drawnTo;
  const seed = v.fact('people.seed') as number;
  return drawnFor(populationOf(v.content), START_AGE, v.fact('you.pronouns') as Pronouns, mix(seed, 67), mix(seed, 68));
}

/** Whether your body can carry (D96): what you said, or until then drawn from the seed by your pronouns' share. */
export function yourCarries(v: View): boolean {
  if (v.state.carries !== null) return v.state.carries;
  return carriesFor(
    populationOf(v.content),
    v.fact('you.pronouns') as Pronouns,
    mix(v.fact('people.seed') as number, 70),
  );
}

const whoOf = (v: View, person: number): Who => {
  const pop = populationOf(v.content);
  return whoIs(pop, namePoolOf(v.content, pop.names), v.fact('people.seed') as number, person);
};

const yourAge = (v: View): number => START_AGE + Math.floor((v.fact('time.day') as number) / 365);

const tieOf = (v: View, person: number) => v.state.ties.find((t) => t.person === person);

export const circleModule = defineModule<CircleSlice>({
  id: 'circle',
  // 2 (M2.6 step 2): courting. 3 (step 3): living together, marriage, divorce. 4 (step 4): your body.
  version: 4,
  migrate: { 2: migrateCircle2, 3: migrateCircle3, 4: migrateCircle4 },
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
    stayed: { args: { person: WHO, name: NAME, yes: { type: 'bool' } }, label: 'Asked to stay the night' },
    'moved-in': { args: { person: WHO, name: NAME, yes: { type: 'bool' } }, label: 'Asked someone to move in' },
    proposed: { args: { person: WHO, name: NAME, yes: { type: 'bool' } }, label: 'Proposed' },
    licensed: { args: { person: WHO, name: NAME, from: DAY, until: DAY }, label: 'Got a marriage licence' },
    'licence-lapsed': { args: { person: WHO, name: NAME }, label: 'A marriage licence lapsed' },
    married: { args: { person: WHO, name: NAME }, label: 'Married' },
    filed: { args: { person: WHO, name: NAME, hearing: DAY }, label: 'Filed for divorce' },
    divorced: { args: { person: WHO, name: NAME }, label: 'Divorced' },
    'shared-rent': {
      args: { person: WHO, cents: { type: 'int', min: 0 } },
      label: 'A partner paid their share of the rent',
    },
  },
  facts: {
    known: { read: ({ state }) => state.ties.length, domain: { type: 'int', min: 0 }, label: 'people you know' },
    partners: {
      read: ({ state }) => state.ties.filter(partnered).length,
      domain: { type: 'int', min: 0 },
      label: 'people you are dating, engaged or married to',
    },
    'living-works': {
      read: (v) => {
        const t = v.state.ties.find((x) => x.living);
        return t ? (rosterNow(v)?.people[t.person]?.work ?? -1) >= 0 : false;
      },
      domain: { type: 'bool' },
      label: 'whether the partner you live with works',
    },
    living: {
      read: ({ state }) => state.ties.find((t) => t.living)?.person ?? -1,
      domain: { type: 'int', min: -1 },
      label: 'who lives with you, or -1',
    },
    name: {
      args: PERSON,
      read: (v, { person }) => nameOf(v.content, v.fact('people.seed') as number, person as number),
      label: 'their name',
    },
    out: { read: ({ state }) => state.out, domain: { type: 'int', min: -1 }, label: 'the place you are going out to' },
    carries: { read: yourCarries, domain: { type: 'bool' }, label: 'whether your body can carry a pregnancy' },
    'they-carry': {
      args: PERSON,
      read: (v, { person }) => whoOf(v, person as number).carries,
      domain: { type: 'bool' },
      label: 'whether their body can carry a pregnancy',
    },
    age: {
      args: PERSON,
      read: (v, { person }) => whoOf(v, person as number).age + Math.floor((v.fact('time.day') as number) / 365),
      domain: { type: 'int', min: 0 },
      label: 'their age',
    },
    'your-age': { read: yourAge, domain: { type: 'int', min: 0 }, label: 'your age' },
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
    // Going home from the place you went out to (M2.6 step 5): you're no longer there.
    home: {
      run: (ctx) => {
        if (ctx.read().out < 0) return ctx.refuse('not-out');
        ctx.write().out = -1;
      },
      options: (view) => (view.state.out >= 0 ? [{}] : []),
    },
    // Whom you are drawn to (D91): yours to say at the start and to change in settings. A setting,
    // not a turn's choice, so nothing offers it.
    'drawn-to': (ctx, action) => {
      if (!DRAWN_TO.includes(action.to as DrawnTo)) return ctx.refuse('bad-drawn-to');
      ctx.write().drawnTo = action.to as DrawnTo;
    },
    // Your body (D96): a setting, as whom you are drawn to is.
    carries: (ctx, action) => {
      if (typeof action.carries !== 'boolean') return ctx.refuse('bad-carries');
      ctx.write().carries = action.carries;
    },
    talk,
    'ask-out': askOut,
    'plan-date': planDate,
    'go-on-date': goOnDate,
    'break-up': breakUp,
    'stay-night': stay,
    'ask-in': askIn,
    propose,
    licence,
    marry,
    separate,
    'file-divorce': fileDivorce,
  },
  effects: {
    'talk-roll': talkRoll,
    talked,
    'ask-roll': askRoll,
    answered,
    'date-roll': dateRoll,
    dated,
    'found-out': foundOut,
    'night-roll': nightRoll,
    night,
    'move-in-roll': moveInRoll,
    'moved-in': movedIn,
    'propose-roll': proposeRoll,
    proposal,
  },
  on: {
    // Missed dates, drift and endings, licences and judgments (days.ts).
    'time/passed': circleDays,
    // A partner you live with pays their share (together.ts).
    'home/rent': (ctx) => shareRent(ctx),
    // Doing something other than socialising is leaving the place you went out to.
    'life/started': (ctx, event) => {
      if (event.activity !== 'socialize' && ctx.read().out >= 0) ctx.write().out = -1;
    },
    // An evening out: the people at your third place, hour by hour, as long as you stayed. You're
    // still there after it, to stay longer or walk home (step 5); doing anything else ends it.
    'life/ended': (ctx, event) => {
      const out = ctx.read().out;
      if (out < 0 || event.activity !== 'socialize') return;
      const now = minuteNow(ctx);
      meetAt(ctx, out, now - (event.minutes as number), now, 100);
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
