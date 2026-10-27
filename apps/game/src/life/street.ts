/**
 * The street trade and its consequences on the page (M2.4): the corner's menu, and the sheets for
 * bail, a jail term, a drug case in court, and prison. Every number comes from the sim: the odds
 * from the corner-hour's and the parole hearing's previews, prices, weights and sentences from the
 * records the sim reads (CLAUDE.md: odds on screen are the odds rolled, no hand-typed numbers).
 */
import type { Action } from '@eb/core';
import {
  type Case,
  crimeOf,
  type DealSlice,
  type LawState,
  offenceOf,
  type PrisonSlice,
  SHOPLIFTING,
  type TiesSlice,
  tradeOf,
  weight,
} from '@lyl/sim';
import { crewItems, crewLines } from './crew.ts';
import type { Item } from './menus.ts';
import type { Life } from './session.ts';
import { dayText, money, odds, whenText } from './words.ts';

/** The page's own action, not the sim's: pass prison's days a day a frame until something happens (D81). */
export const PASS_DAYS = 'page/pass-days';

const deal = (life: Life) => life.state.deal as DealSlice;
const supplierName = (life: Life) => deal(life).supplier?.first ?? 'The supplier';
const coworkerName = (life: Life) => (life.state.ties as TiesSlice).coworker?.first ?? 'The other cook';
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** The corner's first line: what you hold, and whether the supplier is here. */
export function cornerLead(life: Life): string {
  const held = deal(life).held;
  const holding = held > 0 ? `You hold ${weight(held)}.` : 'You hold nothing to sell.';
  const from = life.fact('deal.supplier-from') as number;
  if (from < 0) return holding;
  const here = life.options().some((a) => a.type === 'deal/buy' || a.type === 'deal/front' || a.type === 'deal/join');
  const hour = String(from).padStart(2, '0');
  const crew = crewLines(life);
  const dirty = life.fact('deal.unexplained') as number;
  const money_ = dirty > 0 ? ` ${money(dirty)} of your cash is the trade's, and no pay explains it.` : '';
  const yours = crew.length > 0 ? ` Your crew: ${crew.join(' ')}` : '';
  return `${holding} ${here ? `${supplierName(life)} is here.` : `${supplierName(life)} comes at ${hour}:00.`}${money_}${yours}`;
}

/** What the corner offers now: buying, an hour's selling, and the crew. */
export function cornerItems(life: Life): Item[] {
  if (!life.sim.content.has('trade', 'cocaine')) return [];
  const t = tradeOf(life.sim.content);
  const options = life.options();
  const items: Item[] = [];
  for (const a of options.filter((x) => x.type === 'deal/buy')) {
    const lot = t.supplier.sells.find((l) => l.id === a.lot);
    if (lot) items.push({ label: `Buy ${weight(lot.grams)} for ${money(lot.price)}`, action: a });
  }
  const corner = options.find((a) => a.type === 'deal/corner');
  if (corner) {
    const p = life.peek<{
      buyer: number;
      seen: number;
      passing: number;
      price: number;
      robbed: number;
      held: boolean;
      left: number;
      trouble: number;
    }>({ effect: 'corner-hour' });
    const held = p.held
      ? p.left > 0
        ? ` Another crew holds this corner: ${p.left === 1 ? 'one warning' : `${p.left} warnings`} left before they run you off.`
        : ` Another crew holds this corner and has warned you: they run you off now, and beat you about ${odds(p.trouble)}.`
      : '';
    const note = `A buyer comes about ${odds(p.buyer)} each ten minutes and pays ${money(p.price)} for ${weight(t.sale.grams)}. ${p.passing} people pass this hour; a sale is seen about ${odds(p.seen)}. You are robbed about ${odds(p.robbed)}.${held}`;
    items.push({ label: 'Sell here for an hour', note, action: corner });
  }
  const crew = t.crew;
  const lot = t.supplier.sells.find((l) => l.id === crew.front.lot);
  const named = (type: string) => options.find((a) => a.type === type);
  const join = named('deal/join');
  if (join) items.push({ label: `Ask ${supplierName(life)} to bring you into the crew`, action: join });
  const front = named('deal/front');
  if (front && lot) {
    const due = dayText(life, (life.fact('time.day') as number) + crew.front.days);
    const note = `You owe ${money(crew.front.price)} by ${due}. Unpaid by then, they stop fronting you.`;
    items.push({ label: `Take ${weight(lot.grams)} on credit`, note, action: front });
  }
  const pay = named('deal/pay-back');
  if (pay) items.push({ label: `Pay ${supplierName(life)} back ${money(deal(life).owed)}`, action: pay });
  const recruit = named('deal/recruit');
  if (recruit) {
    const note = `They keep ${crew.recruit.share} in 100 of what they take. Arrested, they may name you.`;
    items.push({ label: `Ask ${coworkerName(life)} to sell for you`, note, action: recruit });
  }
  return [...items, ...crewItems(life)];
}

