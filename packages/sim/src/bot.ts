/**
 * The week bots: what plays a life headless, through the engine's runner (engine
 * docs/specs/runner.md). A bot sees what a player sees, the options and the facts, never the
 * state, and draws from a stream of its own. Both stop when a week has passed.
 */
import type { Action, Policy, Turn } from '@eb/core';
import type { Need } from './needs.ts';

/** A week, in days since the start. */
export const WEEK = 7;

/**
 * Actions only the stage sends: wall-clock time and the editor's time controls. The engine
 * offers them to bots with no payload, which elapse refuses and advance spends on no time, so no
 * bot takes them (ROADMAP.md, open questions).
 */
export const STAGE_ONLY: ReadonlySet<string> = new Set(['time/elapse', 'time/advance']);

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
const weekDone = (turn: Turn): boolean => (turn.fact('time.day') as number) >= WEEK;
const level = (turn: Turn, need: Need): number => turn.fact('life.need', { need }) as number;
const doing = (offered: readonly Action[], activity: string): Action | undefined =>
  offered.find((a) => a.type === 'life/do' && a.activity === activity);

/** The first of these that is offered, in order. */
const firstOf = (...choices: (Action | undefined)[]): Action | undefined => choices.find((c) => c !== undefined);

/**
 * Keeps a life steady: rent owed first, then a need about to run out, then the shift, then sleep
 * at night, then the lowest need, and otherwise passes the time one of a few ways. Its draws, how
 * it passes the time, are what make one seed's week differ from another's.
 */
export const steadyPolicy: Policy = {
  name: 'steady',
  choose(turn) {
    if (weekDone(turn)) return null;
    const offered = playable(turn);
    const lowest = turn.fact('life.lowest') as Need;
    const chosen = firstOf(
      offered.find((a) => a.type === 'home/pay-owed'),
      level(turn, 'food') < 15 ? doing(offered, 'eat') : undefined,
      level(turn, 'rest') < 10 ? doing(offered, 'sleep') : undefined,
      doing(offered, 'work'),
      turn.fact('time.phase') === 'night' && level(turn, 'rest') < 70 ? doing(offered, 'sleep') : undefined,
      level(turn, lowest) < 40 ? doing(offered, REMEDY[lowest]) : undefined,
      doing(offered, turn.rng.pick(['awake', 'awake', 'awake', 'relax', 'socialize'])),
    );
    return chosen ?? turn.rng.pick(offered);
  },
};

/** Any playable offer, each as likely: what proves every offer is one the game accepts. */
export const randomLifePolicy: Policy = {
  name: 'random-life',
  choose: (turn) => (weekDone(turn) ? null : turn.rng.pick(playable(turn))),
};
