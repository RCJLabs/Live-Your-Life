/**
 * What `eb validate` and `eb build` check packages/content against (their `--types`): the game's
 * own modules, so a shift event's condition can name only facts the game has (E012), with the
 * arguments and values they take (E013, E014). Without it the engine takes an unknown fact as
 * written. The record types are the project's own, in packages/content/types.
 */
import { lifeModules } from '../../packages/sim/src/index.ts';

export const recordTypes = [];
export const modules = lifeModules();
