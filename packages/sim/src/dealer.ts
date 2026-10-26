/**
 * The dealer bot (M2.4): a life that deals instead of working, for the trade's sweeps and for the
 * reading that crime earns less than work once arrests and time are counted (realism bar B6). Like
 * the thief bot it sees only what a player sees, the options, facts and previews, and draws from
 * its own stream.
 *
 * It buys the most it can afford at the supplier's hours, keeping a week of meals back; stands the
 * corner through the night while it holds something; joins the crew when asked, takes a front when
 * it holds nothing, pays it back once it can, and brings the coworker in when it may. Caught, it
 * posts bail if it can, pleads guilty, or takes HYTA when offered; inside, it works the prison job,
 * writes when it may, and lets the days pass. Otherwise it lives as the thief does.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { REMEDY, RESERVE, STAGE_ONLY } from './bot.ts';
import { tradeOf } from './deal/records.ts';
import type { Need } from './needs.ts';

/** The night hours it stands the corner (tune): when buyers come most. */
const CORNER_FROM = 20;
const CORNER_TO = 3;
/** Held below this, in tenths of a gram, it buys again: about a night's sales (tune). */
const LOW = 50;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const level = (turn: Turn, need: Need): number => turn.fact('life.need', { need }) as number;
const doing = (offered: readonly Action[], activity: string): Action | undefined =>
  offered.find((a) => a.type === 'life/do' && a.activity === activity);
const of = (offered: readonly Action[], type: string): Action | undefined => offered.find((a) => a.type === type);
const firstOf = (...choices: (Action | undefined)[]): Action | undefined => choices.find((c) => c !== undefined);
const cash = (turn: Turn): number => turn.fact('economy.amount', { resource: 'cash' }) as number;

/** The dearest lot it can buy with a week of meals kept back. */
function bestBuy(turn: Turn, offered: readonly Action[]): Action | undefined {
  const buys = offered.filter((a) => a.type === 'deal/buy');
  // Running low: less than a night's sales left (tune).
  if (buys.length === 0 || (turn.fact('deal.held') as number) >= LOW) return undefined;
  const price = (lot: unknown) => tradeOf(turn.content).supplier.sells.find((l) => l.id === lot)?.price ?? 0;
  const affordable = buys.filter((a) => cash(turn) - price(a.lot) >= RESERVE);
  return affordable.at(-1);
}

const atNight = (turn: Turn): boolean => {
  const hour = turn.fact('clock.hour') as number;
  return hour >= CORNER_FROM || hour < CORNER_TO;
};

/** What the law's and prison's modes ask of it. */
function caught(turn: Turn, offered: readonly Action[]): Action | undefined {
  const pleas = offered.filter((a) => a.type === 'law/plead');
  if (pleas.length > 0) return pleas.find((a) => a.plea === 'hyta') ?? pleas.find((a) => a.plea === 'guilty');
  if (turn.mode.id === 'prison') {
    const working = turn.fact('prison.working') === true;
    return firstOf(
      working ? undefined : of(offered, 'prison/work'),
      of(offered, 'prison/write'),
      of(offered, 'prison/day'),
    );
  }
  return firstOf(of(offered, 'law/post-bail'), of(offered, 'law/remand'), of(offered, 'law/wait'));
}

export const dealerFor = (days: number, name = 'dealer'): Policy => ({
  name,
  choose(turn) {
    if ((turn.fact('time.day') as number) >= days) return null;
    const offered = playable(turn);
    if (turn.mode.id === 'shift-event' || turn.mode.id === 'life-event') return turn.rng.pick(offered);
    if (turn.mode.id !== 'world') return caught(turn, offered) ?? turn.rng.pick(offered);
    const owedLaw = (turn.fact('law.owed') as number) + (turn.fact('home.owed') as number);
    const owedFront = turn.fact('deal.owed') as number;
    const lowest = turn.fact('life.lowest') as Need;
    const chosen = firstOf(
      of(offered, 'law/attend'),
      of(offered, 'law/check-in'),
      cash(turn) - owedFront >= RESERVE ? of(offered, 'deal/pay-back') : undefined,
      cash(turn) - owedLaw >= RESERVE ? (of(offered, 'law/pay') ?? of(offered, 'home/pay-owed')) : undefined,
      level(turn, 'food') < 15 ? doing(offered, 'eat') : undefined,
      level(turn, 'rest') < 10 ? doing(offered, 'sleep') : undefined,
      of(offered, 'deal/join'),
      of(offered, 'deal/recruit'),
      (turn.fact('deal.held') as number) < LOW ? of(offered, 'deal/front') : undefined,
      bestBuy(turn, offered),
      atNight(turn) ? of(offered, 'deal/corner') : undefined,
      !atNight(turn) && level(turn, 'rest') < 70 ? doing(offered, 'sleep') : undefined,
      level(turn, lowest) < 40 ? doing(offered, REMEDY[lowest]) : undefined,
      doing(offered, turn.rng.pick(['awake', 'awake', 'relax', 'socialize'])),
    );
    return chosen ?? turn.rng.pick(offered);
  },
});
