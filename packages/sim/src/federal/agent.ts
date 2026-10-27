/**
 * The agent bot (M4.3 step 5): a life with a bachelor's and two years' professional work that
 * goes for the federal bureau. It lives as the steady bot does. It applies when it can, studies
 * for the written test and trains for the fitness test in its free hours, sits each stage once it
 * has done what it means to for it, reports to the Academy once cleared, and as an agent opens a
 * case, works it on its shifts and asks for the indictment once the evidence is strong. Refused,
 * it waits the year and applies again. It sees only options and facts.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { STAGE_ONLY, steadyFor } from '../bot.ts';

/** Hours it studies before it sits the written test, and trains before the fitness test (tune). */
export const STUDY_HOURS = 40;
export const TRAIN_HOURS = 60;
/** Evidence it builds before it asks for an indictment (tune). */
export const INDICT_AT = 70;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string) => offered.filter((a) => a.type === type);
const level = (turn: Turn, need: string) => turn.fact('life.need', { need }) as number;

/** Free time in the day, off shift, fed and rested enough: when it studies and trains. */
function free(turn: Turn): boolean {
  const minute = turn.fact('time.of-day') as number;
  return (
    turn.fact('job.on-shift') !== true &&
    minute >= 9 * 60 &&
    minute < 21 * 60 &&
    level(turn, 'food') >= 30 &&
    level(turn, 'rest') >= 30 &&
    level(turn, turn.fact('life.lowest') as string) >= 25
  );
}

/** The stage sat, if it has done what it means to for it. */
function sit(turn: Turn, offered: readonly Action[]): Action | undefined {
  const go = of(offered, 'federal/sit')[0];
  if (!go) return undefined;
  const stage = turn.fact('federal.stage');
  if (stage === 'written' && (turn.fact('federal.studied') as number) < STUDY_HOURS * 60) return undefined;
  if (stage === 'fitness' && (turn.fact('federal.trained') as number) < TRAIN_HOURS * 60) return undefined;
  return go;
}

/** An hour's study for the written test, then training for the fitness test, while short of its hours. */
function prepare(turn: Turn, offered: readonly Action[]): Action | undefined {
  if (!free(turn)) return undefined;
  const hours = of(offered, 'federal/prepare');
  const study = hours.find((a) => a.for === 'written');
  if (study && (turn.fact('federal.studied') as number) < STUDY_HOURS * 60) return study;
  const train = hours.find((a) => a.for === 'fitness');
  return train && (turn.fact('federal.trained') as number) < TRAIN_HOURS * 60 ? train : undefined;
}

/** An agent's case: one opened on a target at random, and the indictment asked once the evidence is strong. */
function casework(turn: Turn, offered: readonly Action[]): Action | undefined {
  const indict = of(offered, 'federal/indict')[0];
  if (indict && (turn.fact('federal.evidence') as number) >= INDICT_AT) return indict;
  const open = of(offered, 'federal/open');
  return open.length > 0 ? turn.rng.pick(open) : undefined;
}

export const agentFor = (days: number, name = 'agent'): Policy => {
  const steady = steadyFor(days, name);
  return {
    name,
    choose(turn) {
      if ((turn.fact('time.day') as number) >= days) return null;
      if (turn.mode.id !== 'world') return steady.choose(turn);
      const offered = playable(turn);
      const work = offered.find((a) => a.type === 'life/do' && a.activity === 'work');
      if (work) return work;
      if (level(turn, 'food') < 15) return steady.choose(turn);
      const pick =
        of(offered, 'federal/apply')[0] ??
        of(offered, 'federal/report')[0] ??
        sit(turn, offered) ??
        casework(turn, offered) ??
        prepare(turn, offered);
      return pick ?? steady.choose(turn);
    },
  };
};
