/**
 * What you can do where you stand (M1.6), and the choices the sim stops for: a shift event, the
 * court, being held. A place's menu lists only what the game offers now and the place serves; a
 * choice's odds and stakes are the preview's, the numbers the roll uses (CLAUDE.md: odds on
 * screen are the odds rolled). The clock stops while either is open.
 */
import type { Action } from '@eb/core';
import { fill, type LawState, shiftEventOf, type TiesSlice } from '@lyl/sim';
import { hospitalSheet } from './care.ts';
import { button, el } from './dom.ts';
import { heirSheet } from './heir.ts';
import type { Place } from './places.ts';
import type { Life } from './session.ts';
import { cornerItems, crimeSheet, pleaNotes } from './street.ts';
import { doingText, money, odds } from './words.ts';

export interface Item {
  readonly label: string;
  readonly note?: string;
  readonly action: Action;
}

/** What a place offers now, as menu lines. */
export function itemsAt(life: Life, place: Place): Item[] {
  const options = life.options();
  if (place.kind === 'fixture') {
    // D58: away from the diner during your shift, the bed says so; its sleep ends with the shift.
    const atDiner = life.fact('market.at-diner') === true;
    const due =
      place.building !== 'diner' && life.fact('job.on-shift') === true
        ? `You’re due ${atDiner ? 'at the diner' : 'at work'} now. This sleep ends when your shift does.`
        : undefined;
    return (
      options
        .filter((a) => a.type === 'life/do' && place.serves?.includes(a.activity as never))
        // The diner's work is yours only while your job is there (M2.3); work elsewhere is gone to from the panel.
        .filter((a) => a.activity !== 'work' || atDiner)
        .map((a) => ({
          label: doingText(String(a.activity), a.minutes as number),
          action: a,
          ...(due && a.activity === 'sleep' ? { note: due } : {}),
        }))
    );
  }
  if (place.kind === 'shelf' && place.take) {
    const take = options.find((a) => a.type === 'law/take' && a.spot === place.take?.spot);
    if (!take) return [];
    const p = life.peek<{
      held: number;
      filmed: number;
      value: number;
    }>({ effect: 'theft', spot: take.spot, item: take.item });
    const watched =
      p.filmed > 0 ? ` The camera sees this shelf: it is known from the footage about ${odds(p.filmed)}.` : '';
    const note = `It sells for ${money(p.value)}. Someone stops you about ${odds(p.held)}.${watched}`;
    return [
      {
        label: `Take ${place.label.charAt(0).toLowerCase()}${place.label.slice(1)} without paying`,
        note,
        action: take,
      },
    ];
  }
  if (place.kind === 'corner') return cornerItems(life);
  if (place.kind === 'fence') {
    return options
      .filter((a) => a.type === 'law/sell')
      .map((a) => {
        const p = life.peek<{ paid: number; trouble: number }>({ effect: 'sale', item: a.item });
        const name = (life.sim.content.get('item', String(a.item)) as { name: string }).name;
        const note = `It comes back to you about ${odds(p.trouble)}.`;
        return { label: `Sell ${name.charAt(0).toLowerCase()}${name.slice(1)} for ${money(p.paid)}`, note, action: a };
      });
  }
  return [];
}

export interface Sheet {
  readonly root: HTMLElement;
  readonly open: boolean;
  show(title: string, lead: string | null, items: readonly Item[], leave: string | null): void;
  hide(): void;
}

/** A sheet at the foot of the screen: a title, a line, its items, and a way out if there is one. */
export function makeSheet(id: string, act: (a: Action) => void, closed: () => void): Sheet {
  const root = el('section', { class: 'sheet', id, role: 'dialog', hidden: true });
  const hide = () => {
    root.hidden = true;
    closed();
  };
  return {
    root,
    get open() {
      return !root.hidden;
    },
    show(title, lead, items, leave) {
      const parts: (Node | null)[] = [
        el('h2', {}, title),
        lead ? el('p', { class: 'lead' }, lead) : null,
        ...items.map((i) =>
          el(
            'div',
            { class: 'item' },
            button(
              i.label,
              () => {
                hide();
                act(i.action);
              },
              { 'data-action': i.action.type, 'data-activity': i.action.activity as string | undefined },
            ),
            i.note ? el('p', { class: 'note' }, i.note) : null,
          ),
        ),
        items.length === 0 ? el('p', { class: 'quiet' }, 'There is nothing to do here now.') : null,
        leave ? button(leave, hide, { class: 'button quiet-button', 'data-action': 'leave' }) : null,
      ];
      root.replaceChildren(...parts.filter((x): x is Node => x !== null));
      root.hidden = false;
    },
    hide,
  };
}

/** The coworker's name and pronouns, for a line about them. */
const coworkerOf = (life: Life) =>
  (life.state.ties as TiesSlice).coworker ?? { first: 'The other cook', pronouns: 'they' as const };

/** The page's way back to the lives kept on this device, from a life that has ended. */
export const LIVES = 'page/lives';

/** What a mode the sim is in asks of you, as a sheet's title, line and items; null out in the world. */
export function modeSheet(life: Life): { title: string; lead: string; items: Item[] } | null {
  const mode = life.mode;
  // Out in the world there is nothing to ask, and the options are dear to work out every frame.
  if (mode.id === 'world') return null;
  const crime = crimeSheet(life);
  if (crime) return crime;
  const hospital = hospitalSheet(life);
  if (hospital) return hospital;
  // A death (M2.7, D103): the world has stopped; the heir goes on (heirSheet, D107).
  if (mode.id === 'dead') return heirSheet(life);
  const options = life.options();
  if (mode.id === 'shift-event') {
    const data = mode.data as { event: string; day: number };
    const e = shiftEventOf(life.sim.content, data.event);
    const who = coworkerOf(life);
    const items = options.map((a) => {
      const c = e.choices.find((x) => x.id === a.choice);
      const p = life.peek<{ chance: number }>({ effect: 'shift-choice', ...data, choice: a.choice });
      const note = c?.odds ? `This goes your way about ${odds(p.chance)}.` : undefined;
      return { label: fill(c?.text ?? String(a.choice), who), ...(note ? { note } : {}), action: a };
    });
    return { title: e.name, lead: fill(e.prompt, who), items };
  }
  if (mode.id === 'court') {
    const k = (mode.data as { case: number }).case;
    const notes = pleaNotes(
      life,
      (life.state.law as LawState).cases.find((x) => x.id === k),
    );
    const items = options.map((a) => {
      if (a.plea === 'contest') {
        const p = life.peek<{ chance: number }>({ effect: 'contest', case: k });
        return { label: 'Plead not guilty', note: `The case is dismissed about ${odds(p.chance)}.`, action: a };
      }
      if (a.plea === 'hyta') return { label: 'Plead guilty under HYTA', note: notes.hyta, action: a };
      return { label: 'Plead guilty', note: notes.guilty, action: a };
    });
    return { title: 'In court', lead: 'The judge asks how you plead.', items };
  }
  if (mode.id === 'held') {
    const jail = (mode.data as { why: string }).why === 'jail';
    const items = options.filter((a) => a.type === 'law/wait').map((a) => ({ label: 'Wait', action: a }));
    const lead = jail
      ? 'You are in the cells until your hearing.'
      : 'The clerk is holding you at the till until the police come.';
    return { title: jail ? 'Arrested' : 'Held', lead, items };
  }
  return null;
}
