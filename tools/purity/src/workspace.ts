/**
 * The workspace's packages, read from pnpm-workspace.yaml. Two forms of entry, the only ones this
 * repo uses: `dir/*` for every package in a folder, and a plain path for one package (the
 * engine's, which are listed one by one). Ported from engine/tools/lint-boundaries, which reads
 * only the first form.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface WorkspacePackage {
  readonly name: string;
  readonly dir: string;
  readonly pure: boolean;
  /** Inside the engine submodule: importable here, checked by the engine's own CI. */
  readonly fromEngine: boolean;
}

const ENTRY = /^\s*-\s*['"]?([\w./-]+?)(\/\*)?['"]?\s*$/gm;

export function workspacePackages(root: string): WorkspacePackage[] {
  const yaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const dirs: string[] = [];
  for (const [, path, star] of yaml.matchAll(ENTRY)) {
    const base = join(root, path as string);
    if (!existsSync(base)) continue;
    if (!star) {
      dirs.push(base);
      continue;
    }
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(base, entry.name));
    }
  }
  const found: WorkspacePackage[] = [];
  for (const dir of dirs) {
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; eb?: { pure?: boolean } };
    if (!pkg.name) continue;
    const fromEngine = relative(root, dir).split(/[\\/]/)[0] === 'engine';
    found.push({ name: pkg.name, dir, pure: pkg.eb?.pure === true, fromEngine });
  }
  return found;
}

/** Source files a rule should see: `.ts`/`.tsx` under `src`, tests excluded (as the engine's lint). */
export function sourceFiles(dir: string): string[] {
  const src = join(dir, 'src');
  if (!existsSync(src)) return [];
  return readdirSync(src, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(src, f))
    .sort();
}

export const rel = (root: string, file: string): string => relative(root, file);
