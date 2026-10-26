/**
 * The free year's end (M2.11, D137, D138): the last card, the year from the journal, and the way on
 * once the device is unlocked. Until Phase 3's billing, `?unlock` on the page's address is the test
 * switch that unlocks the device; the page then sends the unlock into every life it opens.
 */
import { YEAR_END } from '@lyl/sim';
import { epilogue } from './heir.ts';
import { type Item, LIVES } from './menus.ts';
import type { Life } from './session.ts';

const KEY = 'lyl.unlocked';

/** Whether this device has the full game: the test switch sets it, Phase 3's billing will. */
export function deviceUnlocked(): boolean {
  try {
    if (new URLSearchParams(location.search).has('unlock')) localStorage.setItem(KEY, '1');
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** On an unlocked device, a life opened is unlocked too, so its year never ends. */
export function unlockIfDevice(life: Life, unlocked = deviceUnlocked()): void {
  if (unlocked && life.fact('edition.unlocked') !== true) life.act({ type: 'edition/unlock' });
}

export function yearEndSheet(
  life: Life,
  unlocked = deviceUnlocked(),
): { title: string; lead: string; items: Item[] } | null {
  if (life.mode.id !== YEAR_END) return null;
  const told = epilogue(life);
  const year = `A year has passed since your first morning here.${told.length > 0 ? ` ${told.join(' ')}` : ''}`;
  const items: Item[] = [];
  if (unlocked) items.push({ label: 'Go on with this life', action: { type: 'edition/unlock' } });
  items.push({ label: 'Your lives', action: { type: LIVES } });
  const lead = unlocked
    ? year
    : `${year} The years after this one come with the full game. This life is kept here until then, and a new life starts with a year of its own.`;
  return { title: 'Your first year', lead, items };
}
