/**
 * The Jobs tab's federal bureau (M4.3 step 4, D154–D159): applying, the stages with their chances
 * as the sim previews them, studying and training, reporting to the Academy, and an agent's cases.
 * Every chance comes from `federal-odds` or `case-odds`, the ones rolled; every requirement and wait
 * from the agency's record.
 */
import type { Action } from '@eb/core';
import { type Agency, agencyOf, type FederalSlice, professional } from '@lyl/sim';
import { button, el } from './dom.ts';
import { hours, item, offered, type SchoolItem } from './school.ts';
import type { Life } from './session.ts';
import { dayText, odds } from './words.ts';

/** A year of full-time work, in minutes, as the record counts professional work. */
const YEAR = 2080 * 60;

const acting = (life: Life, type: string, label: string, match: (a: Action) => boolean = () => true) =>
  offered(life, type, match).map((action) => ({ label, action }));

const chanceOf = (life: Life, effect: string) => life.peek<{ chance: number }>({ effect }).chance;

/** Why you can't apply, said plainly; the bureau's terms when you can. */
function applying(life: Life, a: Agency, f: FederalSlice): SchoolItem[] {
  const problem = life.fact('federal.problem') as string;
  const years = a.requires.minutes / YEAR;
  const view = { content: life.sim.content, fact: (id: string, x?: Record<string, unknown>) => life.fact(id, x) };
  const worked = Math.floor(professional(view as never, a) / 60);
  const quiet: Readonly<Record<string, string>> = {
    'too-soon': `You can apply again ${a.again} days after your last application ended.`,
    age: `The bureau takes applications from those ${a.requires.least} to ${a.requires.most} years old.`,
    experience: `The bureau asks ${years} years of full-time professional work, one with a law degree. You have ${worked.toLocaleString('en-US')} hours of it.`,
    felony: 'The bureau won’t take anyone with a felony on their record.',
  };
  if (problem in quiet) return [item('apply', quiet[problem] as string, [], true)];
  if (problem !== '') return [];
  const again = f.tries > 0 ? ' You can apply again.' : '';
  const text = `The federal bureau hires special agents with a bachelor’s and ${years} years of professional work, from ${a.requires.least} to ${a.requires.most}. It goes in stages: a written test, a fitness test, an interview, then a polygraph and background investigation.${again}`;
  return [item('apply', text, acting(life, 'federal/apply', 'Apply'))];
}

const preparing = (life: Life, what: 'written' | 'fitness', label: string) =>
  acting(life, 'federal/prepare', label, (x) => x.for === what);

/** The stage you are at: its day, what you've done for it and its chance, and sitting it. */
function stage(life: Life, a: Agency, f: FederalSlice): SchoolItem[] {
  // A cleared application has no day of its own (`due` is -1).
  const day = f.due >= 0 ? dayText(life, f.due) : '';
  const chance = odds(chanceOf(life, 'federal-odds'));
  const training = `You’ve trained ${hours(f.training)} of the ${a.fitness.hours} hours the fitness test asks.`;
  if (f.stage === 'written')
    return [
      item(
        'written',
        `Your written test can be sat from ${day}, between eight and five. You’ve studied ${hours(f.study)} for it; about ${chance} pass so prepared.`,
        [...preparing(life, 'written', 'Study an hour'), ...acting(life, 'federal/sit', 'Sit the test')],
      ),
      item('training', `${training} It comes after the written test.`, preparing(life, 'fitness', 'Train an hour')),
    ];
  if (f.stage === 'fitness')
    return [
      item('fitness', `Your fitness test can be taken from ${day}. ${training} About ${chance} pass so trained.`, [
        ...preparing(life, 'fitness', 'Train an hour'),
        ...acting(life, 'federal/sit', 'Take the test'),
      ]),
    ];
  if (f.stage === 'interview')
    return [
      item(
        'interview',
        `Your interview can be had from ${day}. About ${chance} are passed.`,
        acting(life, 'federal/sit', 'Go to the interview'),
      ),
    ];
  if (f.stage === 'background')
    return [
      item(
        'background',
        `Your polygraph and background investigation are decided ${day === 'today' || day === 'tomorrow' ? day : `on ${day}`}. About ${chance} with your record pass.`,
      ),
    ];
  return [
    item(
      'cleared',
      'You’re cleared for the Academy. Report, and its weeks of training begin.',
      acting(life, 'federal/report', 'Report'),
    ),
  ];
}

const targetName = (life: Life, target: string, person: number): string =>
  target === 'supplier' ? 'the supplier’s crew' : `${life.fact('circle.name', { person }) as string}’s crew`;

/** An agent's case: the one open and its evidence, or the targets to open one on. */
function cases(life: Life, a: Agency, f: FederalSlice): SchoolItem[] {
  if (f.case) {
    const name = targetName(life, f.case.target, f.case.person);
    const chance = odds(chanceOf(life, 'case-odds'));
    const ask =
      f.case.evidence >= a.cases.least
        ? ` About ${chance} of indictments hold on what you have.`
        : ` An indictment can be asked for once it reaches ${a.cases.least}.`;
    return [
      item(
        'case',
        `Your case against ${name} has ${f.case.evidence} points of evidence.${ask}`,
        acting(life, 'federal/indict', 'Ask for an indictment'),
      ),
    ];
  }
  const traded = (life.fact('deal.sales') as number) > 0 || (life.fact('deal.trust') as number) > 0;
  if (traded) return [item('case', 'You’ve bought or sold in the trade. You can’t work a case against it.', [], true)];
  const open = offered(life, 'federal/open').map((action) => ({
    label: `Open a case against ${targetName(life, String(action.target), action.person as number)}`,
    action,
  }));
  if (open.length === 0) return [item('case', 'There is no case for you to open today.', [], true)];
  return [item('case', 'Your cases come from the crews on the corners and the supplier who sells to them.', open)];
}

/** The bureau's items for the Jobs tab: none for someone without a bachelor's, or at the Academy. */
export function bureau(life: Life): SchoolItem[] {
  const a = agencyOf(life.sim.content);
  const f = life.state.federal as FederalSlice | undefined;
  if (!a || !f) return [];
  // Without a bachelor's the bureau's problem is 'bachelor', which says nothing (applying).
  if (f.stage === 'none') return applying(life, a, f);
  if (f.stage === 'academy') return [];
  if (f.stage === 'sworn') return life.fact('job.employed') === true ? cases(life, a, f) : [];
  return stage(life, a, f);
}

export function bureauView(life: Life, act: (a: Action) => void): HTMLElement[] {
  const items = bureau(life);
  if (items.length === 0) return [];
  return [
    el('h2', {}, 'The federal bureau'),
    el(
      'ul',
      { class: 'list', id: 'bureau' },
      ...items.map((i) =>
        el(
          'li',
          { 'data-item': i.id },
          el('p', i.quiet ? { class: 'quiet' } : {}, i.text),
          ...i.actions.map((x) => button(x.label, () => act(x.action), { 'data-action': x.action.type })),
        ),
      ),
    ),
  ];
}
