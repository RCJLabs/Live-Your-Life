import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkWorkspace } from '../src/check.ts';

// Each test builds a small workspace on disk, so the check is seen failing on code this repo never ships.
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'lyl-purity-'));
  roots.push(root);
  const all = {
    'pnpm-workspace.yaml': 'packages:\n  - packages/*\n  - engine/packages/core\n',
    'engine/packages/core/package.json': JSON.stringify({ name: '@eb/core', eb: { pure: true } }),
    'engine/packages/core/src/index.ts': 'export const random = () => Math.random();\n',
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const pure = (name: string) => JSON.stringify({ name, eb: { pure: true } });

describe('the purity check', () => {
  it('passes clean pure code that imports a pure engine package', () => {
    const report = checkWorkspace(
      workspace({
        'packages/sim/package.json': pure('@lyl/sim'),
        'packages/sim/src/clock.ts': "import { createGame } from '@eb/core';\nexport const n = 7 * 60;\n",
      }),
    );
    expect(report).toEqual({ checked: ['@lyl/sim'], files: 1, violations: [] });
  });

  it.each([
    { what: 'Math.random', code: 'export const roll = () => Math.random();\n', rule: /Math\.random/ },
    { what: 'Date', code: 'export const now = () => Date.now();\n', rule: /no Date/ },
    { what: 'transcendental Math', code: 'export const f = (x: number) => Math.pow(x, 2);\n', rule: /transcendental/ },
    { what: 'the ** operator', code: 'export const f = (x: number) => x ** 2;\n', rule: /\*\* operator/ },
    { what: 'a host global', code: 'export const w = () => window.innerWidth;\n', rule: /DOM or host/ },
    {
      what: 'an impure import',
      code: "import { readFileSync } from 'node:fs';\nexport { readFileSync };\n",
      rule: /import only/,
    },
  ])('fails pure code that uses $what', ({ code, rule }) => {
    const report = checkWorkspace(
      workspace({ 'packages/sim/package.json': pure('@lyl/sim'), 'packages/sim/src/bad.ts': code }),
    );
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]).toMatchObject({ file: join('packages', 'sim', 'src', 'bad.ts') });
    expect(report.violations[0]?.rule).toMatch(rule);
  });

  it('leaves the engine to its own CI, and impure packages and tests alone', () => {
    const report = checkWorkspace(
      workspace({
        'packages/sim/package.json': pure('@lyl/sim'),
        'packages/sim/src/clock.ts': 'export const n = 1;\n',
        'packages/sim/src/clock.test.ts': 'export const seed = Math.random();\n',
        'packages/stage/package.json': JSON.stringify({ name: '@lyl/stage' }),
        'packages/stage/src/frame.ts': 'export const t = () => Date.now();\n',
      }),
    );
    expect(report).toEqual({ checked: ['@lyl/sim'], files: 1, violations: [] });
  });

  it('reports nothing checked when no package of this repo is pure', () => {
    const report = checkWorkspace(workspace({ 'packages/stage/package.json': JSON.stringify({ name: '@lyl/stage' }) }));
    expect(report).toEqual({ checked: [], files: 0, violations: [] });
  });
});