/** The court's plea notes for a case: what a guilty plea and HYTA bring, from the records. */
export function pleaNotes(life: Life, k: Case | undefined): { guilty: string; hyta: string } {
  const h = crimeOf(life.sim.content, SHOPLIFTING).hyta;
  const hyta = `Probation for ${h.days} days, with a check-in every ${h.every}. Done, it leaves no public record.`;
  const o = k ? offenceOf(life.sim.content, k.offence) : undefined;
  if (!o?.first) return { guilty: 'A fine and court costs, and a conviction on your record.', hyta };
  const before = (life.state.law as LawState).convictions > 0;
  const guilty =
    before && o.repeat
      ? `A felony, and with a conviction before it, ${o.repeat.prison.min} to ${o.repeat.prison.max} months in prison.`
      : `A felony on your record: up to ${o.first.jail.max} days in jail, then ${o.first.probation} days on probation.`;
  return { guilty, hyta };
}

type SheetOf = { title: string; lead: string; items: Item[] } | null;

function bailSheet(life: Life): SheetOf {
  const id = (life.mode.data as { case: number }).case;
  const k = (life.state.law as LawState).cases.find((x) => x.id === id);
  const t = tradeOf(life.sim.content);
  const posted = Math.floor((t.bail.bond * t.bail.posted) / 100);
  const offence = k ? lower(offenceOf(life.sim.content, k.offence).name) : 'a drug charge';
  const court = k ? dayText(life, k.court) : 'your court date';
  const lead = `You're charged with ${offence}. Bail is ${money(t.bail.bond)}: ${money(posted)} posted lets you go home until ${court}.`;
  const items = life
    .options()
    .map(
      (a): Item =>
        a.type === 'law/post-bail'
          ? { label: `Post ${money(posted)}`, note: 'It comes back to you when the case ends.', action: a }
          : { label: 'Stay in jail until the court date', action: a },
    );
  return { title: 'Arraigned', lead, items };
}

function prisonSheet(life: Life): SheetOf {
  const p = life.state.prison as PrisonSlice;
  const hearing = life.fact('prison.to-hearing') as number;
  const chance = life.peek<{ chance: number }>({ effect: 'parole-odds' }).chance;
  const work = p.job ? 'You work the prison job.' : 'You have no job inside.';
  const lead = `The parole board hears you in ${hearing} days, at about ${odds(chance)} as you stand now. ${work}`;
  const items: Item[] = [{ label: 'Let the days pass', action: { type: PASS_DAYS } }];
  for (const a of life.options()) {
    if (a.type === 'prison/work')
      items.push({ label: p.job ? 'Give up the prison job' : 'Take the prison job', action: a });
    if (a.type === 'prison/write') items.push({ label: `Write to ${coworkerName(life)}`, action: a });
  }
  return { title: 'In prison', lead, items };
}

/**
 * A day of a sentence, as one frame passes it (D81): never the whole sentence in one blocking
 * action. Whether to go on: not once the day brings something to tell (a visit, a hearing, a
 * letter's answer) or the sentence is over, so the prison's sheet comes back.
 */
export function passOneDay(life: Life): boolean {
  if (life.mode.id !== 'prison') return false;
  const told = life.fresh.length;
  life.act({ type: 'prison/day' });
  return life.fresh.length === told && life.mode.id === 'prison';
}

/** A sheet for the modes the street trade brings, or null for any other. */
export function crimeSheet(life: Life): SheetOf {
  const mode = life.mode;
  if (mode.id === 'bail') return bailSheet(life);
  if (mode.id === 'prison') return prisonSheet(life);
  if (mode.id === 'held' && (mode.data as { why: string }).why === 'term') {
    const until = (mode.data as { until: number }).until;
    const items = life
      .options()
      .filter((a: Action) => a.type === 'law/wait')
      .map((a) => ({ label: 'Wait out the sentence', action: a }));
    return { title: 'In jail', lead: `You're serving your sentence. You're let out ${whenText(life, until)}.`, items };
  }
  return null;
}
