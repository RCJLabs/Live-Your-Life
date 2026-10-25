import type { GameState } from '@eb/core';
import { type HealthSlice, type IllnessRecord, illnessOf, kindOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { modeSheet } from './menus.ts';
import { waiting } from './pending.ts';
import { Life } from './session.ts';
import { money } from './words.ts';

const changed = (life: Life, change: (s: GameState) => object): Life =>
  new Life({ state: { ...life.state, ...change(life.state) } as GameState, kept: [] });

/** A life with the flu from today, and its health as given. */
function withFlu(seed: string, level = 100): Life {
  const life = new Life(seed);
  const today = life.fact('time.day') as number;
  return changed(life, (s) => ({
    health: {
      ...(s.health as HealthSlice),
      ill: { kind: 'flu', until: today + 6, off: today + 3, seen: false },
      settled: today,
    },
    life: { ...(s.life as object), levels: { ...(s.life as { levels: object }).levels, health: level } },
  }));
}

/** Forward to the next weekday's 10:00, when the clinic is open. */
function clinicHours(life: Life): Life {
  for (let i = 0; i < 8; i++) {
    const now = life.fact('time.of-day') as number;
    life.act({ type: 'time/advance', minutes: (600 - now + 1440) % 1440 || 1440 });
    const day = life.fact('time.weekday') as string;
    if (day !== 'saturday' && day !== 'sunday') break;
  }
  return life;
}

describe('illness and care on the page (M2.7 step 2)', () => {
  it('tells you what you are ill with, how long, and the doctor’s price from the record', () => {
    const life = clinicHours(withFlu('care-ill'));
    const r = illnessOf(life.sim.content) as IllnessRecord;
    const line = waiting(life).find((w) => w.kind === 'health');
    expect(line?.text).toContain('You have the flu.');
    const cents = r.visit[life.fact('health.coverage') as 'medicaid' | 'none'];
    expect(line?.text).toContain(money(cents));
    expect(line?.actions.map((a) => a.action.type)).toEqual(['health/see-doctor']);
    life.act(line?.actions[0]?.action as never);
    const after = waiting(life).find((w) => w.kind === 'health');
    expect(after?.actions).toEqual([]);
    expect(after?.text).not.toContain('A doctor could see you');
    expect(kindOf(r, 'flu').visit).toBeGreaterThan(0);
  });

  it('shows the hospital’s sheet with its day’s price, and rest until you leave', () => {
    const life = withFlu('care-hospital', 1);
    life.act({ type: 'time/advance', minutes: 1440 });
    const sheet = modeSheet(life);
    expect(sheet?.title).toBe('In hospital');
    const r = illnessOf(life.sim.content) as IllnessRecord;
    const medicaid = life.fact('health.coverage') === 'medicaid';
    const cents = r.hospital[medicaid ? 'medicaid' : 'none'];
    expect(sheet?.lead).toContain(medicaid && cents === 0 ? 'Medicaid pays for it.' : money(cents));
    expect(sheet?.items.map((i) => i.label)).toEqual(['Rest a day']);
    for (let i = 0; i <= r.hospital.days && life.mode.id === 'hospital'; i++) life.act({ type: 'health/rest' });
    expect(life.mode.id).toBe('world');
    expect(modeSheet(life)).toBeNull();
  });
});
