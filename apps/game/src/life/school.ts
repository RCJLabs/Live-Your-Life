/**
 * The School tab (M2.8 step 6, D111–D116): what you have finished, the GED's tests without a
 * diploma, the community college's terms and what they cost, your classes this term, and the
 * loans; since M4.2 the university and law school (degrees.ts). Prices, chances and bills come from the sim's previews, the same sums it charges and
 * rolls (CLAUDE.md: odds on screen are the odds rolled); nothing here is typed in. The tab is a
 * model of sections first (`school`), so its words can be tested without a page, then drawn.
 */
import type { Action } from '@eb/core';
import {
  type Bill,
  type Borrow,
  type Catalog,
  type CollegeTerm,
  type EducationSlice,
  educationOf,
  meetings,
  type Which,
} from '@lyl/sim';
import { lawSchool, university } from './degrees.ts';
import { button, el } from './dom.ts';
import type { Waiting } from './pending.ts';
import type { Life } from './session.ts';
import { dayText, money, odds } from './words.ts';

export interface SchoolItem {
  readonly id: string;
  readonly text: string;
  readonly quiet?: boolean;
  readonly actions: readonly { readonly label: string; readonly action: Action }[];
}

export interface SchoolSection {
  readonly id: string;
  readonly title: string | null;
  readonly items: readonly SchoolItem[];
}

const edu = (life: Life) => life.state.education as EducationSlice | undefined;

const FINISHED: Readonly<Record<string, string>> = {
  none: 'You didn’t finish high school. Passing the GED’s four tests counts as a diploma.',
  diploma: 'You have a high school diploma.',
  ged: 'You have a GED.',
  associate: 'You have an associate’s degree.',
  bachelor: 'You have a bachelor’s degree.',
  jd: 'You have a law degree.',
};

const HOW: Readonly<Record<Borrow, string>> = {
  none: 'Enroll, no loan',
  bill: 'Enroll, borrowing the rest',
  most: 'Enroll, borrowing the most',
};

export const hours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
};
export const offered = (life: Life, type: string, match: (a: Action) => boolean = () => true) =>
  life.options().filter((a) => a.type === type && match(a));
export const item = (id: string, text: string, actions: SchoolItem['actions'] = [], quiet = false): SchoolItem => ({
  id,
  text,
  actions,
  quiet,
});

/** The GED's subjects: passed, or studied for, the chance of passing now, and the test. */
function ged(life: Life, s: EducationSlice): SchoolSection[] {
  const r = educationOf(life.sim.content);
  if (!r || s.finished !== 'none') return [];
  const items = r.ged.subjects.map((x) => {
    if (s.ged.passed.includes(x.id)) return item(x.id, `${x.name}: passed.`);
    const { chance } = life.peek<{ chance: number }>({ effect: 'ged-odds', subject: x.id });
    const studied = s.ged.prep[x.id] ?? 0;
    const text = `${x.name}: a ${x.minutes}-minute test, ${money(r.ged.price)}. You’ve studied ${hours(studied)} for it; about ${odds(chance)} pass it so prepared.`;
    return item(x.id, text, [
      ...offered(life, 'education/study', (a) => a.subject === x.id).map((action) => ({
        label: 'Study an hour',
        action,
      })),
      ...offered(life, 'education/take-test', (a) => a.subject === x.id).map((action) => ({
        label: 'Take the test',
        action,
      })),
    ]);
  });
  const hoursText = `The test centre is open on weekdays, ${r.ged.opens}:00 to ${r.ged.closes}:00.`;
  return [{ id: 'ged', title: 'The GED', items: [...items, item('centre', hoursText, [], true)] }];
}

/** A term's bill, said plainly: what it costs, what aid pays, what you pay and what comes back. */
export function billText(b: Bill): string {
  const parts = [`Tuition and fees come to ${money(b.charge)}.`];
  if (b.pell > 0) parts.push(`A Pell grant pays ${money(b.pell)}.`);
  if (b.borrowed > 0) parts.push(`You borrow ${money(b.borrowed)}, ${money(b.fee)} of it the loan’s fee.`);
  parts.push(b.cash > 0 ? `You pay ${money(b.cash)}.` : 'You pay nothing now.');
  if (b.refund > 0) parts.push(`${money(b.refund)} more than the bill is paid to you.`);
  return parts.join(' ');
}

/** Enrolling at a school, while its window is open: each number of courses and each way to pay, with its bill. */
export function enrolling(life: Life, which: Which = 'college'): SchoolItem[] {
  const at = (a: Action) => (a.school ?? 'college') === which;
  return offered(life, 'education/enroll', at).map((a) => {
    const n = a.courses as number;
    const school = which === 'college' ? {} : { school: which };
    const b = life.peek<Bill>({ effect: 'college-bill', courses: n, borrow: a.borrow, ...school });
    const what = `${n} ${n === 1 ? 'course' : 'courses'}, ${b.credits} credits. ${billText(b)}`;
    return item(`enroll/${n}/${String(a.borrow)}`, what, [{ label: HOW[a.borrow as Borrow] ?? 'Enroll', action: a }]);
  });
}

