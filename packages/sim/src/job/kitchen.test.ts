import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, refusal, signUp, sliceGame, sliceSim, tickOf } from '../../test/slice.ts';
import { DEFAULT_START, WEEKDAYS } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { createLifeGame } from '../game.ts';
import type { Listing } from '../market/module.ts';
import { barred, REPUTATION } from '../market/odds.ts';
import { POST_OPEN_DAYS, postOpen } from './posts.ts';
import { type CareerRecord, careerOf, eventsFor, shiftEventOf } from './records.ts';
import type { JobSlice } from './state.ts';

// The kitchen's careers with no shift events, so a shift runs straight through.
const careers = PACK.records.career as Record<string, CareerRecord>;
const quiet: RecordPack = {
  ...PACK.records,
  career: Object.fromEntries(
    Object.entries(careers).map(([id, c]) => [id, { ...c, events: { ...c.events, chance: 0 } }]),
  ),
};
const sim = sliceSim(quiet);
const game = createLifeGame({ events: false, people: 0, career: 'line-cook' });
const job = (s: GameState) => s.job as JobSlice;
const fact = (s: GameState, id: string) => game.fact(s, id, {}, sim);
const cook = careerOf(sim.content, 'line-cook');
const lead = careerOf(sim.content, 'kitchen-lead');

/** Whether the next rank's post at the diner is open on a seed's first posted day (D124). */
function openOn(seed: string, next: string): boolean {
  const s = game.init(seed, sim);
  const day = (job(s).posted[0] as { day: number }).day;
  const turnover = careerOf(sim.content, next).employers.turnover;
  return postOpen(fact(s, 'people.seed') as number, fact(s, 'market.employer') as string, next, turnover, day);
}
/** The first seed whose post is open, or shut, on its first posted day. */
const seedWhere = (next: string, open: boolean): string => {
  for (let i = 0; i < 400; i++) if (openOn(`kitchen-${i}`, next) === open) return `kitchen-${i}`;
  throw new Error(`no seed with the ${next}'s post ${open ? 'open' : 'shut'}`);
};

/** A whole shift worked on the first day posted, as `career` with `practice` minutes and `standing`. */
function shift(career: string, practice: number, standing: number, seed = 'kitchen') {
  const s = game.init(seed, sim);
  const start = { ...s, job: { ...job(s), career, practice, standing } } as GameState;
  const first = job(start).posted[0] as { day: number; shift: string };
  const kind = careerOf(sim.content, career).shifts.find((k) => k.id === first.shift) as {
    hour: number;
    minutes: number;
  };
  const signed = play(game, sim, start, signUp(first.day)).state;
  const at = tickOf(first.day, kind.hour) - (signed.time as { tick: number }).tick;
  const working = play(game, sim, signed, advance(at), doing('work', kind.minutes)).state;
  return play(game, sim, working, advance(5));
}

