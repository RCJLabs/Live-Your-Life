/**
 * The People tab (M2.6 step 5): where you can go out and who is there, and the people you know,
 * each with what you can do with them now. Every button is an action the game offers now, and
 * every chance and cost is the sim's preview or its record, never typed here (CLAUDE.md).
 */
import type { Action } from '@eb/core';
import { type CircleSlice, courtshipOf, partnered, type Tie } from '@lyl/sim';
import type { Work } from '../city/workplace.ts';
import { button, el } from './dom.ts';
import { familyView } from './family.ts';
import type { Life } from './session.ts';
import { dayText, money, odds } from './words.ts';

/** What the panel sends to go out or come home: the page's, which walks you there and back. */
export const TRIP_OUT = 'trip/out';
export const TRIP_HOME = 'trip/home';

const circleOf = (life: Life) => life.state.circle as CircleSlice;
const first = (life: Life, person: number) => (life.fact('circle.name', { person }) as string).split(' ')[0] ?? '';

/** A chance in ten thousand as the interface states it: "2 in 100", "2 in 1,000". */
export function inTenThousand(chance: number): string {
  if (chance % 100 === 0) return odds(chance / 100);
  if (chance % 10 === 0) return `${chance / 10} in 1,000`;
  return `${chance} in 10,000`;
}

const KNOWN = [
  [20, 'You’ve met.'],
  [45, 'You know each other a little.'],
  [70, 'You know each other well.'],
  [101, 'You’re close.'],
] as const;
const REGARD = [
  [30, 'cold toward you'],
  [45, 'cool toward you'],
  [60, 'easy with you'],
  [80, 'warm toward you'],
  [101, 'fond of you'],
] as const;
const STATUS: Readonly<Record<string, string>> = {
  dating: 'You’re seeing each other.',
  engaged: 'You’re engaged.',
  married: 'You’re married.',
  separated: 'You’re separated.',
  ex: 'You were together once.',
  divorced: 'You’re divorced.',
};

const word = <T extends readonly (readonly [number, string])[]>(table: T, n: number) =>
  (table.find(([upTo]) => n < upTo) ?? table[table.length - 1])?.[1] ?? '';

/** The place a roster place is: its building's name, lower-cased, or a bar. */
function placeName(life: Life, work: Work, place: number): string {
  const id = work.placed.building[place] ?? '';
  const name = id ? life.sim.content.get<{ name: string }>('building', id)?.name : undefined;
  return name ? `the ${name.toLowerCase()}` : 'a bar';
}

function outView(life: Life, work: Work, act: (a: Action) => void): HTMLElement {
  const out = life.fact('circle.out') as number;
  if (out >= 0) {
    const walk = work.walkToPlace(out)?.minutes ?? 0;
    const stay = life.options().find((a) => a.type === 'life/do' && a.activity === 'socialize');
    return el(
      'div',
      { id: 'out' },
      el('p', {}, `You’re out at ${placeName(life, work, out)}. Spend the evening here to meet people.`),
      stay ? button('Stay for the evening', () => act(stay), { 'data-action': 'life/do' }) : null,
      button(`Go home, a ${walk}-minute walk`, () => act({ type: TRIP_HOME }), { 'data-action': TRIP_HOME }),
    );
  }
  const haunts = life.options().filter((a) => a.type === 'circle/go-out');
  if (haunts.length === 0) return el('p', { class: 'quiet', id: 'out' }, 'There is nowhere to go out to now.');
  return el(
    'ul',
    { class: 'list', id: 'out' },
    ...haunts.map((a) => {
      const place = a.place as number;
      const walk = work.walkToPlace(place)?.minutes ?? 0;
      return el(
        'li',
        {},
        button(
          `Go out to ${placeName(life, work, place)}, a ${walk}-minute walk`,
          () => act({ type: TRIP_OUT, place }),
          {
            'data-action': TRIP_OUT,
          },
        ),
      );
    }),
  );
}

/** A button for an action, with a line under it. */
const step = (label: string, note: string | null, a: Action, act: (a: Action) => void) =>
  el(
    'div',
    { class: 'item' },
    button(label, () => act(a), { 'data-action': a.type }),
    note ? el('p', { class: 'note' }, note) : null,
  );

