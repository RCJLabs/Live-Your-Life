/**
 * What VOICE.md forbids that a machine can see (D129): an exclamation mark, a game's words, a number
 * typed into prose rather than formatted from the rules, and a real brand or place from the
 * blocklist. The judgement the rest of VOICE.md asks is Evan's reading of every string (M2.10).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Finding {
  readonly where: string;
  readonly rule: 'exclamation' | 'game-word' | 'typed-number' | 'blocklist' | 'chronicle-you';
  readonly text: string;
}

const BLOCKLIST = JSON.parse(readFileSync(resolve(import.meta.dirname, 'blocklist.json'), 'utf8')) as {
  names: string[];
};

/** Game vocabulary in the fiction (VOICE.md, "What the voice forbids"). */
const GAME_WORDS = [
  'buff',
  'buffs',
  'nerf',
  'grind',
  'grinding',
  'rng',
  'xp',
  'level up',
  'levelled up',
  'leveled up',
  'loot',
  'quest',
  'epic',
  'legendary',
  'respawn',
  'npc',
  'achievement unlocked',
];

const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD = new RegExp(`\\b(${GAME_WORDS.map(escaped).join('|')})\\b`, 'i');
// Brands and places are proper names: matched as written, so "target" the word isn't "Target" the chain.
const NAMES = new RegExp(`\\b(${BLOCKLIST.names.map(escaped).join('|')})\\b`);

/**
 * A string with its placeholders, and the glue that formats a value rather than being one, taken
 * out: the minutes after an hour ("{x}:00"), odds ("1 in {x}", "{x} in 100"), the clock's speed
 * ("1×") and a day of the month ("the 1st").
 */
const unformatted = (text: string): string =>
  text
    .replace(/\{[^}]*\}:00/g, '')
    .replace(/\b1 in \{[^}]*\}/g, '')
    .replace(/\{[^}]*\} in 100\b/g, '')
    .replace(/\d×/g, '')
    .replace(/\bthe 1st\b/g, '')
    .replace(/\{[^}]*\}/g, '');

/**
 * The findings for one string. `prose` is text a player reads as sentences, where a number must come
 * from the rules (a `{placeholder}` or a formatted value), never typed in.
 */
export function check(where: string, text: string, prose: boolean, chronicle = false): Finding[] {
  const out: Finding[] = [];
  if (text.includes('!')) out.push({ where, rule: 'exclamation', text });
  const word = WORD.exec(text);
  if (word) out.push({ where, rule: 'game-word', text: `${word[1]}: ${text}` });
  const name = NAMES.exec(text);
  if (name) out.push({ where, rule: 'blocklist', text: `${name[1]}: ${text}` });
  if (prose && /\d/.test(unformatted(text))) out.push({ where, rule: 'typed-number', text });
  // The chronicle is third person (VOICE.md, register 2): the player is named by {you}, never addressed.
  if (chronicle && /\b(you|your|yours|yourself)\b/i.test(text.replace(/\{[^}]*\}/g, '')))
    out.push({ where, rule: 'chronicle-you', text });
  return out;
}