describe('the food ladder (M2.5, D121, D122)', () => {
  it('runs line cook, kitchen lead, chef, each paid more than the last', () => {
    expect(cook.ladder?.next).toBe('kitchen-lead');
    expect(lead.ladder?.next).toBe('chef');
    const chef = careerOf(sim.content, 'chef');
    expect(cook.wage).toBeLessThan(lead.wage);
    expect(lead.wage).toBeLessThan(chef.wage);
    expect(chef.ladder).toBeUndefined();
  });

  it('makes a line cook the kitchen lead at the diner with the hours and the standing', () => {
    const practice = (cook.ladder?.practice as number) - 480;
    const standing = cook.ladder?.standing as number;
    const open = seedWhere('kitchen-lead', true);
    expect(shift('line-cook', practice - 480, standing, open).of('job/promoted')).toEqual([]);
    expect(shift('line-cook', practice, standing - 10, open).of('job/promoted')).toEqual([]);
    const done = shift('line-cook', practice, standing, open);
    expect(done.of('job/promoted')).toEqual([{ type: 'job/promoted', from: 'line-cook', career: 'kitchen-lead' }]);
    expect(lineFor(sim.content, done.of('job/promoted')[0] as never, { you: 'Dana' }, DEFAULT_START)).toBe(
      'Dana became a kitchen lead.',
    );
    expect(job(done.state).career).toBe('kitchen-lead');
    // Still at your block's diner, beside the same cook.
    expect(fact(done.state, 'market.at-diner')).toBe(true);
    expect((done.state.ties as { career: string }).career).toBe('line-cook');
    expect(job(done.state).posted.length).toBeGreaterThan(0);
  });

  it('makes the kitchen lead the chef after the lead’s own hours', () => {
    const practice = (lead.ladder?.practice as number) - 480;
    const done = shift('kitchen-lead', practice, lead.ladder?.standing as number, seedWhere('chef', true));
    expect(done.of('job/promoted').map((b) => b.career)).toEqual(['chef']);
  });

  it('waits for the post: ready, but no promotion while someone holds it (D124)', () => {
    const practice = (cook.ladder?.practice as number) - 480;
    const shut = shift('line-cook', practice, cook.ladder?.standing as number, seedWhere('kitchen-lead', false));
    expect(shut.of('job/promoted')).toEqual([]);
    expect(job(shut.state).career).toBe('line-cook');
  });

  it('opens a post about as often as its holder leaves, and keeps it open three weeks', () => {
    const turnover = lead.employers.turnover;
    let open = 0;
    let runs = 0;
    let run = 0;
    const days = 20000;
    for (const seed of [1, 2, 3, 7, 99, 12345]) {
      for (let d = 0; d < days; d++) {
        if (postOpen(seed, 'line-cook-home', 'kitchen-lead', turnover, d)) {
          open++;
          run++;
        } else if (run > 0) {
          runs++;
          run = 0;
        }
      }
      run = 0;
    }
    // A holder leaves on about turnover/30,000 of days; each leaving opens the post three weeks.
    const leavings = (6 * days * turnover) / 30000;
    expect(runs).toBeGreaterThan(leavings * 0.75);
    expect(runs).toBeLessThan(leavings * 1.25);
    expect(open / runs).toBeGreaterThanOrEqual(POST_OPEN_DAYS - 1);
  });
});

// The lead with a kitchen hiring every day, so an opening stands to be tried.
const BUSY = 'test-busy-lead';
const busy = sliceSim({
  ...quiet,
  career: {
    ...quiet.career,
    [BUSY]: { ...lead, employers: { districts: ['downtown'], staff: 200, turnover: 60, share: 50 } },
  },
});
const slice = sliceGame();
const listed = (s: GameState): Listing[] => slice.fact(s, 'market.openings', undefined, busy) as Listing[];
const worked = (s: GameState, experience: Record<string, number>) =>
  ({ ...s, job: { ...job(s), experience } }) as GameState;
const applicant = (w: Record<string, number>) => ({
  convictions: 0,
  felonies: 0,
  reputation: REPUTATION.start,
  schooling: 'diploma',
  worked: w,
});

describe('hired for experience (M2.5, D122)', () => {
  it('asks the minutes worked in the kitchen, at any employer, and counts a higher rank', () => {
    const need = lead.requires?.experience?.minutes as number;
    expect(barred(lead, applicant({ 'line-cook': need - 1 }))).toBe('experience');
    expect(barred(lead, applicant({ 'line-cook': need }))).toBeNull();
    expect(barred(lead, applicant({ 'line-cook': need / 2, chef: need / 2 }))).toBeNull();
    expect(barred(lead, applicant({ janitor: need * 10 }))).toBe('experience');
    expect(barred(careerOf(sim.content, 'chef'), applicant({ 'line-cook': need * 10 }))).toBe('experience');
  });

  it('lists the opening with why you can’t apply, refuses it, and takes the application once you have the hours', () => {
    const s = slice.init('experience', busy);
    const without = listed(s).find((l) => l.career === BUSY) as Listing;
    expect(without.problem).toBe('experience');
    expect(refusal(slice, busy, s, { type: 'market/apply', opening: without.opening })).toBe('experience');
    const cook = worked(s, { 'line-cook': lead.requires?.experience?.minutes as number });
    const withIt = listed(cook).find((l) => l.career === BUSY) as Listing;
    expect(withIt.problem).toBeNull();
    expect(play(slice, busy, cook, { type: 'market/apply', opening: withIt.opening }).of('market/applied').length).toBe(
      1,
    );
  });

  it('keeps the minutes worked across jobs, and adds each shift’s to the career worked', () => {
    const done = shift('line-cook', 0, 50);
    const e = job(done.state).experience;
    expect(e['line-cook']).toBe(job(done.state).practice);
    expect(e['line-cook']).toBeGreaterThan(0);
    // And the shift is kept as over, for the week's limit.
    expect(job(done.state).done).toHaveLength(1);
  });
});

