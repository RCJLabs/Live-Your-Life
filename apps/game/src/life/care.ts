/**
 * Illness, injury and care on the page (M2.7 step 2, D104, D105): what you're ill with, the
 * doctor and what a visit costs you, a hospital stay, and care's bills. Prices and days come from
 * the illness record and the sim's facts, never typed here (CLAUDE.md: no hand-typed numbers).
 */
import { type Coverage, type HealthSlice, hospitalCost, illnessOf, kindOf } from '@lyl/sim';
import type { Item } from './menus.ts';
import type { Waiting } from './pending.ts';
import type { Life } from './session.ts';
import { dayText, money } from './words.ts';

const health = (life: Life) => life.state.health as HealthSlice | undefined;

/** What a visit or a hospital day costs you, said plainly, by who pays the rest. */
const PAYER: Readonly<Record<Coverage, string | null>> = {
  employer: 'Your employer’s plan',
  medicaid: 'Medicaid',
  none: null,
};
const priced = (cents: number, c: Coverage) => {
  const payer = PAYER[c];
  if (!payer) return `It costs ${money(cents)}.`;
  return cents > 0 ? `${payer} pays the rest; you pay ${money(cents)}.` : `${payer} pays for it.`;
};

/** An illness or injury, and the doctor while the clinic is open; then what care has left owed. */
export function careWaiting(life: Life): Waiting[] {
  const s = health(life);
  const r = illnessOf(life.sim.content);
  if (!s || !r) return [];
  const out: Waiting[] = [];
  if (s.ill && s.hospital < 0) {
    const k = kindOf(r, s.ill.kind);
    const today = life.fact('time.day') as number;
    const what = k.work ? 'You were hurt at work.' : `You have ${k.name}.`;
    const off = s.ill.off > today ? ` You’re too ill to work until ${dayText(life, s.ill.off)}.` : '';
    const text = `${what}${off} You should be well ${dayText(life, s.ill.until)}.`;
    const visit = life.options().filter((a) => a.type === 'health/see-doctor');
    const cover = life.fact('health.coverage') as Coverage;
    const cost = life.fact('health.visit-cost') as number;
    const doctor =
      s.ill.seen || k.visit === 0
        ? ''
        : ` A doctor could see you on a weekday, ${String(r.visit.opens).padStart(2, '0')}:00 to ${r.visit.closes}:00. ${priced(cost, cover)}`;
    out.push({
      id: 'ill',
      kind: 'health',
      day: s.ill.until,
      text: `${text}${doctor}`,
      actions: k.visit > 0 ? visit.map((action) => ({ label: 'See a doctor', action })) : [],
    });
  }
  if (s.owed > 0) {
    const pay = life.options().filter((a) => a.type === 'health/pay-bill');
    out.push({
      id: 'care-owed',
      kind: 'owed',
      day: null,
      text: `You owe ${money(s.owed)} for your care.`,
      actions: pay.map((action) => ({ label: `Pay ${money(s.owed)}`, action })),
    });
  }
  return out;
}

/** The hospital's sheet: the day you leave, what each day costs you, and resting a day. */
export function hospitalSheet(life: Life): { title: string; lead: string; items: Item[] } | null {
  const s = health(life);
  const r = illnessOf(life.sim.content);
  if (life.mode.id !== 'hospital' || !s || !r) return null;
  const cover = life.fact('health.coverage') as Coverage;
  const lead = `You’re in hospital until ${dayText(life, s.hospital)}. Each day here: ${priced(hospitalCost(r, cover), cover)}`;
  const items = life
    .options()
    .filter((a) => a.type === 'health/rest')
    .map((action) => ({ label: 'Rest a day', action }));
  return { title: 'In hospital', lead, items };
}
