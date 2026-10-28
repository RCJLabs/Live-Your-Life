/**
 * The School tab's medicine (M4.4 step 4, D163): the EMT course at the college and the national
 * exam after it; the nursing programs, the college's and the university's, applied to at the
 * chance shown, their terms and classes as any school's; and the nursing licensing exam once one
 * is finished. Every chance, price and length comes from the sim's previews and records.
 */
import type { Action } from '@eb/core';
import type { EducationSlice } from '@lyl/sim';
import { educationOf } from '@lyl/sim';
import { classes, enrolling, hours, item, offered, type SchoolItem, type SchoolSection } from './school.ts';
import type { Life } from './session.ts';
import { money, odds } from './words.ts';

const average = (n: number) => (n / 100).toFixed(2);
const titled = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const acting = (life: Life, type: string, label: string, match?: (a: Action) => boolean) =>
  offered(life, type, match).map((action) => ({ label, action }));
const gpaOf = (c: { graded: number; points: number }) => (c.graded > 0 ? Math.floor((c.points * 100) / c.graded) : 0);

/** Enrolling, or when it can be done: in the record's days before a term starts. */
function enroll(life: Life, which: 'emt' | 'adn' | 'bsn', term: unknown, days: number): SchoolItem[] {
  const now = enrolling(life, which);
  if (now.length > 0 || term) return now;
  return [item('window', `You can enroll in the ${days} days before a term starts.`, [], true)];
}

/** The national EMT exam: its fee and length, the chance at this sitting, and when it can be sat again. */
function nremt(life: Life, s: EducationSlice): SchoolItem[] {
  const e = educationOf(life.sim.content)?.emt;
  if (!e || life.fact('education.emt-certified') !== true) return [];
  if (s.nremt.licensed) return [item('nremt', 'You passed the national EMT exam. Ambulance services can hire you.')];
  const { chance } = life.peek<{ chance: number }>({ effect: 'nremt-odds' });
  const sitting = s.nremt.tries === 0 ? 'a first sitting' : 'a later sitting';
  const text = `The national EMT exam costs ${money(e.exam.price)} and takes ${hours(e.exam.minutes)}. About ${odds(chance)} pass ${sitting}.`;
  const sit = acting(life, 'education/sit-nremt', 'Sit the exam');
  const wait =
    sit.length === 0 && s.nremt.tries > 0
      ? [item('nremt-wait', `You can sit it again ${e.exam.wait} days after you last did.`, [], true)]
      : [];
  return [item('nremt', text, sit), ...wait];
}

/** The EMT course: what it is, the term and its classes, enrolling, then the exam. */
export function emtCourse(life: Life, s: EducationSlice): SchoolSection[] {
  const e = educationOf(life.sim.content)?.emt;
  if (!e || s.finished === 'none') return [];
  const certified = life.fact('education.emt-certified') === true;
  const items: SchoolItem[] = [];
  if (!certified) {
    const what = `${e.courses.length} courses taken together in one term, ${e.certificate} credits, meeting in the evenings.`;
    items.push(item('record', `The course is ${what} Passing both earns the certificate.`));
    items.push(...classes(life, s.emt.term, e), ...enroll(life, 'emt', s.emt.term, e.enroll));
  }
  items.push(...nremt(life, s));
  return [{ id: 'emt', title: titled(e.name), items }];
}

const PROGRAMS = ['adn', 'bsn'] as const;
const DEGREE: Readonly<Record<(typeof PROGRAMS)[number], string>> = {
  adn: 'an associate’s in nursing',
  bsn: 'a bachelor’s in nursing',
};

/** Applying to a program: the chance with your record, or what it asks; and when to apply again. */
function applying(life: Life, s: EducationSlice, which: (typeof PROGRAMS)[number]): SchoolItem[] {
  const p = educationOf(life.sim.content)?.[which];
  if (!p) return [];
  const { chance } = life.peek<{ chance: number }>({ effect: 'nursing-odds', program: which });
  const apply = acting(life, 'education/apply-nursing', 'Apply', (a) => a.program === which);
  const from = which === 'adn' ? 'college' : 'university';
  const text =
    chance > 0
      ? `About ${odds(chance)} with your record are admitted.`
      : `It admits after ${p.admit.credits} ${from} credits at a ${average(p.admit.gpa)} average or better.`;
  const wait =
    apply.length === 0 && chance > 0 && s[which].applied >= 0
      ? [item('wait', `You can apply again ${p.admit.wait} days after you last did.`, [], true)]
      : [];
  return [item('apply', text, apply), ...wait];
}

/** A nursing program: applying until admitted, then its credits, the term and enrolling. */
function program(life: Life, s: EducationSlice, which: (typeof PROGRAMS)[number]): SchoolSection[] {
  const p = educationOf(life.sim.content)?.[which];
  if (!p || s.finished === 'none') return [];
  // The bachelor's is the university's: shown to its students, or once admitted to it.
  if (which === 'bsn' && !s.university.admitted && !s.bsn.admitted) return [];
  const items: SchoolItem[] = [];
  if (s.nursing === which) items.push(item('record', `You finished ${DEGREE[which]} here.`));
  else if (!s[which].admitted) items.push(...applying(life, s, which));
  else {
    const c = s[which];
    const avg = c.graded > 0 ? `, at a ${average(gpaOf(c))} average` : '';
    items.push(item('record', `You have ${c.credits} of the ${p.degree} credits for ${DEGREE[which]}${avg}.`));
    items.push(...classes(life, c.term, p), ...enroll(life, which, c.term, p.enroll));
  }
  return [{ id: which, title: titled(p.name), items }];
}

/** The nursing licensing exam, once a program is finished: its fee, the chance now, and sitting it. */
function nclex(life: Life, s: EducationSlice): SchoolSection[] {
  const n = educationOf(life.sim.content)?.nclex;
  if (!n || s.nursing === 'none') return [];
  const title = 'The nursing licensing exam';
  if (s.nclex.licensed)
    return [{ id: 'nclex', title, items: [item('nclex', 'You passed it. You’re a registered nurse.')] }];
  const { chance } = life.peek<{ chance: number }>({ effect: 'nclex-odds' });
  const sitting = s.nclex.tries === 0 ? 'a first sitting with your program' : 'a later sitting';
  const text = `It costs ${money(n.price)} and takes ${hours(n.minutes)}. About ${odds(chance)} pass ${sitting}.`;
  const sit = acting(life, 'education/sit-nclex', 'Sit the exam');
  const wait =
    sit.length === 0 && s.nclex.tries > 0
      ? [item('nclex-wait', `You can sit it again ${n.wait} days after you last did.`, [], true)]
      : [];
  return [{ id: 'nclex', title, items: [item('nclex', text, sit), ...wait] }];
}

/** Medicine's sections, in the order a life goes through them. */
export const medicine = (life: Life, s: EducationSlice): SchoolSection[] => [
  ...emtCourse(life, s),
  ...PROGRAMS.flatMap((which) => program(life, s, which)),
  ...nclex(life, s),
];
