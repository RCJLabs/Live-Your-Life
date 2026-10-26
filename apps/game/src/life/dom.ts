/**
 * The life's interface on the page (M1.6): a helper for elements, the bar (D50) and the toast line
 * (D52). Plain DOM, as the spike's controls are: buttons are real buttons, 44 px at least, and
 * nothing waits on hover.
 */
import { NEEDS, type Need } from '@lyl/sim';
import type { Life } from './session.ts';
import { clockText, money, NEED_WORD, seasonText } from './words.ts';

type Attrs = Record<string, string | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') e.className = String(v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c !== null && c !== undefined) e.append(c);
  return e;
}

export const button = (label: string, on: () => void, attrs: Attrs = {}): HTMLButtonElement => {
  const b = el('button', { class: 'button', type: 'button', ...attrs }, label);
  b.addEventListener('click', on);
  return b;
};

/** A need as a meter with its word: no number, as VOICE.md asks. */
export const needMeter = (need: Need, level: number): HTMLElement =>
  el(
    'span',
    { class: 'need', 'data-need': need },
    el('span', { class: 'need-word' }, NEED_WORD[need]),
    el('meter', {
      min: '0',
      max: '100',
      low: '25',
      high: '60',
      optimum: '100',
      value: String(level),
      'aria-label': NEED_WORD[need],
    }),
  );

/** The two needs lowest now, the lowest first. */
export function lowestTwo(life: Life): Need[] {
  const levels = Object.fromEntries(NEEDS.map((n) => [n, life.fact('life.need', { need: n }) as number])) as Record<
    Need,
    number
  >;
  const first = life.fact('life.lowest') as Need;
  const rest = NEEDS.filter((n) => n !== first).sort((a, b) => levels[a] - levels[b]);
  return [first, rest[0] as Need];
}

export interface Bar {
  readonly root: HTMLElement;
  update(life: Life, shown: { minute: number; paused: boolean; speed: 1 | 2; waiting: number }): void;
}

export function makeBar(on: { pause(): void; speed(): void; panel(): void; map(): void }): Bar {
  const time = el('p', { class: 'when', id: 'when', 'aria-live': 'off' });
  const play = button('Pause', on.pause, { id: 'play' });
  const speed = button('1×', on.speed, { id: 'speed', 'aria-label': 'Speed 1×' });
  const cash = el('p', { class: 'cash', id: 'cash' });
  const season = el('p', { class: 'season', id: 'season' });
  const needs = el('div', { class: 'needs', id: 'needs' });
  const badge = button('', on.panel, { id: 'badge' });
  const map = button('Map', on.map, { id: 'map-button' });
  const root = el(
    'header',
    { class: 'bar', id: 'bar' },
    el('div', { class: 'bar-row' }, time, season, cash),
    el('div', { class: 'bar-row' }, needs, play, speed, badge, map),
  );
  let shownNeeds = '';
  return {
    root,
    update(life, s) {
      time.textContent = clockText(life, s.minute);
      const today = seasonText(life);
      if (season.textContent !== today) season.textContent = today;
      play.textContent = s.paused ? 'Play' : 'Pause';
      speed.textContent = s.speed === 1 ? '1×' : '4×';
      speed.setAttribute('aria-label', `Speed ${speed.textContent}`);
      cash.textContent = money(life.fact('economy.amount', { resource: 'cash' }) as number);
      badge.textContent = s.waiting > 0 ? `Waiting: ${s.waiting}` : 'Nothing waiting';
      badge.classList.toggle('alert', s.waiting > 0);
      const two = lowestTwo(life);
      const key = two.map((n) => `${n}:${life.fact('life.need', { need: n })}`).join(',');
      if (key !== shownNeeds) {
        shownNeeds = key;
        needs.replaceChildren(...two.map((n) => needMeter(n, life.fact('life.need', { need: n }) as number)));
      }
    },
  };
}

/** The chronicle's newest lines, one at a time at the foot of the screen (D52). */
export function makeToast(): { root: HTMLElement; show(line: string): void; readonly busy: boolean } {
  const root = el('p', { class: 'toast', id: 'toast', role: 'status', hidden: true });
  let until = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    root,
    show(line) {
      root.textContent = line;
      root.hidden = false;
      until = performance.now() + 4000;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        root.hidden = true;
      }, 4000);
    },
    get busy() {
      return performance.now() < until;
    },
  };
}
