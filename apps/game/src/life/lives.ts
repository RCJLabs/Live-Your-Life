/**
 * Your lives (M1.7, D54): the three slots on this device, each a life or empty. A life goes on
 * from where it was saved, or ends for good to free its slot; there is no going back within one.
 * A life that won't load is said so plainly: its save was copied aside, never overwritten.
 */
import { DEFAULT_START, dateOf } from '@lyl/sim';
import { button, el } from './dom.ts';
import type { Listed, Slot } from './keeper.ts';
import { money } from './words.ts';

export interface LivesActions {
  go(slot: Slot): void;
  start(slot: Slot): void;
  end(slot: Slot): void;
}

/** One slot's card: what the life is, and what can be done with it. */
function card(l: Listed, on: LivesActions, confirming: Slot | null, ask: (slot: Slot | null) => void): HTMLElement {
  const n = Number(l.slot.slice(-1));
  if (l.kind === 'empty') {
    return el(
      'li',
      { class: 'life-card', 'data-slot': l.slot },
      el('h2', {}, `Life ${n}`),
      el('p', {}, 'No one yet.'),
      button('Start a life', () => on.start(l.slot), { 'data-do': 'start' }),
    );
  }
  const name = l.kind === 'life' ? l.summary.name : `Life ${n}`;
  const about =
    l.kind === 'life'
      ? `${dateOf(DEFAULT_START, l.summary.day)}, day ${l.summary.day + 1}. ${money(l.summary.cash)}.`
      : 'What this life holds can’t be read. It may still go on.';
  const actions =
    confirming === l.slot
      ? [
          el('p', { class: 'life-warn' }, `This ends ${name}’s life for good. It can’t be brought back.`),
          button('End it for good', () => on.end(l.slot), { 'data-do': 'end-for-good' }),
          button('Keep it', () => ask(null), { 'data-do': 'keep' }),
        ]
      : [
          button('Go on', () => on.go(l.slot), { 'data-do': 'go' }),
          button('End this life', () => ask(l.slot), { 'data-do': 'end' }),
        ];
  return el(
    'li',
    { class: 'life-card', 'data-slot': l.slot },
    el('h2', {}, name),
    el('p', {}, about),
    el('div', { class: 'life-actions' }, ...actions),
  );
}

/** The screen, drawn again whenever the list or the slot being ended changes. */
export function makeLives(on: LivesActions): {
  root: HTMLElement;
  show(list: readonly Listed[], notice?: string): void;
} {
  const notice = el('p', { class: 'lives-notice', id: 'lives-notice', role: 'status', hidden: true });
  const cards = el('ol', { class: 'lives-list' });
  const root = el(
    'section',
    { class: 'lives', id: 'lives', 'aria-label': 'Your lives' },
    el('h1', {}, 'Your lives'),
    notice,
    cards,
  );
  let list: readonly Listed[] = [];
  let confirming: Slot | null = null;
  const draw = () => {
    const ask = (slot: Slot | null) => {
      confirming = slot;
      draw();
    };
    cards.replaceChildren(...list.map((l) => card(l, on, confirming, ask)));
  };
  return {
    root,
    show(next, text) {
      list = next;
      confirming = null;
      notice.textContent = text ?? '';
      notice.hidden = !text;
      draw();
    },
  };
}
