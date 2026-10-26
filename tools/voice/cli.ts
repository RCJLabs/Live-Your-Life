/**
 * `node tools/voice/cli.ts`: the content lint (M2.10, D129). Fails, listing each finding, when a
 * player-facing string breaks a rule VOICE.md sets and a machine can check (rules.ts). Part of
 * `pnpm lint`, so CI runs it.
 */
import { check } from './rules.ts';
import { playerStrings } from './strings.ts';

const strings = playerStrings();
const findings = strings.flatMap((s) =>
  check(s.where, s.text.replace(/\{\}/g, '{x}'), s.prose || s.register === 'chronicle', s.register === 'chronicle'),
);
for (const f of findings) console.log(`${f.rule.padEnd(13)} ${f.where}\n              ${f.text}`);
console.log(`voice: ${strings.length} strings, ${findings.length} findings`);
if (findings.length > 0) process.exit(1);
