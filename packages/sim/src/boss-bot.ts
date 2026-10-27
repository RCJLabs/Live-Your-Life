/**
 * The boss bot (M4.1 step 6): the dealer bot running a crew of its own (D145), for the crew's
 * sweeps and for B6 at this tier. It sees only what a player sees. On top of the dealer's day it
 * meets the connect when the supplier will introduce it, buys weight at wholesale when running low
 * with a week of meals kept back, brings in whoever it may, fronts each member when they are clear,
 * and settles a front gone unpaid: by force or by letting them go, a coin's toss. Evenings it goes
 * out to know people, so there is someone to bring in. It never robs another crew's seller.
 */
import type { Action, Policy, Turn } from '@eb/core';
import { RESERVE, STAGE_ONLY } from './bot.ts';
import { tradeOf } from './deal/records.ts';
import { dealerFor } from './dealer.ts';

/** Held below this, in tenths of a gram, it buys at wholesale: four ounces' fronts (tune). */
const LOW_WHOLESALE = 1200;

const playable = (turn: Turn): Action[] => turn.options.filter((a) => !STAGE_ONLY.has(a.type));
const of = (offered: readonly Action[], type: string): Action[] => offered.filter((a) => a.type === type);
const cash = (turn: Turn): number => turn.fact('economy.amount', { resource: 'cash' }) as number;

/** The connect's dearest lot it can afford with a week of meals kept back, if it is running low. */
function wholesale(turn: Turn, offered: readonly Action[]): Action | undefined {
  if ((turn.fact('deal.held') as number) >= LOW_WHOLESALE) return undefined;
  const lots = tradeOf(turn.content).boss.connect.sells;
  const price = (id: unknown) => lots.find((l) => l.id === id)?.price ?? Number.POSITIVE_INFINITY;
  return of(offered, 'deal/wholesale')
    .filter((a) => cash(turn) - price(a.lot) >= RESERVE)
    .at(-1);
}

/** The crew's business, before the dealer's own. */
function crew(turn: Turn, offered: readonly Action[]): Action | undefined {
  const meet = of(offered, 'deal/meet-connect')[0];
  if (meet) return meet;
  const settle = of(offered, 'deal/collect')[0];
  if (settle) {
    const go = of(offered, 'deal/let-go').find((a) => a.person === settle.person);
    return turn.rng.int(0, 1) === 0 || !go ? settle : go;
  }
  return of(offered, 'deal/take-on')[0] ?? of(offered, 'deal/front-to')[0] ?? wholesale(turn, offered);
}

/** Out in the evening to know people, until the crew is full; home for the night's corner. */
function evening(turn: Turn, offered: readonly Action[]): Action | undefined {
  const hour = turn.fact('clock.hour') as number;
  const out = (turn.fact('circle.out') as number) >= 0;
  const full = (turn.fact('deal.crew-size') as number) >= tradeOf(turn.content).boss.crew.most;
  if (hour >= 17 && hour < 20 && !full) {
    const talk = of(offered, 'circle/talk');
    if (out && talk.length > 0) return turn.rng.pick(talk);
    if (out) return offered.find((a) => a.type === 'life/do' && a.activity === 'socialize');
    const go = of(offered, 'circle/go-out');
    if (go.length > 0) return turn.rng.pick(go);
  }
  return hour >= 20 && out ? of(offered, 'circle/home')[0] : undefined;
}

export const bossFor = (days: number, name = 'boss'): Policy => {
  const dealer = dealerFor(days, name);
  return {
    name,
    choose(turn) {
      if ((turn.fact('time.day') as number) >= days) return null;
      if (turn.mode.id !== 'world' || !turn.content.has('trade', 'cocaine')) return dealer.choose(turn);
      const offered = playable(turn);
      if ((turn.fact('life.need', { need: 'food' }) as number) < 15) return dealer.choose(turn);
      return crew(turn, offered) ?? evening(turn, offered) ?? dealer.choose(turn);
    },
  };
};
