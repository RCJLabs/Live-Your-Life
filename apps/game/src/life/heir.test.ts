import type { GameState } from '@eb/core';
import { newTie } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { modeSheet } from './menus.ts';
import { Life } from './session.ts';
import { money } from './words.ts';

/** A life that has died on day 3 with a spouse, and the cash and rent owed as given. */
function deadWithSpouse(seed: string, cash: number, owed: number): { life: Life; person: number } {
  const alive = new Life(seed);
  const s = alive.state;
  const person = 40;
  const tie = { ...newTie(person, 6000, 0), status: 'married' as const, living: true, since: 0 };
  const dead = {
    ...s,
    lives: { ...(s.lives as object), died: 3 },
    circle: { ...(s.circle as object), ties: [tie] },
    economy: { ...(s.economy as object), amounts: { cash } },
    home: { owed },
    kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'dead', data: {} }] },
  } as GameState;
  return { life: new Life({ state: dead, kept: [] }), person };
}

describe('the heir on the page (M2.7 step 3, D107, D109)', () => {
  it('names who carries on and what the estate came to, from its preview, and goes on as them', () => {
    const { life, person } = deadWithSpouse('page-heir', 120_000, 20_000);
    const name = life.fact('circle.name', { person }) as string;
    const first = name.split(' ')[0] as string;
    const sheet = modeSheet(life);
    expect(sheet?.lead).toContain(`${name}, your partner, carries on.`);
    expect(sheet?.lead).toContain(`You left ${money(120_000)}. Of it, ${money(20_000)} went to your debts.`);
    expect(sheet?.lead).toContain(`${first} is left ${money(100_000)}.`);
    const go = sheet?.items.find((i) => i.label === `Go on as ${first}`);
    expect(go).toBeDefined();
    expect(life.act(go?.action as never)).toBe(true);
    expect(life.mode.id).toBe('world');
    expect((life.state.you as { first: string }).first).toBe(first);
    expect(modeSheet(life)).toBeNull();
  });

  it('passes a ward’s years at once, says who raised them, and begins their life at 18', () => {
    const alive = new Life('page-ward');
    const s = alive.state;
    const day = alive.fact('time.day') as number;
    const child = {
      born: day - 10 * 365,
      first: 'Mae',
      last: 'K',
      pronouns: 'she',
      carries: true,
      other: -2,
      with: 'you',
      parted: -1,
    };
    const dead = {
      ...s,
      lives: { ...(s.lives as object), died: day },
      family: { ...(s.family as object), children: [child] },
      kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'dead', data: {} }] },
    } as GameState;
    const life = new Life({ state: dead, kept: [] });
    const go = modeSheet(life)?.items.find((i) => i.label === 'Go on as Mae, at 18');
    expect(go).toBeDefined();
    expect(life.act(go?.action as never)).toBe(true);
    const sheet = modeSheet(life);
    expect(sheet?.title).toBe('Mae came of age');
    expect(sheet?.lead).toContain('8 years have passed. Relatives raised Mae.');
    expect(life.act(sheet?.items[0]?.action as never)).toBe(true);
    expect(life.mode.id).toBe('world');
    expect(life.fact('circle.your-age')).toBe(18);
  });
});
