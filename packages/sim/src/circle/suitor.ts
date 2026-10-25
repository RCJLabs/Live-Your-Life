/**
 * The suitor bot (M2.6 step 6): a life that looks for a partner. It lives as the steady bot does,
 * and in the evening goes out to one of its third places and stays there, talking to whoever it
 * knows and asking out whoever it may; it turns up to every date, plans the next, and takes each
 * step a couple can take when it is offered. A pregnancy is gone on with, most of the time; a
 * child's care is given before anything but work. It sees only options and facts, as a player.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { STAGE_ONLY, steadyFor } from '../bot.ts';

/** Out of 100: how often it goes on with a pregnancy, and stays a night with protection (tune). */
const GOES_ON = 80;
const PROTECTED = 70;
/** The least chance of a yes it asks someone out at, and what it keeps back for a date (tune). */
const ASKS_AT = 20;
const DATE_COST = 6000;

/** Couple's steps, the first offered taken. */
const STEPS = ['circle/go-on-date', 'circle/marry', 'circle/licence', 'circle/propose', 'circle/ask-in'] as const;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string) => offered.filter((a) => a.type === type);
const chance = (turn: Turn, out: number) => turn.rng.int(0, 99) < out;

/** The pregnancy's choice, the night asked and a child's care: what comes before courting. */
function family(turn: Turn, offered: readonly Action[]): Action | undefined {
  const goOn = of(offered, 'family/continue')[0];
  const end = of(offered, 'family/end')[0];
  if (goOn && end) return chance(turn, GOES_ON) ? goOn : end;
  if (goOn) return goOn;
  const care = of(offered, 'family/care')[0];
  if (care && (turn.fact('family.care-left') as number) > 0) return care;
  return of(offered, 'family/pay-bill')[0];
}

/** Talking to whoever is here, asking out whoever may be asked, a night after a date. */
function courting(turn: Turn, offered: readonly Action[]): Action | undefined {
  for (const step of STEPS) {
    const a = of(offered, step)[0];
    if (a) return a;
  }
  const nights = of(offered, 'circle/stay-night');
  if (nights.length > 0) {
    const protect = chance(turn, PROTECTED);
    return nights.find((a) => a.protect === protect) ?? nights[0];
  }
  // Dates twice a week, planned on Tuesdays and Fridays, with the money for two.
  const plan = of(offered, 'circle/plan-date')[0];
  const weekday = turn.fact('time.weekday');
  const cash = turn.fact('economy.amount', { resource: 'cash' }) as number;
  if (plan && (weekday === 'tuesday' || weekday === 'friday') && cash >= 2 * DATE_COST) return plan;
  // Asked as a player reads the odds: only those likely enough to say yes.
  const ask = of(offered, 'circle/ask-out').filter(
    (a) =>
      ((turn.preview([{ effect: 'ask-roll', person: a.person }])[0] as { chance?: number }).chance ?? 0) >= ASKS_AT,
  );
  if (ask.length > 0) return turn.rng.pick(ask);
  const talk = of(offered, 'circle/talk');
  return talk.length > 0 ? turn.rng.pick(talk) : undefined;
}

/** Out in the evening, home at night: the third place and the hours it keeps there. */
function evening(turn: Turn, offered: readonly Action[]): Action | undefined {
  const phase = turn.fact('time.phase');
  const out = (turn.fact('circle.out') as number) >= 0;
  if (phase === 'evening' && turn.fact('job.on-shift') !== true) {
    if (out) return offered.find((a) => a.type === 'life/do' && a.activity === 'socialize');
    const go = of(offered, 'circle/go-out');
    if (go.length > 0) return turn.rng.pick(go);
  }
  return phase === 'night' && out ? of(offered, 'circle/home')[0] : undefined;
}

export const suitorFor = (days: number, name = 'suitor'): Policy => {
  const steady = steadyFor(days, name);
  return {
    name,
    choose(turn) {
      if ((turn.fact('time.day') as number) >= days) return null;
      if (turn.mode.id !== 'world') return steady.choose(turn);
      const offered = playable(turn);
      // Work and food first, as the steady bot would.
      const work = offered.find((a) => a.type === 'life/do' && a.activity === 'work');
      if (work) return work;
      if ((turn.fact('life.need', { need: 'food' }) as number) < 15) return steady.choose(turn);
      return family(turn, offered) ?? courting(turn, offered) ?? evening(turn, offered) ?? steady.choose(turn);
    },
  };
};
