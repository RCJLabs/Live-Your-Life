/**
 * An assault or a robbery reported (M4.1 step 3, D146): the police come for you at a time you are
 * told, as for a drug case, and charge what was reported. A night in the cells, then arraignment,
 * bail or remand and the court date, the drug case's path (drugs.ts); at trial, the odds a
 * reported case is won by (trade.json's violence.contest).
 */
import { TRADE, tradeOf } from '../deal/records.ts';
import { todayOf } from '../job/days.ts';
import { courtDay } from '../season/module.ts';
import { between, type Case, type Hold, type LawContext, setTimer, tickOf } from './state.ts';

const trade = (ctx: LawContext) => tradeOf(ctx.content, TRADE);

/** The police at the door for a reported assault or robbery: charged, and held for arraignment. */
export function reported(ctx: LawContext, offence: string): void {
  const t = trade(ctx);
  const today = todayOf(ctx);
  const w = ctx.write();
  const kase: Case = {
    id: w.next++,
    offence,
    value: 0,
    evidence: 'reported',
    // Never on a holiday, when the court is closed (D132).
    court: courtDay(ctx, today.day + between(ctx, t.court.min, t.court.max)),
    warrant: false,
  };
  w.cases.push(kase);
  ctx.emit('charged', { case: kase.id, offence });
  const until = tickOf(today, today.day + 1, t.bail.hour * 60);
  const hold: Hold = { why: 'jail', until, case: kase.id };
  ctx.modes.push('held', hold);
  setTimer(ctx, 'law-arraign', until, [{ effect: 'arraign', case: kase.id }], 'arraignment');
}

/** The odds of winning a reported case at trial. */
export const reportedContest = (v: { content: LawContext['content'] }): number =>
  tradeOf(v.content, TRADE).violence.contest;
