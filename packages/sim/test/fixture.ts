/**
 * Writes the first save fixture (M1.7): the random bot's week from a seed picked for what its
 * snapshot holds (shifts signed, a case on file, the coworker's memories, goods in the bag),
 * saved as the page saves. The snapshot is taken partway and the rest is the log, ending with
 * the page's own `time/elapse`, which no bot sends. Run once per save format; the fixture is committed and
 * must keep loading (fixtures.test.ts). Never re-run to "fix" a failing load: write a migration.
 *
 *   node packages/sim/test/fixture.ts <out> <build> [seed] [people]
 *
 * life-v1.json was written by M1.7's build (you at version 1); life-v2.json by M1.8's, after the
 * walk to work (D61), with the page's `you/commute` in its log; life-v3.json by M2.4 step 3's, with
 * the street trade before the crew (deal at version 1), the law at 2 and prison; life-v4.json by
 * M2.6 step 1's, with the 1,000 people and the people you know before courting (circle at version 1);
 * life-v5.json by step 2's, before life together (circle at version 2); life-v6.json by step 3's,
 * before bodies (circle at version 3); life-v7.json by step 4a's, before a child's care (family at version 1);
 * life-v8.json by step 4b's, before custody and support (family at version 2); life-v9.json by step 6's,
 * before the night asked (circle at version 4); life-v10.json by the same step's, before the safety plan
 * (family at version 3); life-v11.json by M2.7 step 2's, before the heir (circle at version 5, lives at 1); life-v12.json by M2.8 step 1's, before the GED (education at version 1); life-v13.json by step 2's, before the college (education at version 2); life-v14.json by step 3's, before paying for it (education at version 3); life-v15.json by step 7's, before retakes (education at version 4); life-v16.json by M2.9 step 3's, before the travel module; life-v17.json by M2.5 step 1's, before experience (job at version 1); life-v18.json by M2.10 step 2's, before the season module; life-v19.json by step 3's, before the life events; life-v20.json by step 5's, before the editions; life-v21.json by M2.12's, before a crew of your own (deal at version 2); life-v22.json by M4.1 step 1's, before rival corners (deal at version 3); life-v23.json by step 3's, before the trade's cash was counted (deal at version 4); life-v24.json by M4.1 step 4's, before the university (education at version 5); life-v25.json by M4.2 step 1's, before law school (education at version 6).
 */
import { writeFileSync } from 'node:fs';
import { type Action, createSaveFile, playRun } from '@eb/core';
import { randomFor } from '../src/index.ts';
import { sliceGame, sliceSim } from './slice.ts';

const [out, build, SEED = 'fixture-24', PEOPLE] = process.argv.slice(2);
if (!out || !build) throw new Error('fixture.ts <out> <build>: a fixture is written once, by name');
const game = PEOPLE === undefined ? sliceGame() : sliceGame({ people: Number(PEOPLE) });
const sim = sliceSim();
const run = playRun(game, sim, { seed: SEED, policy: randomFor(7), maxTurns: 5000 });
let state = run.state;
const log: Action[] = [...run.log];
for (const action of [
  { type: 'time/elapse', ms: 1500 },
  { type: 'you/commute', minutes: 36 },
  { type: 'time/elapse', ms: 2000 },
]) {
  const step = game.reduce(state, action, sim);
  if (!step.accepted) throw new Error(`fixture: ${action.type} refused: ${JSON.stringify(step.beats[0])}`);
  state = step.state;
  log.push(action);
}
// With the people (life-v4.json): an evening out at the end, so the snapshot holds people you know.
if (PEOPLE !== undefined) {
  const out = game.options(state, sim).find((a) => a.type === 'circle/go-out');
  if (!out) throw new Error('fixture: nowhere to go out to');
  for (const action of [
    out,
    { type: 'clock/wait-until', hour: 20 },
    { type: 'life/do', activity: 'socialize', minutes: 180 },
  ]) {
    const step = game.reduce(state, action, sim);
    if (!step.accepted) throw new Error(`fixture: ${action.type} refused: ${JSON.stringify(step.beats[0])}`);
    state = step.state;
    log.push(action);
  }
  log.push({ type: 'time/elapse', ms: 1500 });
  state = game.reduce(state, { type: 'time/elapse', ms: 1500 }, sim).state;
}
// The snapshot is the state some way in; the actions after it are the log. With the people, all
// but the last.
const split = PEOPLE === undefined ? Math.floor(run.log.length * 0.7) : log.length - 1;
let snapshot = game.init(SEED, sim);
for (const action of log.slice(0, split)) {
  const step = game.reduce(snapshot, action, sim);
  if (!step.accepted) throw new Error(`fixture: ${action.type} refused on replay`);
  snapshot = step.state;
}
const file = createSaveFile(
  { snapshot, log: log.slice(split), state },
  {
    game: 'live-your-life',
    edition: 'full',
    build,
    savedAt: 0,
    summary: { name: 'fixture', day: 0, cash: 0, at: null },
  },
);
writeFileSync(out, `${JSON.stringify(file)}\n`);
console.log(`${out}: ${log.length} actions, ${split} in the snapshot; ${JSON.stringify(file).length} bytes`);
