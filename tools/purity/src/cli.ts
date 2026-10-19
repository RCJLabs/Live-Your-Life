/**
 * `pnpm lint` runs this after Biome. Exits 1 on any violation, and also when it finds nothing
 * to check: a lint that silently scans zero files passes exactly like a clean one (the
 * engine's rule).
 */
import { resolve } from 'node:path';
import { checkWorkspace } from './check.ts';

const root = resolve(import.meta.dirname, '../../..');
const { checked, files, violations } = checkWorkspace(root);

if (checked.length === 0 || files === 0) {
  console.error('purity: found no pure source files; check pnpm-workspace.yaml and the "eb.pure" markers');
  process.exit(1);
}
if (violations.length > 0) {
  for (const v of violations) console.error(`${v.file}:${v.line}  ${v.rule}`);
  console.error(`purity: ${violations.length} violation(s)`);
  process.exit(1);
}
console.log(`purity: ok (${checked.length} pure package(s), ${files} file(s): ${checked.join(', ')})`);
