/**
 * `node tools/voice/page.ts <out.html>`: the strings page (M2.10 step 2, D129). Every player-facing
 * string the lint reads, grouped by register and file, written into page.html for Evan's reading.
 * Each string's id hashes its file and text, not its line, so a mark survives code moving around it.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { playerStrings } from './strings.ts';

const out = process.argv[2];
if (!out) throw new Error('usage: node tools/voice/page.ts <out.html>');

const id = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);
const rows = playerStrings().map((s) => {
  const [file, at] = s.where.split(/[ :](?=[^ :]*$)/);
  return { id: id(`${file}\n${s.text}`), file, at, text: s.text, register: s.register };
});
// The same text twice in one file is one string to read.
const unique = [...new Map(rows.map((r) => [r.id, r])).values()];

const template = readFileSync(resolve(import.meta.dirname, 'page.html'), 'utf8');
const data = JSON.stringify(unique).replace(/</g, '\\u003c');
writeFileSync(out, template.replace('/*STRINGS*/[]', data));
console.log(`strings page: ${unique.length} strings, ${out}`);
