/**
 * The purity check for this repo. Engine-Builder's own lint (engine/tools/lint-boundaries)
 * resolves the engine's root, so it can't be pointed here; this applies the same rules
 * (@eb/purity) to this repo's packages marked `"eb": { "pure": true }`.
 *
 * - Every pure package in the workspace, the engine's included, may be imported by pure code.
 * - Only this repo's own pure packages are checked: the engine's CI checks the engine's.
 */
import { readFileSync } from 'node:fs';
import { checkPureSource, type Violation } from '@eb/purity';
import { rel, sourceFiles, workspacePackages } from './workspace.ts';

export interface PurityReport {
  /** This repo's pure packages, by name. */
  readonly checked: readonly string[];
  readonly files: number;
  readonly violations: readonly Violation[];
}

export function checkWorkspace(root: string): PurityReport {
  const packages = workspacePackages(root);
  const pureNames = new Set(packages.filter((p) => p.pure).map((p) => p.name));
  const own = packages.filter((p) => p.pure && !p.fromEngine);
  const violations: Violation[] = [];
  let files = 0;
  for (const pkg of own) {
    for (const file of sourceFiles(pkg.dir)) {
      files++;
      violations.push(...checkPureSource(rel(root, file), readFileSync(file, 'utf8'), pureNames));
    }
  }
  return { checked: own.map((p) => p.name), files, violations };
}
