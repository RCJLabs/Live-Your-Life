import type { GameState } from '@eb/core';
import { type Bill, type EducationRecord, type EducationSlice, educationOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { waiting } from './pending.ts';
import { billText, type SchoolSection, school } from './school.ts';
import { Life } from './session.ts';
import { money, odds } from './words.ts';

const changed = (life: Life, change: (s: GameState) => object): Life =>
  new Life({ state: { ...life.state, ...change(life.state) } as GameState, kept: [] });
const withEducation = (life: Life, e: Partial<EducationSlice>, cash = 1_000_000) =>
  changed(life, (s) => ({
    education: { ...(s.education as EducationSlice), ...e },
    economy: { ...(s.economy as object), amounts: { cash } },
  }));
const section = (life: Life, id: string) => school(life).find((x) => x.id === id) as SchoolSection;

describe('the School tab (M2.8 step 6)', () => {
  it('shows the GED without a diploma, each test’s chance as the sim previews it', () => {
    const life = withEducation(new Life('school-ged'), { finished: 'none' });
    const r = educationOf(life.sim.content) as EducationRecord;
    const ged = section(life, 'ged');
    for (const x of r.ged.subjects) {
      const { chance } = life.peek<{ chance: number }>({ effect: 'ged-odds', subject: x.id });
      expect(ged.items.find((i) => i.id === x.id)?.text).toContain(`about ${odds(chance)} pass`);
    }
    const study = ged.items.find((i) => i.id === 'math')?.actions.find((a) => a.label === 'Study an hour');
    expect(study).toBeDefined();
    life.act(study?.action as never);
    const after = section(life, 'ged').items.find((i) => i.id === 'math')?.text;
    expect(after).toContain('studied 1 hour');
    expect(after).toContain(`about ${odds((r.ged.subjects[0]?.pass as number) + r.ged.perHour)} pass`);
    expect(section(life, 'college')).toBeUndefined();
  });

  it('offers enrolling in the window with the bill the sim charges, then lists the term’s classes', () => {
    const life = withEducation(new Life('school-enroll'), {});
    expect(section(life, 'college').items.map((i) => i.id)).toContain('window');
    // With a diploma, no GED to take.
    expect(section(life, 'ged')).toBeUndefined();
    // The life starts on 2 June; fall's term on 1 September, enrolling 28 days before.
    life.act({ type: 'time/advance', minutes: 70 * 24 * 60 });
    const items = section(life, 'college').items.filter((i) => i.id.startsWith('enroll/'));
    expect(items.length).toBeGreaterThan(0);
    const four = items.find((i) => i.id === 'enroll/4/none');
    const bill = life.peek<Bill>({ effect: 'college-bill', courses: 4, borrow: 'none' });
    expect(four?.text).toContain(billText(bill));
    const cash = life.fact('economy.amount', { resource: 'cash' }) as number;
    life.act(four?.actions[0]?.action as never);
    expect(life.fact('economy.amount', { resource: 'cash' })).toBe(cash - bill.cash + bill.refund);
    const after = section(life, 'college').items;
    expect(after.some((i) => i.id === 'term')).toBe(true);
    expect(after.filter((i) => /^c\d+$/.test(i.id)).length).toBe(4);
    expect(after.some((i) => i.id.startsWith('enroll/'))).toBe(false);
  });

  it('shows what the loans owe and what is behind, in the tab and on the Waiting list', () => {
    const life = new Life('school-loans');
    const s = life.state.education as EducationSlice;
    const day = life.fact('time.day') as number;
    const behind = withEducation(
      life,
      { loan: { ...s.loan, owed: 500_000, since: day, repay: day, monthly: 11_300, behind: 11_300 } },
      50_000,
    );
    const loans = section(behind, 'loans');
    expect(loans.items[0]?.text).toContain(`You owe ${money(500_000)}`);
    expect(loans.items[0]?.text).toContain(`You pay ${money(11_300)} on the 1st`);
    expect(loans.items[1]?.actions.map((a) => a.action.type)).toEqual(['education/pay-loan']);
    const w = waiting(behind).find((x) => x.id === 'loans-behind');
    expect(w?.text).toBe(`You’re ${money(11_300)} behind on your student loans.`);
    expect(section(life, 'loans')).toBeUndefined();
  });
});
