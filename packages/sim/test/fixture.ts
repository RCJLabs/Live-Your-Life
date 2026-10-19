/**
 * Writes the first save fixture (M1.7): the random bot's week from a seed picked for what its
 * snapshot holds (shifts signed, a case on file, the coworker's memories, goods in the bag),
 * saved as the page saves. The snapshot is taken partway and the rest is the log, ending with
 * the page's own `time/elapse`, which no bot sends. Run once per save format; the fixture is committed and
 * must keep loading (fixtures.test.ts). Never re-run to "fix" a failing load: write a migration.
 *
 *   node packages/sim/test/fixture.ts [out]
 */
import { writeFileSync } from 'node:fs';
import { type Action, createSaveFile, playRun } from '@eb/core';
import { randomFor } from '../src/index.ts';
import { sliceGame, sliceSim } from './slice.ts';

const out = process.argv[2] ?? new URL('./fixtures/saves/life-v1.json', import.meta.url).pathname;
const game = sliceGame();
const sim = sliceSim();
const SEED = 'fixture-24';
const run = playRun(game, sim, { seed: SEED, policy: randomFor(7), maxTurns: 5000 });
let state = run.state;
const log: Action[] = [...run.log];
for (const ms of [1500, 500, 2000]) {
  const elapse = { type: 'time/elapse', ms };
  const step = game.reduce(state, elapse, sim);
  if (!step.accepted) throw new Error('fixture: the life ended out of the world; pick another seed');
  state = step.state;
  log.push(elapse);
}
// The snapshot is the state some way in; the actions after it are the log.
const split = Math.floor(run.log.length * 0.7);
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
    build: 'm1.7-fixture',
    savedAt: 0,
    summary: { name: 'fixture', day: 0, cash: 0, at: null },
  },
);
writeFileSync(out, `${JSON.stringify(file)}\n`);
console.log(`${out}: ${log.length} actions, ${split} in the snapshot; ${JSON.stringify(file).length} bytes`);
