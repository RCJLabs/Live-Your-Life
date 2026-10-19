/**
 * The thief bot (M1.5): a life that steals instead of working, for the law's sweeps and for the
 * reading that crime earns less than work (D7, D48). Like the steady bot it sees only what a
 * player sees, the options, facts and previews, and draws from its own stream.
 *
 * It steals at most a few times a day, where the odds of being held are lowest, the dearest
 * thing there; eats what it took when hungry; sells the rest to the fence; goes to court and
 * takes HYTA when offered, otherwise pleads at random; checks in; and pays what it owes once a
 * week of meals can be kept back. Otherwise it lives as the steady bot does, without the job.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { REMEDY, RESERVE, STAGE_ONLY } from './bot.ts';
import type { Need } from './needs.ts';

/** Thefts a day it allows itself (tune): enough to live on, if crime paid. */
const PER_DAY = 3;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const level = (turn: Turn, need: Need): number => turn.fact('life.need', { need }) as number;
const doing = (offered: readonly Action[], activity: string): Action | undefined =>
  offered.find((a) => a.type === 'life/do' && a.activity === activity);
const of = (offered: readonly Action[], type: string): Action | undefined => offered.find((a) => a.type === type);
const firstOf = (...choices: (Action | undefined)[]): Action | undefined => choices.find((c) => c !== undefined);

/** The take with the lowest odds of being held, the dearest among those; ties by the bot's draw. */
function bestTake(turn: Turn, offered: readonly Action[]): Action | undefined {
  const takes = offered.filter((a) => a.type === 'law/take');
  if (takes.length === 0) return undefined;
  const scored = takes.map((a) => {
    const p = turn.preview([{ effect: 'theft', spot: a.spot, item: a.item }])[0] as unknown as {
      held: number;
      value: number;
    };
    return { a, held: p.held, value: p.value };
  });
  const least = Math.min(...scored.map((s) => s.held));
  const safest = scored.filter((s) => s.held === least);
  const dearest = Math.max(...safest.map((s) => s.value));
  return turn.rng.pick(safest.filter((s) => s.value === dearest)).a;
}

function inCourt(turn: Turn, offered: readonly Action[]): Action | undefined {
  const pleas = offered.filter((a) => a.type === 'law/plead');
  if (pleas.length === 0) return undefined;
  return pleas.find((a) => a.plea === 'hyta') ?? turn.rng.pick(pleas);
}

export const thiefFor = (days: number, name = 'thief'): Policy => {
  // Thefts so far on each day: the bot's own memory, as a player's would be.
  let day = -1;
  let today = 0;
  return {
    name,
    choose(turn) {
      const now = turn.fact('time.day') as number;
      if (now >= days) return null;
      if (now !== day) {
        day = now;
        today = 0;
      }
      const offered = playable(turn);
      if (turn.mode.id === 'shift-event') return turn.rng.pick(offered);
      const cash = turn.fact('economy.amount', { resource: 'cash' }) as number;
      const owed = (turn.fact('law.owed') as number) + (turn.fact('home.owed') as number);
      const lowest = turn.fact('life.lowest') as Need;
      const take = today < PER_DAY ? bestTake(turn, offered) : undefined;
      const chosen = firstOf(
        inCourt(turn, offered),
        of(offered, 'law/wait'),
        of(offered, 'law/attend'),
        of(offered, 'law/check-in'),
        cash - owed >= RESERVE ? (of(offered, 'law/pay') ?? of(offered, 'home/pay-owed')) : undefined,
        of(offered, 'law/sell'),
        level(turn, 'food') < 40 ? of(offered, 'law/eat') : undefined,
        level(turn, 'food') < 15 ? doing(offered, 'eat') : undefined,
        level(turn, 'rest') < 10 ? doing(offered, 'sleep') : undefined,
        take,
        turn.fact('time.phase') === 'night' && level(turn, 'rest') < 70 ? doing(offered, 'sleep') : undefined,
        level(turn, lowest) < 40 ? doing(offered, REMEDY[lowest]) : undefined,
        doing(offered, turn.rng.pick(['awake', 'awake', 'relax', 'socialize'])),
      );
      if (chosen?.type === 'law/take') today++;
      return chosen ?? turn.rng.pick(offered);
    },
  };
};
