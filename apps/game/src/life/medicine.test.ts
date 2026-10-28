import type { GameState } from '@eb/core';
import { type EducationRecord, type EducationSlice, educationOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { hours, type SchoolSection, school } from './school.ts';
import { Life } from './session.ts';
import { money, odds } from './words.ts';

type Edu = EducationSlice;
const edu = (life: Life) => life.state.education as Edu;
/** A life with its education changed, $50,000 in hand, at ten in the morning. */
function lifeWith(seed: string, finished: string, change: (e: Edu) => Partial<Edu> = () => ({})): Life {
  const base = new Life(seed);
  const e = edu(base);
  const s = base.state;
  const life = new Life({
    state: {
      ...s,
      education: { ...e, finished, ...change(e) },
      economy: { ...(s.economy as object), amounts: { cash: 50_000_00 } },
    } as GameState,
    kept: [],
  });
  life.act({ type: 'clock/wait-until', hour: 10, minute: 0 });
  return life;
}
const section = (life: Life, id: string) => school(life).find((x) => x.id === id) as SchoolSection | undefined;
const itemOf = (life: Life, sec: string, id: string) => section(life, sec)?.items.find((i) => i.id === id);
const labels = (life: Life, sec: string, id: string) => itemOf(life, sec, id)?.actions.map((a) => a.label);
const r = (life: Life) => educationOf(life.sim.content) as EducationRecord;
/** Credits graded at an average of `gpa` hundredths, in whole grade points. */
const graded = (credits: number, gpa: number) => ({ credits, graded: credits, points: (credits * gpa) / 100 });

describe('the School tab’s EMT course (M4.4 step 4)', () => {
  it('says what the course is, and when it can be enrolled in, past high school only', () => {
    const life = lifeWith('m-emt', 'diploma');
    const e = r(life).emt as NonNullable<EducationRecord['emt']>;
    expect(itemOf(life, 'emt', 'record')?.text).toBe(
      `The course is ${e.courses.length} courses taken together in one term, ${e.certificate} credits, meeting in the evenings. Passing both earns the certificate.`,
    );
    expect(itemOf(life, 'emt', 'window')?.text).toBe(`You can enroll in the ${e.enroll} days before a term starts.`);
    expect(section(lifeWith('m-emt-none', 'none'), 'emt')).toBeUndefined();
  });

  it('offers the national exam to the certified at the chance and fee the sim uses, then says how it went', () => {
    const certified = (seed: string) =>
      lifeWith(seed, 'diploma', (x) => {
        const e = r(new Life(seed)).emt as NonNullable<EducationRecord['emt']>;
        return { emt: { ...x.emt, ...graded(e.certificate, 300), passed: e.courses.map((c) => c.id) } };
      });
    const seen = new Set<boolean>();
    for (let i = 0; i < 20 && seen.size < 2; i++) {
      const life = certified(`m-nremt-${i}`);
      const e = r(life).emt as NonNullable<EducationRecord['emt']>;
      expect(itemOf(life, 'emt', 'record')).toBeUndefined();
      const { chance } = life.peek<{ chance: number }>({ effect: 'nremt-odds' });
      expect(itemOf(life, 'emt', 'nremt')?.text).toBe(
        `The national EMT exam costs ${money(e.exam.price)} and takes ${hours(e.exam.minutes)}. About ${odds(chance)} pass a first sitting.`,
      );
      expect(labels(life, 'emt', 'nremt')).toEqual(['Sit the exam']);
      life.act(itemOf(life, 'emt', 'nremt')?.actions[0]?.action as never);
      const passed = edu(life).nremt.licensed;
      seen.add(passed);
      if (passed) expect(itemOf(life, 'emt', 'nremt')?.text).toContain('Ambulance services can hire you');
      else {
        const again = life.peek<{ chance: number }>({ effect: 'nremt-odds' }).chance;
        expect(itemOf(life, 'emt', 'nremt')?.text).toContain(`About ${odds(again)} pass a later sitting.`);
        expect(itemOf(life, 'emt', 'nremt-wait')?.text).toContain(`${e.exam.wait} days`);
      }
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
});

describe('the School tab’s nursing programs (M4.4 step 4)', () => {
  it('says what the college’s program asks, then the chance the sim rolls, and applying', () => {
    const none = lifeWith('m-adn-none', 'diploma');
    const adn = r(none).adn as NonNullable<EducationRecord['adn']>;
    const asks = `It admits after ${adn.admit.credits} college credits at a ${(adn.admit.gpa / 100).toFixed(2)} average or better.`;
    expect(itemOf(none, 'adn', 'apply')?.text).toBe(asks);
    expect(labels(none, 'adn', 'apply')).toEqual([]);
    const ready = lifeWith('m-adn', 'diploma', (x) => ({ college: { ...x.college, ...graded(20, 300) } }));
    const { chance } = ready.peek<{ chance: number }>({ effect: 'nursing-odds', program: 'adn' });
    expect(chance).toBeGreaterThan(0);
    expect(itemOf(ready, 'adn', 'apply')?.text).toBe(`About ${odds(chance)} with your record are admitted.`);
    expect(labels(ready, 'adn', 'apply')).toEqual(['Apply']);
    ready.act(itemOf(ready, 'adn', 'apply')?.actions[0]?.action as never);
    if (edu(ready).adn.admitted)
      expect(itemOf(ready, 'adn', 'record')?.text).toBe(
        `You have 0 of the ${adn.degree} credits for an associate’s in nursing.`,
      );
    else expect(itemOf(ready, 'adn', 'wait')?.text).toContain(`${adn.admit.wait} days`);
    // The university's program is shown to its students only.
    expect(section(ready, 'bsn')).toBeUndefined();
    const student = lifeWith('m-bsn', 'diploma', (x) => ({ university: { ...x.university, admitted: true } }));
    expect(itemOf(student, 'bsn', 'apply')?.text).toContain('university credits');
  });

  it('shows an admitted student’s credits and average, and a finished one the licensing exam at its chance', () => {
    const studying = lifeWith('m-adn-in', 'diploma', (x) => ({
      adn: { ...x.adn, admitted: true, ...graded(12, 350) },
    }));
    const adn = r(studying).adn as NonNullable<EducationRecord['adn']>;
    expect(itemOf(studying, 'adn', 'record')?.text).toBe(
      `You have 12 of the ${adn.degree} credits for an associate’s in nursing, at a 3.50 average.`,
    );
    expect(section(studying, 'nclex')).toBeUndefined();
    const seen = new Set<boolean>();
    for (let i = 0; i < 20 && seen.size < 2; i++) {
      const done = lifeWith(`m-nclex-${i}`, 'associate', (x) => ({
        adn: { ...x.adn, admitted: true },
        nursing: 'adn',
      }));
      const n = r(done).nclex as NonNullable<EducationRecord['nclex']>;
      expect(itemOf(done, 'adn', 'record')?.text).toBe('You finished an associate’s in nursing here.');
      expect(itemOf(done, 'nclex', 'nclex')?.text).toBe(
        `It costs ${money(n.price)} and takes ${hours(n.minutes)}. About ${odds(n.adn)} pass a first sitting with your program.`,
      );
      done.act(itemOf(done, 'nclex', 'nclex')?.actions[0]?.action as never);
      seen.add(edu(done).nclex.licensed);
      if (edu(done).nclex.licensed)
        expect(itemOf(done, 'nclex', 'nclex')?.text).toBe('You passed it. You’re a registered nurse.');
      else expect(itemOf(done, 'nclex', 'nclex-wait')?.text).toContain(`${n.wait} days`);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
});
