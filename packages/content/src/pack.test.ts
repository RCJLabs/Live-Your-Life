import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { compileProject, memorySource } from '@eb/compiler';
import { describe, expect, it } from 'vitest';
import { contentStore, PACK } from './index.ts';

const ROOT = resolve(import.meta.dirname, '..');

/** The project's own files, as the compiler reads them: project.json, types/ and records/. */
function projectFiles(): Record<string, string> {
  const files: Record<string, string> = { 'project.json': readFileSync(join(ROOT, 'project.json'), 'utf8') };
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files[relative(ROOT, path)] = readFileSync(path, 'utf8');
    }
  };
  walk(join(ROOT, 'types'));
  walk(join(ROOT, 'records'));
  return files;
}

describe('the content pack', () => {
  it('is the records as they are now: run `pnpm content` after changing one', async () => {
    const result = await compileProject(memorySource(projectFiles()), []);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.pack?.hash).toBe(PACK.hash);
  });

  it('holds the block and everything it names', () => {
    const store = contentStore();
    expect(store.ids('block')).toContain('slice');
    for (const type of ['street', 'facade', 'building']) expect(store.ids(type).length).toBeGreaterThan(0);
  });
});
