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

/** The chronicle's turns in a life: what an epilogue tells (D110). */
const MILESTONES: ReadonlySet<string> = new Set([
  'job/hired',
  'job/promoted',
  'job/let-go',
  'circle/married',
  'circle/divorced',
  'family/born',
  'law/convicted',
  'prison/admitted',
  'prison/paroled',
  'prison/discharged',
  'circle/died',
  'lives/came-of-age',
]);
/** The most an epilogue tells, the latest kept (tune). */
export const EPILOGUE = 8;

/**
 * The life just ended, from the page's journal (D110): its turns since it began, at the start or
 * at the last heir's, the latest EPILOGUE of them.
 */
export function epilogue(life: Life): string[] {
  const j = life.journal;
  let from = 0;
  for (let i = j.length - 1; i >= 0; i--) {
    if ((j[i] as { beat: { type: string } }).beat.type === 'lives/succeeded') {
      from = i + 1;
      break;
    }
  }
  return j
    .slice(from)
    .filter((e) => MILESTONES.has(e.beat.type))
    .slice(-EPILOGUE)
    .map((e) => e.text);
}

export function heirSheet(life: Life): { title: string; lead: string; items: Item[] } {
  const age = life.fact('circle.your-age') as number;
  const e = life.peek<{ cash: number; debts: number; probate: number; left: number; heir: Heir | null }>({
    effect: 'estate',
  });
  const items: Item[] = [];
  const heir = e.heir;
  const told = epilogue(life);
  let lead = `You died at ${age}.${told.length > 0 ? ` ${told.join(' ')}` : ''}`;
  if (!heir) lead += ' Nobody is left to carry on. The city goes on without you.';
  else {
    const years = Math.floor(((life.fact('time.day') as number) - heir.born) / 365);
    const who =
      heir.kind === 'ward'
        ? `${heir.first}, ${RELATION.ward}, is ${years}, and will carry on at 18; the years until then pass at once.`
        : `${heir.first} ${heir.last}, ${RELATION[heir.kind]}, carries on.`;
    lead += ` ${who} ${estateLine(e, heir)}`;
    const go = life.options().find((a) => a.type === 'lives/succeed');
    const label = heir.kind === 'ward' ? `Go on as ${heir.first}, at 18` : `Go on as ${heir.first}`;
    if (go) items.push({ label, action: go });
  }
  items.push({ label: 'Your lives', action: { type: LIVES } });
  return { title: 'Your life ended', lead, items };
}

/** A ward's 18th birthday (D108): the years passed, who raised them, and their first morning of their own. */
export function wardSheet(life: Life): { title: string; lead: string; items: Item[] } {
  const { from, guardian } = life.mode.data as { from: number; guardian: number };
  const day = life.fact('time.day') as number;
  const years = Math.floor((day - from) / 365);
  const first = (life.state.you as { first: string }).first;
  const raised =
    guardian >= 0
      ? `${life.fact('circle.name', { person: guardian }) as string} raised ${first}`
      : `Relatives raised ${first}`;
  const cash = life.fact('economy.amount', { resource: 'cash' }) as number;
  const lead = `${years} years have passed. ${raised}. You are ${first} now, 18 today, with ${money(cash)} left to you.`;
  const begin = life.options().find((a) => a.type === 'lives/begin');
  return { title: `${first} came of age`, lead, items: begin ? [{ label: 'Begin', action: begin }] : [] };
}