/** What can be done with someone now, each with its chance or cost from the sim. */
function actionsFor(life: Life, t: Tie, act: (a: Action) => void): HTMLElement[] {
  const c = courtshipOf(life.sim.content);
  const name = first(life, t.person);
  const chance = (effect: string, extra: Record<string, unknown> = {}) =>
    life.peek<{ chance: number }>({ effect, person: t.person, ...extra }).chance;
  return life
    .options()
    .filter((a) => a.person === t.person)
    .map((a) => {
      switch (a.type) {
        case 'circle/talk':
          return step('Talk', `It goes well about ${odds(chance('talk-roll'))}.`, a, act);
        case 'circle/ask-out':
          return step(`Ask ${name} out`, `${name} says yes about ${odds(chance('ask-roll'))}.`, a, act);
        case 'circle/plan-date':
          return step('Plan a date', 'It’s set for the next evening you aren’t working.', a, act);
        case 'circle/go-on-date': {
          const p = life.peek<{ chance: number; cost: number; found: { person: number; chance: number }[] }>({
            effect: 'date-roll',
            person: t.person,
          });
          const found = p.found.map((f) => ` ${first(life, f.person)} may find out, about ${odds(f.chance)}.`).join('');
          return step(
            'Go on the date',
            `It costs ${money(p.cost)}. It goes well about ${odds(p.chance)}.${found}`,
            a,
            act,
          );
        }
        case 'circle/stay-night': {
          const p = life.peek<{ chance: number; pregnancy: number }>({
            effect: 'night-roll',
            person: t.person,
            protect: a.protect,
          });
          const preg = p.pregnancy > 0 ? ` A pregnancy follows about ${inTenThousand(p.pregnancy)}.` : '';
          const label = a.protect ? `Ask ${name} to stay, with protection` : `Ask ${name} to stay, without`;
          return step(label, `${name} says yes about ${odds(p.chance)}.${preg}`, a, act);
        }
        case 'circle/ask-in':
          return step(`Ask ${name} to move in`, `${name} says yes about ${odds(chance('move-in-roll'))}.`, a, act);
        case 'circle/propose':
          return step(`Ask ${name} to marry you`, `${name} says yes about ${odds(chance('propose-roll'))}.`, a, act);
        case 'circle/licence':
          return step('Apply for a marriage licence', `It costs ${money(c.licence.fee)}.`, a, act);
        case 'circle/marry':
          return step(`Marry ${name} before a magistrate`, `It costs ${money(c.wedding.fee)}.`, a, act);
        case 'circle/separate':
          return step('Separate', null, a, act);
        case 'circle/file-divorce':
          return step('File for divorce', `It costs ${money(c.divorce.fee)}.`, a, act);
        case 'circle/break-up':
          return step(`End it with ${name}`, null, a, act);
        default:
          return step(a.type, null, a, act);
      }
    });
}

function personView(life: Life, t: Tie, act: (a: Action) => void): HTMLElement {
  const fam = life.fact('circle.familiarity', { person: t.person }) as number;
  const regard = life.fact('circle.regard', { person: t.person }) as number;
  const age = life.fact('circle.age', { person: t.person }) as number;
  const name = life.fact('circle.name', { person: t.person }) as string;
  const lines = [
    `${name}, ${age}. ${word(KNOWN, fam)} ${first(life, t.person)} is ${word(REGARD, regard)}.`,
    STATUS[t.status] ?? '',
    t.living ? 'You live together.' : '',
    t.date ? `You have a date ${dayText(life, t.date.day)} evening.` : '',
  ].filter((x) => x !== '');
  return el(
    'li',
    { 'data-person': String(t.person), 'data-status': t.status },
    el('p', {}, lines.join(' ')),
    ...actionsFor(life, t, act),
  );
}

export function peopleView(life: Life, work: Work, act: (a: Action) => void): HTMLElement {
  const ties = [...circleOf(life).ties].sort(
    (a, b) => Number(partnered(b)) - Number(partnered(a)) || b.together - a.together,
  );
  return el(
    'div',
    { id: 'people' },
    el('h2', {}, 'Going out'),
    outView(life, work, act),
    el('h2', {}, 'People you know'),
    ties.length > 0
      ? el('ul', { class: 'list', id: 'ties' }, ...ties.map((t) => personView(life, t, act)))
      : el('p', { class: 'quiet', id: 'ties' }, 'You don’t know anyone in the city yet. Go out to meet people.'),
    familyView(life, act),
  );
}
