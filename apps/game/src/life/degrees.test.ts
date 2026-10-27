import type { GameState } from '@eb/core';
import { type Bill, type EducationRecord, type EducationSlice, educationOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { billText, type SchoolSection, school } from './school.ts';
import { Life } from './session.ts';
import { money, odds } from './words.ts';

type Edu = EducationSlice;
const edu = (life: Life) => life.state.education as Edu;
/** A life with its education changed: each school's slice merged over what it has. */
function lifeWith(seed: string, finished: string, change: (e: Edu) => Partial<Edu> = () => ({})): Life {
  const life = new Life(seed);
  const e = edu(life);
  const s = life.state;
  return new Life({
    state: {
      ...s,
      education: { ...e, finished, ...change(e) },
      economy: { ...(s.economy as object), amounts: { cash: 50_000_00 } },
    } as GameState,
    kept: [],
  });
}
const section = (life: Life, id: string) => school(life).find((x) => x.id === id) as SchoolSection | undefined;
const itemOf = (life: Life, sec: string, id: string) => section(life, sec)?.items.find((i) => i.id === id);
const r = (life: Life) => educationOf(life.sim.content) as EducationRecord;

describe('the School tab’s university and law school (M4.2 step 4)', () => {
  it('shows the university’s chance as the sim previews it, and applying', () => {
    const life = lifeWith('deg-apply', 'diploma');
    const { chance } = life.peek<{ chance: number }>({ effect: 'admit-odds' });
    const apply = itemOf(life, 'university', 'apply');
    expect(apply?.text).toContain(`About ${odds(chance)} with your record are admitted`);
    expect(apply?.actions.map((a) => a.label)).toEqual(['Apply']);
    life.act(apply?.actions[0]?.action as never);
    const admitted = edu(life).university.admitted;
    if (admitted)
      expect(itemOf(life, 'university', 'record')?.text).toContain(`of the ${r(life).university?.degree} credits`);
    else expect(itemOf(life, 'university', 'wait')?.text).toContain(`${r(life).university?.admit.wait} days`);
    // A conviction on the record lowers it, and the tab says so.
    const base = lifeWith('deg-record', 'ged');
    const convicted = new Life({
      state: { ...base.state, law: { ...(base.state.law as object), convictions: 1 } } as GameState,
      kept: [],
    });
    const lower = convicted.peek<{ chance: number }>({ effect: 'admit-odds' }).chance;
    expect(lower).toBeLessThan(chance);
    expect(itemOf(convicted, 'university', 'apply')?.text).toContain(`About ${odds(lower)} with your record`);
    // No university without a diploma or GED.
    expect(section(lifeWith('deg-none', 'none'), 'university')).toBeUndefined();
  });

  it('enrolls the admitted with the university’s own bill, and lists its classes', () => {
    const life = lifeWith('deg-enroll', 'associate', (e) => ({
      university: { ...e.university, admitted: true, credits: 60, transferred: 60 },
    }));
    expect(itemOf(life, 'university', 'record')?.text).toContain('60 of them came from the college');
    // The life starts on 2 June; fall's term on 2 September, enrolling 60 days before.
    life.act({ type: 'time/advance', minutes: 40 * 24 * 60 });
    const four = itemOf(life, 'university', 'enroll/4/none');
    const bill = life.peek<Bill>({ effect: 'college-bill', school: 'university', courses: 4, borrow: 'none' });
    expect(four?.text).toContain(billText(bill));
    // By evening too (D152), with the same bill.
    const evening = itemOf(life, 'university', 'enroll/4/none/evening');
    expect(evening?.text).toContain('4 courses by evening');
    expect(evening?.text).toContain(billText(bill));
    expect(section(life, 'college')?.items.some((i) => i.id.startsWith('enroll/'))).toBe(false);
    life.act(four?.actions[0]?.action as never);
    expect(section(life, 'university')?.items.filter((i) => /^u-\d+$/.test(i.id)).length).toBe(4);
  });

  it('shows the LSAT’s expected score as studied for, and law school’s chance once there is a score', () => {
    const life = lifeWith('deg-lsat', 'bachelor', (e) => ({
      university: { ...e.university, admitted: true, credits: 120, graded: 120, points: 120 * 3 },
    }));
    const l = r(life).law;
    expect(itemOf(life, 'law', 'apply')?.text).toBe('Law school asks for an LSAT score.');
    const lsat = itemOf(life, 'law', 'lsat');
    expect(lsat?.text).toContain(`costs ${money(l?.lsat.price as number)}`);
    expect(lsat?.text).toContain(`would score about ${l?.lsat.mean}`);
    const study = lsat?.actions.find((a) => a.label === 'Study an hour');
    for (let i = 0; i < 5; i++) life.act(study?.action as never);
    const { expected } = life.peek<{ expected: number }>({ effect: 'lsat-odds' });
    expect(itemOf(life, 'law', 'lsat')?.text).toContain(
      `studied 5 hours for it; a sitting would score about ${expected}`,
    );
    life.act(itemOf(life, 'law', 'lsat')?.actions.find((a) => a.label === 'Take the LSAT')?.action as never);
    const { chance } = life.peek<{ chance: number }>({ effect: 'law-odds' });
    expect(itemOf(life, 'law', 'lsat')?.text).toContain(`Your best LSAT score is ${edu(life).law.lsat}`);
    if (chance > 0) expect(itemOf(life, 'law', 'apply')?.text).toContain(`About ${odds(chance)}`);
  });

  it('shows the JD’s credits once admitted, and the bar with its chance, then the licence', () => {
    const admitted = lifeWith('deg-jd', 'bachelor', (e) => ({ law: { ...e.law, admitted: true, credits: 30 } }));
    expect(itemOf(admitted, 'law', 'record')?.text).toContain(
      `30 of the ${r(admitted).law?.degree} credits for the JD`,
    );
    expect(itemOf(admitted, 'law', 'lsat')).toBeUndefined();
    const jd = lifeWith('deg-bar', 'jd', (e) => ({ law: { ...e.law, admitted: true, barPrep: 100 * 60 } }));
    const { chance } = jd.peek<{ chance: number }>({ effect: 'bar-odds' });
    const bar = itemOf(jd, 'law', 'bar');
    expect(bar?.text).toContain('24 February and 28 July');
    expect(bar?.text).toContain(`studied 100 hours of the ${r(jd).law?.bar.hours}`);
    expect(bar?.text).toContain(`about ${odds(chance)} pass`);
    const licensed = lifeWith('deg-lic', 'jd', (e) => ({ law: { ...e.law, admitted: true, licensed: true } }));
    expect(itemOf(licensed, 'law', 'bar')?.text).toBe('You passed the bar exam. You can practice law.');
    expect(section(licensed, 'finished')?.items[0]?.text).toBe('You have a law degree.');
  });
});
