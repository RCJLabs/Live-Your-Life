/**
 * The week bots: what plays a life headless, through the engine's runner (engine
 * docs/specs/runner.md). A bot sees what a player sees, the options and the facts, never the
 * state, and draws from a stream of its own. Both stop when a week has passed.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { COSTS } from './dials.ts';
import type { Need } from './needs.ts';

/** A week, in days since the start. */
export const WEEK = 7;

/**
 * Actions only the page sends: wall-clock time, the editor's time controls, the walk to work the
 * stage measures (D61), and settings such as whom you are drawn to (D91). The engine
 * offers them to bots with no payload, which elapse refuses and advance spends on no time, so no
 * bot takes them (ROADMAP.md, open questions).
 */
export const STAGE_ONLY: ReadonlySet<string> = new Set([
  'time/elapse',
  'time/advance',
  'you/commute',
  'circle/drawn-to',
  'circle/carries',
]);

/** What a pressing need sends the steady bot to do. Health has no activity of its own: rest is what lets it recover. */
export const REMEDY: Readonly<Record<Need, string>> = {
  rest: 'sleep',
  food: 'eat',
  hygiene: 'wash',
  company: 'socialize',
  calm: 'relax',
  health: 'relax',
};

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const done = (turn: Turn, days: number): boolean => (turn.fact('time.day') as number) >= days;
const level = (turn: Turn, need: Need): number => turn.fact('life.need', { need }) as number;
const doing = (offered: readonly Action[], activity: string): Action | undefined =>
  offered.find((a) => a.type === 'life/do' && a.activity === activity);

/** What the steady bot keeps back when it pays what it owes: a week of meals, three a day. */
export const RESERVE = 7 * 3 * COSTS.eat;
const cash = (turn: Turn): number => turn.fact('economy.amount', { resource: 'cash' }) as number;
const owed = (turn: Turn): number => turn.fact('home.owed') as number;

/** The first of these that is offered, in order. */
const firstOf = (...choices: (Action | undefined)[]): Action | undefined => choices.find((c) => c !== undefined);

/**
 * Keeps a life steady for `days` days: a shift event's choice when one is up, taken at random,
 * as a player who reads each one fresh might; a favour asked of it, answered either way at
 * random; then every shift it can sign up for; rent owed,
 * once a week of meals can be kept back; food about to run out; the shift, however tired; sleep
 * when nearly out of it, or at night; the lowest need; and otherwise passes the time one of a few
 * ways. The menu ends each activity by the next shift's start, so it is late only when a need
 * comes first. Its draws are what make one seed's life differ from another's.
 */
export const steadyFor = (days: number, name = 'steady'): Policy => ({
  name,
  choose(turn) {
    if (done(turn, days)) return null;
    const offered = playable(turn);
    // Nothing offered, as after a death (M2.7): the life is over.
    if (offered.length === 0) return null;
    if (turn.mode.id === 'shift-event' || turn.mode.id === 'life-event') return turn.rng.pick(offered);
    const lowest = turn.fact('life.lowest') as Need;
    const answers = offered.filter((a) => a.type === 'ties/answer');
    const chosen = firstOf(
      answers.length > 0 ? turn.rng.pick(answers) : undefined,
      offered.find((a) => a.type === 'job/sign-up'),
      cash(turn) - owed(turn) >= RESERVE ? offered.find((a) => a.type === 'home/pay-owed') : undefined,
      level(turn, 'food') < 15 ? doing(offered, 'eat') : undefined,
      // On shift it works however tired it is, as someone who needs the job would.
      doing(offered, 'work'),
      level(turn, 'rest') < 10 ? doing(offered, 'sleep') : undefined,
      turn.fact('time.phase') === 'night' && level(turn, 'rest') < 70 ? doing(offered, 'sleep') : undefined,
      level(turn, lowest) < 40 ? doing(offered, REMEDY[lowest]) : undefined,
      doing(offered, turn.rng.pick(['awake', 'awake', 'awake', 'relax', 'socialize'])),
    );
    return chosen ?? turn.rng.pick(offered);
  },
});

/** The steady bot for a week. */
export const steadyPolicy: Policy = steadyFor(WEEK);

/** Any playable offer, each as likely, for `days` days: what proves every offer is one the game accepts. */
export const randomFor = (days: number, name = 'random-life'): Policy => ({
  name,
  choose: (turn) => (done(turn, days) || playable(turn).length === 0 ? null : turn.rng.pick(playable(turn))),
});

export const randomLifePolicy: Policy = randomFor(WEEK);

/** Applications the seeker keeps out at once (tune). */
export const SEEKING = 3;

/**
 * Looks for work (M2.3, D74), from a life with none: takes the first offer it holds, applies for
 * openings at random while fewer than three applications wait, and once hired lives as the steady
 * bot does. A choice, a favour or a meal still comes first.
 */
export const seekerFor = (days: number, name = 'seeker'): Policy => {
  const steady = steadyFor(days, name);
  return {
    name,
    choose(turn) {
      if (done(turn, days)) return null;
      const offered = playable(turn);
      if (turn.mode.id === 'world' && turn.fact('job.employed') !== true) {
        const take = offered.find((a) => a.type === 'market/accept');
        if (take) return take;
        const apply = offered.filter((a) => a.type === 'market/apply');
        if (apply.length > 0 && (turn.fact('market.waiting') as number) < SEEKING) return turn.rng.pick(apply);
      }
      return steady.choose(turn);
    },
  };
};
