/**
 * What waits on you (D50): a favour asked, the police's visits, court dates, probation's
 * check-ins, money owed, and your shifts ahead, each with its day and what you can do about it now.
 * The badge counts this list and the panel shows it, so one function says what the player is told.
 * It reads the sim's facts, its state's own lists and the timers set for you, and offers only the
 * actions the game offers now.
 */
import type { Action, TimeSlice } from '@eb/core';
import { careerOf, type LawState, type TiesSlice } from '@lyl/sim';
import type { Life } from './session.ts';
import { dayText, money, whenText } from './words.ts';

export interface Waiting {
  readonly id: string;
  readonly kind: 'favour' | 'police' | 'court' | 'probation' | 'owed' | 'shift';
  /** The day it comes, or null for money owed. */
  readonly day: number | null;
  readonly text: string;
  /** What can be done about it now, as the game offers it. */
  readonly actions: readonly { readonly label: string; readonly action: Action }[];
}

const offered = (life: Life, type: string, match: (a: Action) => boolean = () => true) =>
  life.options().filter((a) => a.type === type && match(a));

const SHIFT_WORD: Readonly<Record<string, string>> = { breakfast: 'breakfast', dinner: 'dinner' };

function shiftStart(life: Life, shift: string): string {
  const k = careerOf(life.sim.content, 'line-cook').shifts.find((s) => s.id === shift);
  return k ? `${String(k.hour).padStart(2, '0')}:${String(k.minute).padStart(2, '0')}` : '';
}

function favour(life: Life): Waiting[] {
  const ties = life.state.ties as TiesSlice;
  const r = ties.request;
  if (!r || !ties.coworker) return [];
  const answers = offered(life, 'ties/answer').map((action) => ({
    label: action.answer === 'yes' ? 'Say yes' : 'Say no',
    action,
  }));
  const text = `${ties.coworker.first} asks if you can take the ${SHIFT_WORD[r.shift] ?? r.shift} shift ${dayText(life, r.day)}. You can answer until the day before.`;
  return [{ id: `favour/${r.day}`, kind: 'favour', day: r.day, text, actions: answers }];
}

function law(life: Life): Waiting[] {
  const s = life.state.law as LawState;
  const timers = (life.state.time as TimeSlice).timers;
  const out: Waiting[] = [];
  for (const v of s.visits) {
    const due = timers.find((t) => t.id === `law-visit-${v.id}`)?.due;
    if (due === undefined) continue;
    const day =
      (life.fact('time.day') as number) +
      Math.floor(((life.fact('time.of-day') as number) + due - (life.fact('time.tick') as number)) / 1440);
    const text =
      v.why === 'warrant'
        ? `The police will come to arrest you ${whenText(life, due)}, on the warrant.`
        : `The police will come to see you ${whenText(life, due)}.`;
    out.push({ id: `police/${v.id}`, kind: 'police', day, text, actions: [] });
  }
  for (const k of s.cases) {
    const attend = offered(life, 'law/attend').map((action) => ({ label: 'Go to court', action }));
    const text = k.warrant
      ? 'You missed your court date. There is a warrant out for you.'
      : `Your court date is ${dayText(life, k.court)}, between 08:00 and 12:00.`;
    out.push({ id: `court/${k.id}`, kind: 'court', day: k.court, text, actions: k.warrant ? [] : attend });
  }
  if (s.probation) {
    const check = offered(life, 'law/check-in').map((action) => ({ label: 'Check in', action }));
    const text = `You check in with probation ${dayText(life, s.probation.next)}.`;
    out.push({ id: 'probation', kind: 'probation', day: s.probation.next, text, actions: check });
  }
  const owed = life.fact('law.owed') as number;
  if (owed > 0) {
    const pay = offered(life, 'law/pay').map((action) => ({ label: `Pay ${money(owed)}`, action }));
    out.push({
      id: 'owed',
      kind: 'owed',
      day: null,
      text: `You owe ${money(owed)} to the court and the shop.`,
      actions: pay,
    });
  }
  return out;
}

function shifts(life: Life): Waiting[] {
  const ahead = life.fact('job.ahead') as { day: number; shift: string }[];
  return ahead.map((s) => {
    const cover = offered(life, 'ties/ask-cover', (a) => a.day === s.day).map((action) => ({
      label: 'Ask for a cover',
      action,
    }));
    const drop = offered(life, 'job/drop', (a) => a.day === s.day).map((action) => ({ label: 'Drop it', action }));
    const text = `Your ${SHIFT_WORD[s.shift] ?? s.shift} shift is ${dayText(life, s.day)} at ${shiftStart(life, s.shift)}.`;
    return { id: `shift/${s.day}`, kind: 'shift', day: s.day, text, actions: [...cover, ...drop] };
  });
}

/** Everything waiting on you, the soonest first; money owed last. */
export function waiting(life: Life): Waiting[] {
  const all = [...favour(life), ...law(life), ...shifts(life)];
  return all.sort((a, b) => (a.day ?? Number.POSITIVE_INFINITY) - (b.day ?? Number.POSITIVE_INFINITY));
}

/**
 * D58: the line for the morning of a court date, while going is offered and before noon; null
 * otherwise. The page shows it once a day.
 */
export function courtLine(life: Life, list: readonly Waiting[] = waiting(life)): string | null {
  const today = life.fact('time.day') as number;
  if ((life.fact('time.of-day') as number) >= 12 * 60) return null;
  const due = list.some((w) => w.kind === 'court' && w.day === today && w.actions.length > 0);
  return due ? 'You’re due in court this morning, by noon. Go from the panel.' : null;
}
