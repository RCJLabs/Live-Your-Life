/**
 * Your family on the People tab (M2.6 step 5): a pregnancy and its choices, your children and
 * their care, what a birth or daycare left owed, child support, and a report open; and who you
 * are drawn to and your body, yours to say (D91, D96). Costs come from the records and the sim's
 * facts, never typed here.
 */
import type { Action } from '@eb/core';
import { endCost, type FamilySlice, YOU } from '@lyl/sim';
import { button, el } from './dom.ts';
import type { Life } from './session.ts';
import { dayText, hours, money } from './words.ts';

const familyOf = (life: Life) => life.state.family as FamilySlice;
const first = (life: Life, person: number) => (life.fact('circle.name', { person }) as string).split(' ')[0] ?? '';

function pregnancyView(life: Life, act: (a: Action) => void): HTMLElement | null {
  const p = familyOf(life).pregnancy;
  if (!p || !p.known) return null;
  const week = life.fact('family.week') as number;
  const who = p.carrier === YOU ? 'You’re' : `${first(life, p.carrier)} is`;
  const parts: (HTMLElement | string)[] = [el('p', {}, `${who} ${week} weeks pregnant.`)];
  const options = life.options();
  const goOn = options.find((a) => a.type === 'family/continue');
  const end = options.find((a) => a.type === 'family/end');
  const cost = endCost(life as never);
  if (goOn) parts.push(button('Go on with the pregnancy', () => act(goOn), { 'data-action': goOn.type }));
  if (end && cost !== null)
    parts.push(
      el(
        'div',
        { class: 'item' },
        button('End it at the clinic', () => act(end), { 'data-action': end.type }),
        el('p', { class: 'note' }, `It costs ${money(cost)}. The clinic is open on weekdays.`),
      ),
    );
  else if (p.carrier === YOU && p.choice === 'open' && cost !== null)
    parts.push(el('p', { class: 'note' }, 'The clinic is open on weekdays, in the day.'));
  return el('div', { id: 'pregnancy' }, ...parts);
}

function childrenView(life: Life, act: (a: Action) => void): HTMLElement | null {
  const f = familyOf(life);
  if (f.children.length === 0) return null;
  const today = life.fact('time.day') as number;
  const care = life.options().find((a) => a.type === 'family/care');
  const left = life.fact('family.care-left') as number;
  const items = f.children.map((c) => {
    const age = Math.floor((today - c.born) / 365);
    const ageText = age === 0 ? `${Math.max(1, Math.floor((today - c.born) / 30))} months old` : `${age}`;
    const home = c.with === 'you' ? 'lives with you' : `lives with ${first(life, c.other)}`;
    return el('li', {}, el('p', {}, `${c.first}, ${ageText}, ${home}.`));
  });
  return el(
    'div',
    { id: 'children' },
    el('ul', { class: 'list' }, ...items),
    left > 0 ? el('p', {}, `Your children need ${hours(left)} more of your care today.`) : null,
    care
      ? button(`Look after them for ${hours(care.minutes as number)}`, () => act(care), { 'data-action': care.type })
      : null,
  );
}

function moneyView(life: Life, act: (a: Action) => void): HTMLElement | null {
  const f = familyOf(life);
  const lines: (HTMLElement | null)[] = [];
  const others = [...new Set(f.children.filter((c) => c.parted >= 0).map((c) => c.other))];
  for (const o of others) {
    const s = life.fact('family.support', { person: o }) as number;
    if (s < 0) lines.push(el('p', {}, `You pay ${first(life, o)} ${money(-s)} a month in child support.`));
    if (s > 0) lines.push(el('p', {}, `${first(life, o)} pays you ${money(s)} a month in child support.`));
  }
  if (f.arrears.owe > 0) lines.push(el('p', {}, `You’re behind on child support by ${money(f.arrears.owe)}.`));
  const bill = life.options().find((a) => a.type === 'family/pay-bill');
  if (f.owed > 0)
    lines.push(
      el(
        'p',
        {},
        `You owe ${money(f.owed)} for a birth or daycare. `,
        bill ? button('Pay it', () => act(bill), { 'data-action': bill.type }) : null,
      ),
    );
  if (f.report)
    lines.push(
      el(
        'p',
        {},
        `Child protective services is looking into your children’s care until ${dayText(life, f.report.closes)}.`,
      ),
    );
  return lines.length > 0 ? el('div', { id: 'family-money' }, ...lines) : null;
}

const DRAWN: Readonly<Record<string, string>> = { women: 'women', men: 'men', anyone: 'anyone' };

/** Whom you are drawn to and your body: settings, sent as they are (D91, D96). */
function youView(life: Life, act: (a: Action) => void): HTMLElement {
  const to = life.fact('circle.drawn-to') as string;
  const carries = life.fact('circle.carries') === true;
  return el(
    'div',
    { id: 'you-settings' },
    el('p', {}, `You’re drawn to ${DRAWN[to] ?? to}.`),
    ...Object.keys(DRAWN)
      .filter((d) => d !== to)
      .map((d) => button(`Drawn to ${DRAWN[d]}`, () => act({ type: 'circle/drawn-to', to: d }), { 'data-drawn': d })),
    el('p', {}, carries ? 'Your body can carry a pregnancy.' : 'Your body can’t carry a pregnancy.'),
    button(carries ? 'Change: it can’t' : 'Change: it can', () => act({ type: 'circle/carries', carries: !carries }), {
      'data-action': 'circle/carries',
    }),
  );
}

export function familyView(life: Life, act: (a: Action) => void): HTMLElement {
  const parts = [pregnancyView(life, act), childrenView(life, act), moneyView(life, act)].filter(
    (x): x is HTMLElement => x !== null,
  );
  return el(
    'div',
    { id: 'family' },
    el('h2', {}, 'Family'),
    ...(parts.length > 0 ? parts : [el('p', { class: 'quiet' }, 'You have no children.')]),
    el('h2', {}, 'You'),
    youView(life, act),
  );
}
