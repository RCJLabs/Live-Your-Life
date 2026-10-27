/**
 * The School tab's university and law school (M4.2 step 4, D149, D150): applying at the chance
 * shown, credits brought over, the terms and classes as the college's, the LSAT and its expected
 * score, and the bar exam. Every chance, score and price comes from the sim's previews and
 * records, the ones it rolls and charges.
 */
import type { EducationSlice } from '@lyl/sim';
import { educationOf } from '@lyl/sim';
import { classes, enrolling, hours, item, offered, type SchoolItem, type SchoolSection } from './school.ts';
import type { Life } from './session.ts';
import { money, odds } from './words.ts';

const average = (n: number) => (n / 100).toFixed(2);
const titled = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const acting = (life: Life, type: string, label: string): SchoolItem['actions'] =>
  offered(life, type).map((action) => ({ label, action }));
const studying = (life: Life, subject: string): SchoolItem['actions'] =>
  offered(life, 'education/study', (a) => a.subject === subject).map((action) => ({ label: 'Study an hour', action }));

/** The university: applying until admitted, then the bachelor's credits, the term and enrolling. */
export function university(life: Life, s: EducationSlice): SchoolSection[] {
  const u = educationOf(life.sim.content)?.university;
  if (!u || s.finished === 'none') return [];
  const items: SchoolItem[] = [];
  if (!s.university.admitted) {
    const { chance } = life.peek<{ chance: number }>({ effect: 'admit-odds' });
    const apply = acting(life, 'education/apply', 'Apply');
    const text =
      chance > 0
        ? `About ${odds(chance)} with your record are admitted. Up to ${u.transfer} college credits come with you.`
        : s.college.graded > 0
          ? `It takes transfers with a college average of ${average(u.admit.gpa)} or better.`
          : 'It admits those with a high school diploma or a GED.';
    items.push(item('apply', text, apply));
    if (apply.length === 0 && chance > 0 && s.university.applied >= 0)
      items.push(item('wait', `You can apply again ${u.admit.wait} days after you last did.`, [], true));
  } else {
    const gpa = life.fact('education.degree-gpa') as number;
    const from = s.university.transferred > 0 ? ` ${s.university.transferred} of them came from the college.` : '';
    const text =
      s.finished === 'bachelor' || s.finished === 'jd'
        ? 'You finished your bachelor’s here.'
        : `You have ${s.university.credits} of the ${u.degree} credits for a bachelor’s${s.university.graded > 0 ? `, at a ${average(gpa)} average` : ''}.${from}`;
    items.push(item('record', text));
    items.push(...classes(life, s.university.term, u), ...enrolling(life, 'university'));
  }
  return [{ id: 'university', title: titled(u.name), items }];
}

/** The LSAT: your best score, the study, the score a sitting falls about now, and sitting it. */
function lsat(life: Life, s: EducationSlice): SchoolItem[] {
  const l = educationOf(life.sim.content)?.law;
  const study = studying(life, 'lsat');
  const sit = acting(life, 'education/take-lsat', 'Take the LSAT');
  if (!l || s.law.admitted || (study.length === 0 && sit.length === 0 && s.law.lsat < 0)) return [];
  const { expected } = life.peek<{ expected: number }>({ effect: 'lsat-odds' });
  const best = s.law.lsat >= 0 ? `Your best LSAT score is ${s.law.lsat}. ` : '';
  const text = `${best}The LSAT costs ${money(l.lsat.price)}. You’ve studied ${hours(s.law.prep)} for it; a sitting would score about ${expected}.`;
  return [item('lsat', text, [...study, ...sit])];
}

/** Applying to law school, on the LSAT and the university's average. */
function applying(life: Life, s: EducationSlice): SchoolItem[] {
  const l = educationOf(life.sim.content)?.law;
  if (!l || s.law.admitted || s.finished !== 'bachelor') return [];
  if (s.law.lsat < 0) return [item('apply', 'Law school asks for an LSAT score.', [], true)];
  const { chance } = life.peek<{ chance: number }>({ effect: 'law-odds' });
  const apply = acting(life, 'education/apply-law', 'Apply');
  const text =
    chance > 0
      ? `About ${odds(chance)} with your score and average are admitted.`
      : 'With your score and average, law school won’t admit you.';
  const wait =
    apply.length === 0 && chance > 0 && s.law.applied >= 0
      ? [item('wait', `You can apply again ${l.admit.wait} days after you last did.`, [], true)]
      : [];
  return [item('apply', text, apply), ...wait];
}

/** The bar exam: the chance with the study done, its days and its fee. */
function bar(life: Life, s: EducationSlice): SchoolItem[] {
  const l = educationOf(life.sim.content)?.law;
  if (!l) return [];
  if (s.law.licensed) return [item('bar', 'You passed the bar exam. You can practice law.')];
  const study = studying(life, 'bar');
  if (s.finished !== 'jd' && study.length === 0) return [];
  const { chance } = life.peek<{ chance: number }>({ effect: 'bar-odds' });
  const fee = s.law.tries === 0 ? l.bar.price : l.bar.again;
  const months = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const days = l.bar.days.map((d) => `${d.day} ${months[d.month]}`).join(' and ');
  const text = `The bar exam is given on the mornings of ${days}, for ${money(fee)}. You’ve studied ${hours(s.law.barPrep)} of the ${l.bar.hours} hours it asks; about ${odds(chance)} pass so prepared.`;
  return [item('bar', text, [...study, ...acting(life, 'education/sit-bar', 'Sit the bar exam')])];
}

/** Law school: the LSAT and applying with a bachelor's, the JD's credits and terms, and the bar. */
export function lawSchool(life: Life, s: EducationSlice): SchoolSection[] {
  const l = educationOf(life.sim.content)?.law;
  if (!l) return [];
  const items: SchoolItem[] = [...lsat(life, s), ...applying(life, s)];
  if (s.law.admitted && s.finished !== 'jd') {
    const gpa = s.law.graded > 0 ? Math.floor((s.law.points * 100) / s.law.graded) : 0;
    const avg = s.law.graded > 0 ? `, at a ${average(gpa)} average` : '';
    items.push(item('record', `You have ${s.law.credits} of the ${l.degree} credits for the JD${avg}.`));
    items.push(...classes(life, s.law.term, l), ...enrolling(life, 'law'));
  }
  items.push(...bar(life, s));
  return items.length > 0 ? [{ id: 'law', title: titled(l.name), items }] : [];
}
