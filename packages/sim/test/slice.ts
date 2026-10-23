/**
 * The slice's life for tests and benches: the line cook hired at the start, with the pack's
 * records (M1.3). And a test cook posted every day for one evening shift, for tests that need a
 * shift on a day they know. The default life starts on Monday 2 June 2025 at 07:00, tick 0. No
 * test runner in here, so the benches can use it too.
 */
import type { Action, Beat, Game, GameState, RecordPack, SimContext } from '@eb/core';
import { PACK } from '@lyl/content';
import { type CareerRecord, createLifeGame, type LifeOptions, lifeSim, MINUTES_PER_DAY } from '../src/index.ts';

export const LINE_COOK = 'line-cook';
export const TEST_COOK = 'test-cook';

/**
 * The slice's life. Without the tier-1 people unless a test asks (M2.2): the 500-week sweeps are
 * the player's life, and 1,000 people in each would make them ten times slower. The people have
 * their own tests (src/people/) and readings.
 */
export const sliceGame = (options: LifeOptions = {}): Game =>
  createLifeGame({ career: LINE_COOK, people: 0, ...options });
export const sliceSim = (records: RecordPack = PACK.records): SimContext => lifeSim(records);

export const lineCook = (): CareerRecord => PACK.records.career?.[LINE_COOK] as CareerRecord;

/** A cook offered every day's one shift, 15:00 to 23:00, and no shift events unless changed. */
export function testCook(changes: Partial<CareerRecord> = {}): CareerRecord {
  const cook = lineCook();
  return {
    ...cook,
    shifts: [{ id: 'evening', hour: 15, minute: 0, minutes: 480 }],
    posting: { ...cook.posting, fewest: 7, most: 7 },
    events: { ...cook.events, chance: 0 },
    ...changes,
  };
}

/** The pack with a career added as `test-cook`. */
export const withCareer = (career: CareerRecord, records: RecordPack = PACK.records): RecordPack => ({
  ...records,
  career: { ...records.career, [TEST_COOK]: career },
});

/** The tick of a minute of a day, for a life that starts at 07:00 on day 0. */
export const tickOf = (day: number, hour: number, minute = 0): number =>
  day * MINUTES_PER_DAY + hour * 60 + minute - 7 * 60;

export const waitUntil = (hour: number, minute = 0): Action => ({ type: 'clock/wait-until', hour, minute });
export const doing = (activity: string, minutes: number): Action => ({ type: 'life/do', activity, minutes });
export const signUp = (day: number): Action => ({ type: 'job/sign-up', day });
export const advance = (minutes: number): Action => ({ type: 'time/advance', minutes });

/** Plays actions, each of which must be accepted, and reads the life at the end. */
export function play(game: Game, sim: SimContext, state: GameState, ...actions: Action[]) {
  let now = state;
  const beats: Beat[] = [];
  for (const action of actions) {
    const step = game.reduce(now, action, sim);
    if (!step.accepted) throw new Error(`${JSON.stringify(action)} was refused: ${JSON.stringify(step.beats[0])}`);
    beats.push(...step.beats);
    now = step.state;
  }
  const fact = (id: string, args?: Record<string, unknown>) => game.fact(now, id, args, sim);
  return { state: now, beats, fact, of: (type: string) => beats.filter((b) => b.type === type) };
}

/** The reason an action is refused; the state must be kept. */
export function refusal(game: Game, sim: SimContext, state: GameState, action: Action): unknown {
  const step = game.reduce(state, action, sim);
  if (step.accepted) throw new Error(`${JSON.stringify(action)} was accepted`);
  if (step.state !== state) throw new Error(`refusing ${JSON.stringify(action)} changed the state`);
  return step.beats[0]?.reason;
}