// The two ranks with an event every shift, so a shift stops for one.
const eventful = sliceSim({
  ...PACK.records,
  career: {
    ...careers,
    'kitchen-lead': { ...lead, events: { ...lead.events, chance: 100 } },
    chef: { ...careers.chef, events: { ...(careers.chef as CareerRecord).events, chance: 100 } },
  } as RecordPack['career'],
});

/** A shift as `career` worked until its event stops it: the state, and the event drawn. */
function stopped(career: string, seed: string) {
  const s = game.init(seed, eventful);
  const start = { ...s, job: { ...job(s), career, standing: 50 } } as GameState;
  const first = job(start).posted[0] as { day: number; shift: string };
  const kind = careerOf(eventful.content, career).shifts.find((k) => k.id === first.shift) as { hour: number };
  const signed = play(game, eventful, start, signUp(first.day)).state;
  const at = tickOf(first.day, kind.hour) - (signed.time as { tick: number }).tick;
  const there = play(game, eventful, signed, advance(at)).state;
  // Work runs until the event comes due, as the page asks it to (job.shift-left).
  const left = game.fact(there, 'job.shift-left', {}, eventful) as number;
  const state = play(game, eventful, there, doing('work', left)).state;
  return { state, data: state.kernel.modes.at(-1)?.data as { event: string; day: number } | undefined };
}

describe('the lead’s and the chef’s shifts (M2.5, D123)', () => {
  const ids = (career: string) => eventsFor(sim.content, careerOf(sim.content, career)).map(([id]) => id);
  const lines = ['county-inspection', 'no-show', 'short-delivery'];
  const menu = ['keep-or-let-go', 'off-the-menu'];

  it('draws the line’s events for a lead and a chef, the menu’s for a chef alone, and neither for a cook', () => {
    for (const id of [...lines, ...menu]) expect(ids('line-cook')).not.toContain(id);
    for (const id of lines) expect(ids('kitchen-lead')).toContain(id);
    for (const id of menu) expect(ids('kitchen-lead')).not.toContain(id);
    for (const id of [...lines, ...menu]) expect(ids('chef')).toContain(id);
    // A lead and a chef still cook: the line cook's events come up for them too.
    for (const id of ids('line-cook')) expect(ids('chef')).toContain(id);
  });

  it('rolls a chef’s chancy choice at the odds its preview shows', () => {
    let seen = 0;
    for (let i = 0; i < 30 && seen < 5; i++) {
      const { state, data } = stopped('chef', `chef-${i}`);
      if (!data || ![...lines, ...menu].includes(data.event)) continue;
      seen++;
      const chancy = shiftEventOf(sim.content, data.event).choices.find((c) => c.odds) as { id: string };
      const [preview] = game.preview(state, [{ effect: 'shift-choice', ...data, choice: chancy.id }], eventful);
      const chose = play(game, eventful, state, { type: 'job/choose', choice: chancy.id });
      const rolled = chose.of('logic/rolled')[0];
      expect(rolled).toBeDefined();
      const chance = rolled?.outcome === 0 ? rolled.chance : 100 - (rolled?.chance as number);
      expect(chance).toBe(preview?.chance);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('the week’s limit counts the shifts already over (found in M2.5 step 5)', () => {
  it('refuses a sixth shift in a week once five are signed or worked', () => {
    const s = game.init('week', sim);
    const posted = job(s).posted.map((p) => p.day);
    const today = game.fact(s, 'time.day', {}, sim) as number;
    const weekday = WEEKDAYS.indexOf(game.fact(s, 'time.weekday', {}, sim) as (typeof WEEKDAYS)[number]);
    // A posted day, and the week it falls in: the days before it that week count as worked.
    const day = posted.find((d) => (d - today + weekday) % 7 >= 5) as number;
    expect(day).toBeDefined();
    const weekStart = day - ((day - today + weekday) % 7);
    const five = [0, 1, 2, 3, 4].map((k) => weekStart + k).filter((d) => d !== day);
    const full = { ...s, job: { ...job(s), signed: [], done: five.slice(0, 5) } } as GameState;
    expect(refusal(game, sim, full, signUp(day))).toBe('week-full');
    const four = { ...s, job: { ...job(s), signed: [], done: five.slice(0, 4) } } as GameState;
    expect(play(game, sim, four, signUp(day)).of('job/signed-up').length).toBe(1);
  });
});
