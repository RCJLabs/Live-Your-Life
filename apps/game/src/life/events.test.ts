import type { GameState } from '@eb/core';
import { lifeEventOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { lifeEventSheet } from './events.ts';
import { Life } from './session.ts';
import { money, odds } from './words.ts';

/** A life asked about `event` now, with cash to spend. */
function asked(event: string, cents = 100_000): Life {
  const l = new Life('asked');
  const s = l.state;
  return new Life({
    state: {
      ...s,
      kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'life-event', data: { event } }] },
      economy: { ...(s.economy as object), amounts: { cash: cents } },
    } as GameState,
    kept: [],
  });
}

describe('a life event’s sheet (M2.10 step 4, D134)', () => {
  it('shows each choice you can pay for with its price, its time and its odds from the sim', () => {
    const life = asked('loan-asked');
    const sheet = lifeEventSheet(life);
    const e = lifeEventOf(life.sim.content, 'loan-asked');
    expect(sheet?.title).toBe(e.name);
    expect(sheet?.lead).toBe(e.prompt);
    const lend = e.choices[1];
    expect(sheet?.items.map((i) => i.label)).toEqual([e.choices[0]?.text, `${lend?.text}, ${money(lend?.cost ?? 0)}`]);
    expect(sheet?.items[1]?.note).toBe(`This goes your way about ${odds(lend?.odds ?? 0)}.`);
  });

  it('leaves out what you can’t pay for, and is nothing out in the world', () => {
    const life = asked('loan-asked', 100);
    expect(lifeEventSheet(life)?.items).toHaveLength(1);
    expect(lifeEventSheet(new Life('world'))).toBeNull();
  });
});
