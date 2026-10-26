/**
 * A life event's sheet (M2.10 step 4, D134): what happened, and each choice you can pay for, with
 * its price, its time and its odds from the preview the sim rolls with.
 */
import { LIFE_EVENT, lifeEventOf } from '@lyl/sim';
import type { Item } from './menus.ts';
import type { Life } from './session.ts';
import { hours, money, odds } from './words.ts';

export function lifeEventSheet(life: Life): { title: string; lead: string; items: Item[] } | null {
  if (life.mode.id !== LIFE_EVENT) return null;
  const event = (life.mode.data as { event: string }).event;
  const e = lifeEventOf(life.sim.content, event);
  const items = life.options().map((a) => {
    const c = e.choices.find((x) => x.id === a.choice);
    const p = life.peek<{ chance: number; cost: number; minutes: number }>({
      effect: 'life-choice',
      event,
      choice: a.choice,
    });
    const label = `${c?.text ?? String(a.choice)}${p.cost > 0 ? `, ${money(p.cost)}` : ''}`;
    const parts = [
      p.minutes > 0 ? `It takes ${hours(p.minutes)}.` : '',
      c?.odds !== undefined ? `This goes your way about ${odds(p.chance)}.` : '',
    ].filter(Boolean);
    return { label, ...(parts.length > 0 ? { note: parts.join(' ') } : {}), action: a };
  });
  return { title: e.name, lead: e.prompt, items };
}
