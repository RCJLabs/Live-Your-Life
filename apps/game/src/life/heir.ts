/**
 * A death on the page, and the heir (M2.7 step 3, D20, D107, D109): who carries on, what you left,
 * and what the debts and probate took, from the estate's preview, the figures the sim settles
 * with (CLAUDE.md: no hand-typed numbers). A child too young to carry on waits for the ward's
 * jump to 18 (D108).
 */
import { type Item, LIVES } from './menus.ts';
import type { Life } from './session.ts';
import { money } from './words.ts';

interface Heir {
  readonly kind: 'child' | 'partner' | 'ward' | 'friend';
  readonly first: string;
  readonly last: string;
  readonly born: number;
}

const RELATION: Readonly<Record<Heir['kind'], string>> = {
  child: 'your child',
  partner: 'your partner',
  ward: 'your child',
  friend: 'your friend',
};

/** What the estate came to: what you left, the debts and probate taken from it, and the heir's share. */
function estateLine(e: { cash: number; debts: number; probate: number; left: number }, heir: Heir): string {
  const taken = [
    e.debts > 0 ? `${money(Math.min(e.debts, e.cash))} went to your debts` : null,
    e.probate > 0 ? `${money(e.probate)} to probate` : null,
  ].filter((x) => x !== null);
  const from = taken.length > 0 ? ` Of it, ${taken.join(' and ')}.` : '';
  return `You left ${money(e.cash)}.${from} ${heir.first} is left ${money(e.left)}.`;
}

export function heirSheet(life: Life): { title: string; lead: string; items: Item[] } {
  const age = life.fact('circle.your-age') as number;
  const e = life.peek<{ cash: number; debts: number; probate: number; left: number; heir: Heir | null }>({
    effect: 'estate',
  });
  const items: Item[] = [];
  const heir = e.heir;
  let lead = `You died at ${age}.`;
  if (!heir) lead += ' Nobody is left to carry on. The city goes on without you.';
  else if (heir.kind === 'ward') {
    const years = Math.floor(((life.fact('time.day') as number) - heir.born) / 365);
    lead += ` ${heir.first}, ${RELATION.ward}, is ${years}: too young yet to carry on.`;
  } else {
    lead += ` ${heir.first} ${heir.last}, ${RELATION[heir.kind]}, carries on. ${estateLine(e, heir)}`;
    const go = life.options().find((a) => a.type === 'lives/succeed');
    if (go) items.push({ label: `Go on as ${heir.first}`, action: go });
  }
  items.push({ label: 'Your lives', action: { type: LIVES } });
  return { title: 'Your life ended', lead, items };
}
