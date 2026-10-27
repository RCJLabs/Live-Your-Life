/**
 * A crew of your own on the page (M4.1 step 5, D145–D148): the connect and their weight, the people
 * you can bring in, each member's front and what they owe, and the hard ways a debt or a corner is
 * settled. Every odds is the sim's preview and every price and weight the trade's record.
 */
import { type DealSlice, tradeOf, weight } from '@lyl/sim';
import type { Item } from './menus.ts';
import type { Life } from './session.ts';
import { dayText, money, odds } from './words.ts';

const deal = (life: Life) => life.state.deal as DealSlice;
const nameOf = (life: Life, person: number) => life.fact('circle.name', { person }) as string;

/** Each member of your crew, as a line: what they hold, owe and by when, and whether they are cut off or run off. */
export function crewLines(life: Life): string[] {
  const today = life.fact('time.day') as number;
  return deal(life).members.map((m) => {
    const name = nameOf(life, m.person);
    const holds = m.held > 0 ? `holds ${weight(m.held)}` : 'holds nothing of yours';
    const owes = m.owed > 0 ? `, owes you ${money(m.owed)} by ${dayText(life, m.due)}` : '';
    const cut = m.cutOff ? ', cut off for a front unpaid' : '';
    const off = m.rival.off > today ? `, run off their corner until ${dayText(life, m.rival.off)}` : '';
    return `${name} ${holds}${owes}${cut}${off}.`;
  });
}

/** What the corner adds for your crew: the connect, bringing people in, fronts, collecting, letting go, robbing. */
export function crewItems(life: Life): Item[] {
  if (!life.sim.content.has('trade', 'cocaine')) return [];
  const t = tradeOf(life.sim.content);
  const options = life.options();
  const items: Item[] = [];
  const meet = options.find((a) => a.type === 'deal/meet-connect');
  if (meet) {
    const note = `They sell by the quarter and half kilo, ${t.boss.connect.hours.from}:00 to ${t.boss.connect.hours.to}:00.`;
    items.push({ label: 'Ask to meet the one they buy from', note, action: meet });
  }
  for (const a of options.filter((x) => x.type === 'deal/wholesale')) {
    const lot = t.boss.connect.sells.find((l) => l.id === a.lot);
    if (lot) items.push({ label: `Buy ${weight(lot.grams)} from the connect for ${money(lot.price)}`, action: a });
  }
  const f = t.boss.crew.front;
  for (const a of options.filter((x) => x.type === 'deal/take-on')) {
    const note = `You front them ${weight(f.grams)} at a time, ${money(f.price)} owed within ${f.days} days. Arrested, they may name you.`;
    items.push({ label: `Ask ${nameOf(life, a.person as number)} to sell for you`, note, action: a });
  }
  for (const a of options.filter((x) => x.type === 'deal/front-to')) {
    const due = dayText(life, (life.fact('time.day') as number) + f.days);
    items.push({
      label: `Front ${nameOf(life, a.person as number)} ${weight(f.grams)}`,
      note: `${money(f.price)} owed back by ${due}.`,
      action: a,
    });
  }
  for (const a of options.filter((x) => x.type === 'deal/collect')) {
    const p = life.peek<{ win: number; hurt: number; yours: number; reported: number }>({
      effect: 'collect-roll',
      person: a.person,
    });
    const note = `You get it about ${odds(p.win)}, and hurt them about ${odds(p.hurt)}; if not, you are hurt about ${odds(p.yours)}. Either way they are out of the crew. It is reported about ${odds(p.reported)}.`;
    items.push({ label: `Take what ${nameOf(life, a.person as number)} owes by force`, note, action: a });
  }
  for (const a of options.filter((x) => x.type === 'deal/let-go')) {
    const m = deal(life).members.find((x) => x.person === a.person);
    const note = m && m.owed > 0 ? `What they owe you, ${money(m.owed)}, goes with them.` : undefined;
    items.push({
      label: `Let ${nameOf(life, a.person as number)} go from the crew`,
      ...(note ? { note } : {}),
      action: a,
    });
  }
  const rob = options.find((a) => a.type === 'deal/rob');
  if (rob) {
    const p = life.peek<{ win: number; yours: number; seen: number; min: number; max: number }>({ effect: 'rob-roll' });
    const note = `You get ${money(p.min)} to ${money(p.max)} about ${odds(p.win)}; if not, you are hurt about ${odds(p.yours)}. Either way it draws the police's eye, and it is reported about ${odds(p.seen)}.`;
    items.push({ label: 'Rob the other crew’s seller', note, action: rob });
  }
  return items;
}
