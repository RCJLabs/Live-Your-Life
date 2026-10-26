/**
 * The Jobs tab (M2.3, D74): your job, the offers standing, what you have applied for, and the
 * openings up today, each with its pay, the walk there and the odds you are taken, which are the
 * odds the answer is rolled at. Applying and taking an offer are actions the game offers; quitting
 * and turning an offer down are offered to no bot (job/hire.ts), so they are sent as they are and
 * the sim refuses them when they don't apply.
 */
import type { Action } from '@eb/core';
import { careerOf, type Listing, type MarketSlice } from '@lyl/sim';
import type { Work } from '../city/workplace.ts';
import { button, el } from './dom.ts';
import type { Life } from './session.ts';
import { dayText, money, odds, whenText } from './words.ts';

/** Openings listed at most: the nearest first. */
const LISTED = 12;

const PROBLEM: Readonly<Record<string, string>> = {
  record: 'They won’t take anyone with a conviction.',
  'high-school': 'They hire only with a high school diploma or a GED.',
  associate: 'They hire only with an associate’s degree.',
  experience: 'They hire only someone who has done the work before.',
  'too-many': 'You’re waiting on five answers already.',
  applied: 'You’ve applied.',
  'works-there': 'You work there.',
};

const careerName = (life: Life, id: string): string => {
  const n = careerOf(life.sim.content, id).name;
  return n.charAt(0).toLowerCase() + n.slice(1);
};

/** A district as a sentence has it: "downtown", "in the inner ring", "in the old industrial district". */
function inDistrict(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith('the ')) return `in ${n}`;
  return n.includes(' ') ? `in the ${n} district` : n;
}

/** "downtown, a 34-minute walk", or "on your block". */
function where(life: Life, work: Work, employer: string): string {
  const e = work.employers.find((x) => x.id === employer);
  if (!e || e.home) return 'on your block';
  const district = life.sim.content.get<{ name: string }>('district', e.district)?.name ?? e.district;
  const walk = work.walkTo(employer);
  const place = inDistrict(district);
  return walk ? `${place}, a ${walk.minutes}-minute walk` : place;
}

function yourJob(life: Life, work: Work, act: (a: Action) => void): HTMLElement {
  const m = life.state.market as MarketSlice;
  const career = (life.state.job as { career: string | null }).career;
  if (!life.fact('job.employed') || career === null) return el('p', { id: 'your-job' }, 'You have no job.');
  const wage = careerOf(life.sim.content, career).wage;
  return el(
    'div',
    { id: 'your-job' },
    el(
      'p',
      {},
      `You work as a ${careerName(life, career)} ${where(life, work, m.employer ?? '')}, for ${money(wage)} an hour.`,
    ),
    button('Quit', () => act({ type: 'job/quit' }), { 'data-action': 'job/quit' }),
  );
}

function offers(life: Life, work: Work, act: (a: Action) => void): HTMLElement[] {
  const m = life.state.market as MarketSlice;
  return m.offers.map((o) =>
    el(
      'li',
      { 'data-kind': 'offer', 'data-opening': o.opening },
      el(
        'p',
        {},
        `An offer: work as a ${careerName(life, o.career)} ${where(life, work, o.employer)}. It stands until ${whenText(life, o.until)}.`,
      ),
      ...life
        .options()
        .filter((a) => a.type === 'market/accept' && a.opening === o.opening)
        .map((a) => button('Take it', () => act(a), { 'data-action': a.type })),
      button('Turn it down', () => act({ type: 'market/decline', opening: o.opening }), {
        'data-action': 'market/decline',
      }),
    ),
  );
}

function applied(life: Life, work: Work): HTMLElement[] {
  const m = life.state.market as MarketSlice;
  return m.applications.map((a) =>
    el(
      'li',
      { 'data-kind': 'applied' },
      el(
        'p',
        {},
        `You applied to work as a ${careerName(life, a.career)} ${where(life, work, a.employer)}. You hear back ${whenText(life, a.answer)}.`,
      ),
    ),
  );
}

function openings(life: Life, work: Work, act: (a: Action) => void): HTMLElement[] {
  const all = life.fact('market.openings') as Listing[];
  const walk = (l: Listing) => work.walkTo(l.employer)?.minutes ?? 0;
  const shown = [...all].sort((a, b) => walk(a) - walk(b)).slice(0, LISTED);
  const apply = life.options().filter((a) => a.type === 'market/apply');
  return shown.map((l) => {
    const career = careerOf(life.sim.content, l.career);
    const go = apply.find((a) => a.opening === l.opening);
    // A preferred credential is in the odds listed (D114); said, so the reason for them is plain.
    const prefers = career.hiring.prefers ? ' They prefer an associate’s degree.' : '';
    const chance = l.problem === null ? `${prefers} About ${odds(l.odds)} who apply are taken.` : '';
    return el(
      'li',
      { 'data-kind': 'opening', 'data-opening': l.opening },
      el(
        'p',
        {},
        `${career.name}, ${where(life, work, l.employer)}. ${money(career.wage)} an hour. Up until ${dayText(life, l.closes)}.${chance}`,
      ),
      go
        ? button('Apply', () => act(go), { 'data-action': go.type })
        : el('p', { class: 'quiet' }, PROBLEM[l.problem ?? ''] ?? ''),
    );
  });
}

export function jobsView(life: Life, work: Work, act: (a: Action) => void): HTMLElement {
  const waitingOn = [...offers(life, work, act), ...applied(life, work)];
  const open = openings(life, work, act);
  return el(
    'div',
    { id: 'jobs' },
    yourJob(life, work, act),
    ...(waitingOn.length > 0 ? [el('ul', { class: 'list', id: 'job-offers' }, ...waitingOn)] : []),
    el('h2', {}, 'Openings'),
    open.length > 0
      ? el('ul', { class: 'list', id: 'openings' }, ...open)
      : el('p', { class: 'quiet' }, 'Nobody is hiring today.'),
  );
}