/** This term's classes: when each meets, the classes gone to, and the study it asks. */
export function classes(life: Life, t: CollegeTerm | null, c: Catalog): SchoolItem[] {
  if (!t) return [];
  const today = life.fact('time.day') as number;
  const when =
    today < t.start ? `Your term starts ${dayText(life, t.start)}.` : `Your term ends ${dayText(life, t.end)}.`;
  return [
    item('term', when),
    ...t.courses.map((x) => {
      const course = c.courses.find((y) => y.id === x.id);
      const slot = c.slots[x.slot];
      const days = (slot?.days ?? []).map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(' and ');
      const asked = c.study * (course?.credits ?? 0) * ((t.end - t.start) / 7) * 60;
      const text = `${course?.name ?? x.id}: ${days} at ${String(slot?.hour ?? 0).padStart(2, '0')}:00. You’ve gone to ${x.attended} of ${meetings(c, x, t)} classes and studied ${hours(x.study)} of the ${hours(asked)} it asks.`;
      return item(x.id, text, [
        ...offered(life, 'education/attend', (a) => a.course === x.id).map((action) => ({
          label: 'Go to class',
          action,
        })),
        ...offered(life, 'education/study', (a) => a.subject === x.id).map((action) => ({
          label: 'Study an hour',
          action,
        })),
      ]);
    }),
  ];
}

/** The college: credits and average, the term or the next one, and enrolling. */
function college(life: Life, s: EducationSlice): SchoolSection[] {
  const c = educationOf(life.sim.content)?.college;
  if (!c || s.finished === 'none') return [];
  const gpa = life.fact('education.gpa') as number;
  const record =
    s.college.graded > 0
      ? `You have ${s.college.credits} of the ${c.associate} credits for an associate’s, at a ${(gpa / 100).toFixed(2)} average.`
      : `An associate’s takes ${c.associate} credits at a ${(c.gpa / 100).toFixed(2)} average or better.`;
  const enroll = enrolling(life);
  const window =
    enroll.length > 0 || s.college.term
      ? []
      : [item('window', `You can enroll in the ${c.enroll} days before a term starts.`, [], true)];
  const title = c.name.charAt(0).toUpperCase() + c.name.slice(1);
  return [
    {
      id: 'college',
      title,
      items: [item('record', record), ...classes(life, s.college.term, c), ...enroll, ...window],
    },
  ];
}

/** What is owed on the loans, the month's payment, and what is behind. */
function loans(life: Life, s: EducationSlice): SchoolSection[] {
  const owed = life.fact('education.owed') as number;
  if (owed <= 0) return [];
  // The college's and university's loans, and law school's, counted together (M4.2 step 2).
  const both = [s.loan, s.grad];
  const monthly = both.reduce((n, l) => n + l.monthly, 0);
  const starts = both.filter((l) => l.repay >= 0 && l.monthly === 0).map((l) => l.repay);
  const plan =
    monthly > 0
      ? `You pay ${money(monthly)} on the 1st of each month.`
      : starts.length > 0
        ? `Payments start after ${dayText(life, Math.min(...starts))}.`
        : 'Nothing is due while you’re in school at half time or more.';
  const items = [item('owed', `You owe ${money(owed)}, interest to date included. ${plan}`)];
  const behind = life.fact('education.behind') as number;
  if (behind > 0) {
    const pay = offered(life, 'education/pay-loan').map((action) => ({ label: `Pay ${money(behind)}`, action }));
    items.push(item('behind', `${money(behind)} in payments is behind.`, pay));
  }
  return [{ id: 'loans', title: 'Student loans', items }];
}

/** The tab's sections, as words and the actions the game offers now. */
export function school(life: Life): SchoolSection[] {
  const s = edu(life);
  if (!s) return [];
  return [
    { id: 'finished', title: null, items: [item('finished', FINISHED[s.finished] ?? '')] },
    ...ged(life, s),
    ...college(life, s),
    ...university(life, s),
    ...lawSchool(life, s),
    ...loans(life, s),
  ];
}

export function schoolView(life: Life, act: (a: Action) => void): HTMLElement {
  const sections = school(life);
  if (sections.length === 0) return el('p', { class: 'quiet' }, 'There is no school in this town.');
  return el(
    'div',
    { id: 'school' },
    ...sections.flatMap((sec) => [
      ...(sec.title ? [el('h3', {}, sec.title)] : []),
      el(
        'ul',
        { class: 'list', 'data-section': sec.id },
        ...sec.items.map((i) =>
          el(
            'li',
            { 'data-item': i.id },
            el('p', i.quiet ? { class: 'quiet' } : {}, i.text),
            ...i.actions.map((a) => button(a.label, () => act(a.action), { 'data-action': a.action.type })),
          ),
        ),
      ),
    ]),
  );
}

/** For the Waiting list: a class starting now, and loan payments behind (pending.ts). */
export function schoolWaiting(life: Life): Waiting[] {
  const s = edu(life);
  const r = educationOf(life.sim.content);
  if (!s || !r) return [];
  const all = [r.college, r.university, r.law].flatMap((c) => c?.courses ?? []);
  const out: Waiting[] = [];
  const today = life.fact('time.day') as number;
  for (const a of offered(life, 'education/attend')) {
    const name = all.find((y) => y.id === a.course)?.name ?? String(a.course);
    out.push({
      id: `class/${String(a.course)}`,
      kind: 'school',
      day: today,
      text: `Your ${name} class is starting.`,
      actions: [{ label: 'Go to class', action: a }],
    });
  }
  const behind = life.fact('education.behind') as number;
  if (behind > 0) {
    out.push({
      id: 'loans-behind',
      kind: 'owed',
      day: null,
      text: `You’re ${money(behind)} behind on your student loans.`,
      actions: offered(life, 'education/pay-loan').map((action) => ({ label: `Pay ${money(behind)}`, action })),
    });
  }
  return out;
}
