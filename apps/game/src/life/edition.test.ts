import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { unlockIfDevice, yearEndSheet } from './edition.ts';
import { LIVES } from './menus.ts';
import { Life } from './session.ts';

/** A life stopped at its year's end. */
function ended(): Life {
  const s = new Life('year-end').state;
  return new Life({
    state: { ...s, kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'year-end', data: {} }] } } as GameState,
    kept: [],
  });
}

describe('the free year’s last card (M2.11, D137, D138)', () => {
  it('tells the year and keeps the life until the full game, with a way to your lives', () => {
    const sheet = yearEndSheet(ended(), false);
    expect(sheet?.title).toBe('Your first year');
    expect(sheet?.lead).toMatch(/^A year has passed since your first morning here\./);
    expect(sheet?.lead).toContain('The years after this one come with the full game.');
    expect(sheet?.items.map((i) => i.action.type)).toEqual([LIVES]);
  });

  it('goes on with the life on an unlocked device', () => {
    const sheet = yearEndSheet(ended(), true);
    expect(sheet?.items.map((i) => i.action.type)).toEqual(['edition/unlock', LIVES]);
    expect(sheet?.lead).not.toContain('full game');
  });

  it('unlocks a life as it opens on an unlocked device, and leaves it free otherwise', () => {
    const free = new Life('free');
    unlockIfDevice(free, false);
    expect(free.fact('edition.unlocked')).toBe(false);
    const open = new Life('open');
    unlockIfDevice(open, true);
    expect(open.fact('edition.unlocked')).toBe(true);
    expect(yearEndSheet(open, true)).toBeNull();
  });
});
