/**
 * Plays days of a life on the page with the browser bot (M1.8) and counts each game day's taps,
 * pans and real time. Shared by the readings script (day-bot.ts) and the browser test.
 */
import type { Page } from '@playwright/test';
import { Driver } from './driver.ts';
import { type Profile, step } from './player.ts';

export interface DayCount {
  readonly day: number;
  readonly taps: number;
  readonly pans: number;
  readonly ms: number;
}

export interface Played {
  readonly days: DayCount[];
  readonly refused: unknown[];
  readonly journal: string[];
  /** Taps before the first day began: the speed, set once. */
  readonly setup: number;
  /** Every tap of the run, the last part-day's included. */
  readonly taps: number;
}

/** What still waits on a thief: the case isn't over while any of these is listed. */
const CASE = new Set(['police', 'court', 'owed']);

export async function play(page: Page, profile: Profile, days: number): Promise<Played> {
  const d = new Driver(page);
  await d.start();
  await d.tap('#speed');
  const setup = d.taps;
  const counts: DayCount[] = [];
  let day = await d.fact<number>('time.day');
  let mark = { taps: d.taps, pans: d.pans, at: Date.now() };
  let took = false;
  for (;;) {
    took = await step(d, profile, took);
    const now = await d.fact<number>('time.day');
    if (now !== day) {
      counts.push({ day, taps: d.taps - mark.taps, pans: d.pans - mark.pans, ms: Date.now() - mark.at });
      mark = { taps: d.taps, pans: d.pans, at: Date.now() };
      day = now;
      if (profile === 'steady' && day >= days) break;
      if (profile === 'thief') {
        const waiting = await d.hook<{ kind: string }[]>('waiting');
        if ((took && !waiting.some((w) => CASE.has(w.kind)) && day >= 7) || day >= days) break;
      }
    }
  }
  return {
    days: counts,
    refused: await d.hook<unknown[]>('refused'),
    journal: await d.hook<string[]>('journal'),
    setup,
    taps: d.taps,
  };
}
