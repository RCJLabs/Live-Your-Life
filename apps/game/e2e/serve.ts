/**
 * The built game, served for the readings scripts the way the e2e specs see it: `vite preview`
 * on port 4173 under LYL_BASE. Reuses a preview already running; build first (`pnpm build`).
 */
import { type ChildProcess, spawn } from 'node:child_process';

export const BASE = `http://localhost:4173${process.env.LYL_BASE ?? '/'}`;

async function up(): Promise<boolean> {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

/** Starts the preview if none is running; returns a function that stops what it started. */
export async function serve(): Promise<() => void> {
  if (await up()) return () => {};
  const child: ChildProcess = spawn('pnpm', ['--filter', '@lyl/game', 'preview'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 100; i++) {
    if (await up()) return () => process.kill(-(child.pid ?? 0));
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`The preview never answered at ${BASE}`);
}
