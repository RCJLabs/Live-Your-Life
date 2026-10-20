/**
 * The panel the badge opens (D50): what waits on you, the week's shifts to sign up for, all six
 * needs, and the journal (D52). The clock stops while it is open. Every button sends an action
 * the game offers now; nothing here decides what can be done.
 */
import type { Action } from '@eb/core';
import { careerOf, NEEDS, type Need } from '@lyl/sim';
import { button, el, needMeter } from './dom.ts';
import { waiting } from './pending.ts';
import type { Life } from './session.ts';
import { dayText, money, odds } from './words.ts';

export type Tab = 'waiting' | 'week' | 'needs' | 'journal';
const TABS: readonly [Tab, string][] = [
  ['waiting', 'Waiting'],
  ['week', 'Shifts'],
  ['needs', 'Needs'],
  ['journal', 'Journal'],
];

export interface Panel {
  readonly root: HTMLElement;
  readonly open: boolean;
  show(tab?: Tab): void;
  hide(): void;
  refresh(): void;
}

function waitingView(life: Life, act: (a: Action) => void): HTMLElement {
  const items = waiting(life);
  if (items.length === 0) return el('p', { class: 'quiet' }, 'Nothing waits on you.');
  return el(
    'ul',
    { class: 'list', id: 'waiting' },
    ...items.map((w) =>
      el(
        'li',
        { 'data-kind': w.kind, 'data-day': w.day === null ? '' : String(w.day) },
        el('p', {}, w.text),
        ...w.actions.map((a) => button(a.label, () => act(a.action), { 'data-action': a.action.type })),
      ),
    ),
  );
}

function weekView(life: Life, act: (a: Action) => void): HTMLElement {
  const signUps = life.options().filter((a) => a.type === 'job/sign-up');
  if (signUps.length === 0) return el('p', { class: 'quiet' }, 'No shifts are posted that you can sign up for.');
  return el(
    'ul',
    { class: 'list', id: 'postings' },
    ...signUps.map((a) =>
      el(
        'li',
        {},
        el('p', {}, postingText(life, a.day as number)),
        button('Sign up', () => act(a), { 'data-day': String(a.day) }),
      ),
    ),
  );
}

/** "The dinner shift tomorrow, 14:00 to 22:00." */
function postingText(life: Life, day: number): string {
  const posted = (life.state.job as { posted: { day: number; shift: string }[] }).posted.find((p) => p.day === day);
  const kind = careerOf(life.sim.content, 'line-cook').shifts.find((k) => k.id === posted?.shift);
  if (!posted || !kind) return `A shift ${dayText(life, day)}.`;
  const at = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const start = kind.hour * 60 + kind.minute;
  return `The ${posted.shift} shift ${dayText(life, day)}, ${at(start)} to ${at(start + kind.minutes)}.`;
}

function needsView(life: Life): HTMLElement {
  return el(
    'div',
    { class: 'needs-all', id: 'needs-all' },
    ...NEEDS.map((n: Need) => needMeter(n, life.fact('life.need', { need: n }) as number)),
  );
}

function journalView(life: Life): HTMLElement {
  if (life.journal.length === 0) return el('p', { class: 'quiet' }, 'Nothing has happened yet.');
  const days = [...new Set(life.journal.map((e) => e.day))].reverse();
  return el(
    'div',
    { class: 'journal', id: 'journal' },
    ...days.map((day) =>
      el(
        'section',
        {},
        el('h3', {}, dayText(life, day)),
        ...life.journal.filter((e) => e.day === day).map((e) => el('p', {}, e.text)),
      ),
    ),
  );
}

/** A cover's odds, from its preview, beside the shifts you could ask about. */
export function coverOdds(life: Life, day: number): string {
  const p = life.peek<{ chance?: number } | undefined>({ effect: 'cover-ask', day });
  return p?.chance === undefined ? '' : `They say yes about ${odds(p.chance)}.`;
}

export function makePanel(
  life: Life,
  act: (a: Action) => void,
  closed: () => void,
  lives: (() => void) | null = null,
): Panel {
  let tab: Tab = 'waiting';
  const body = el('div', { class: 'panel-body' });
  const tabs = el('nav', { class: 'tabs', 'aria-label': 'Panel' });
  const close = button('Close', () => hide(), { id: 'panel-close' });
  const root = el(
    'section',
    { class: 'panel', id: 'panel', role: 'dialog', 'aria-label': 'Your life', hidden: true },
    el('div', { class: 'panel-head' }, tabs, close),
    body,
    // The way back to the lives kept on this device (M1.7): the life is saved before it goes.
    ...(lives ? [el('div', { class: 'panel-foot' }, button('Your lives', lives, { id: 'lives-button' }))] : []),
  );
  const send = (a: Action) => {
    act(a);
    refresh();
  };
  function refresh(): void {
    tabs.replaceChildren(
      ...TABS.map(([id, label]) =>
        button(
          label,
          () => {
            tab = id;
            refresh();
          },
          { 'aria-pressed': String(id === tab), 'data-tab': id },
        ),
      ),
    );
    const owed = life.fact('home.owed') as number;
    const view =
      tab === 'waiting'
        ? waitingView(life, send)
        : tab === 'week'
          ? weekView(life, send)
          : tab === 'needs'
            ? needsView(life)
            : journalView(life);
    body.replaceChildren(view, ...(owed > 0 && tab === 'waiting' ? [rent(life, owed, send)] : []));
  }
  function hide(): void {
    root.hidden = true;
    closed();
  }
  return {
    root,
    get open() {
      return !root.hidden;
    },
    show(t) {
      if (t) tab = t;
      root.hidden = false;
      refresh();
    },
    hide,
    refresh,
  };
}

function rent(life: Life, owed: number, act: (a: Action) => void): HTMLElement {
  const pay = life.options().find((a) => a.type === 'home/pay-owed');
  return el(
    'p',
    { class: 'rent' },
    `You owe ${money(owed)} in rent. `,
    pay ? button('Pay the rent', () => act(pay), { 'data-action': pay.type }) : null,
  );
}
