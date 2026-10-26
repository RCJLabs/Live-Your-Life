/**
 * Every player-facing string, where it lives and its register (VOICE.md): the records' text fields,
 * and the string literals and template text of the page's interface code. The lint checks them
 * (cli.ts); the strings page lists them for Evan's reading (M2.10, D129).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { type Node, parse } from 'acorn';

export type Register = 'interface' | 'chronicle' | 'label';

export interface PlayerString {
  /** File, and the record's key or the code's line. */
  readonly where: string;
  readonly text: string;
  readonly register: Register;
  /** Sentences a player reads, where a number must come from the rules. */
  readonly prose: boolean;
}

const ROOT = resolve(import.meta.dirname, '../..');
const RECORDS = join(ROOT, 'packages/content/records');
const PAGE = join(ROOT, 'apps/game/src/life');

/** Record keys that hold prose, by register; names are labels. */
const PROSE: Readonly<Record<string, Register>> = {
  // A life event's journal line, kept in its own record (M2.10 step 4).
  line: 'chronicle',
  prompt: 'interface',
  text: 'interface',
  told: 'interface',
  says: 'interface',
  asks: 'interface',
};
/** Keys that are the rules' own, never shown as written: conditions, statutes, sources. */
const SKIP = new Set(['when', 'law', 'source', 'id', 'about']);

function files(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

function fromRecords(): PlayerString[] {
  const out: PlayerString[] = [];
  for (const file of files(RECORDS, '.json')) {
    const where = relative(ROOT, file);
    // The journal's lines are the chronicle's register (VOICE.md, register 2).
    const chronicle = where.includes('/records/line/');
    const walk = (v: unknown, key: string): void => {
      if (Array.isArray(v)) for (const x of v) walk(x, key);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
      else if (typeof v === 'string' && !SKIP.has(key) && /[a-z] /i.test(v)) {
        const register = chronicle ? 'chronicle' : (PROSE[key] ?? 'label');
        out.push({ where: `${where} ${key}`, text: v, register, prose: key in PROSE });
      }
    };
    walk(JSON.parse(readFileSync(file, 'utf8')), '');
  }
  return out;
}

/** Calls whose strings are for developers, not players. */
const DEV = /^(Error|TypeError|RangeError|console\.\w+|assert)$/;

type Any = Node & Record<string, unknown>;
const children = (n: Any): Any[] =>
  Object.values(n).flatMap((v) =>
    Array.isArray(v)
      ? v.filter((x) => x && typeof x === 'object' && 'type' in x)
      : v && typeof v === 'object' && 'type' in (v as object)
        ? [v]
        : [],
  ) as Any[];

function fromCode(): PlayerString[] {
  const out: PlayerString[] = [];
  for (const file of files(PAGE, '.ts').filter((f) => !f.endsWith('.test.ts'))) {
    const where = relative(ROOT, file);
    // Types become spaces, so the positions, and the lines, stay those of the source.
    const source = readFileSync(file, 'utf8');
    const js = stripTypeScriptTypes(source, { mode: 'strip' });
    const skipped = new Set<number>();
    const ast = parse(js, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      // `// voice: not shown` above a line leaves its strings out, for text no player reads.
      onComment: (_block, text, _start, _end, at) => {
        if (text.includes('voice: not shown') && at) skipped.add(at.line + 1);
      },
    }) as unknown as Any;
    const add = (n: Any, text: string) => {
      // A sentence a player reads has a word, a space and a word; ids, classes and keys don't.
      const line = (n.loc as { start: { line: number } }).start.line;
      if (skipped.has(line) || !/[a-z]{2,} [a-z]/i.test(text)) return;
      out.push({ where: `${where}:${line}`, text, register: 'interface', prose: true });
    };
    const name = (n: Any): string =>
      n.type === 'Identifier'
        ? String(n.name)
        : n.type === 'MemberExpression'
          ? `${name(n.object as Any)}.${name(n.property as Any)}`
          : '';
    const visit = (n: Any): void => {
      if ((n.type === 'CallExpression' || n.type === 'NewExpression') && DEV.test(name(n.callee as Any))) return;
      if (n.type === 'Literal' && typeof n.value === 'string') add(n, n.value);
      else if (n.type === 'TemplateLiteral') {
        // The text around the `${}`s: what is typed in, not what the rules format.
        const quasis = n.quasis as { value: { cooked: string } }[];
        add(n, quasis.map((q) => q.value.cooked).join('{}'));
      }
      for (const c of children(n)) visit(c);
    };
    visit(ast);
  }
  return out;
}

export const playerStrings = (): PlayerString[] => [...fromRecords(), ...fromCode()];
