/**
 * The browser bot's reading (M1.8, D55): a life played on the page by taps, on a phone's screen
 * with the CPU slowed four times, counting each game day's taps, pans and real minutes. The
 * steady profile plays a week; the thief takes once on the first day and plays until the case is
 * over, or `days` run out. Each seed is a life from `?seed=`, unsaved, so a run can be repeated.
 * The bot thinks in no time at all, so real minutes are the least a player could spend.
 *
 *   pnpm build && node apps/game/e2e/day-bot.ts [steady|thief] [days] [seeds] [rate]
 */
import { chromium } from '@playwright/test';
import { type DayCount, play } from './bot/run.ts';
import { BASE, serve } from './serve.ts';

const profile = (process.argv[2] ?? 'steady') as 'steady' | 'thief';
const days = Number(process.argv[3] ?? (profile === 'steady' ? 7 : 45));
const seeds = Number(process.argv[4] ?? 1);
const rate = Number(process.argv[5] ?? 4);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

const stop = await serve();
const browser = await chromium.launch();
try {
  const all: DayCount[] = [];
  for (let i = 1; i <= seeds; i++) {
    const seed = `bot-${i}`;
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}?seed=${seed}`);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const run = await play(page, profile, days);
    for (const c of run.days) {
      console.log(`${seed} day ${c.day}: ${c.taps} taps, ${c.pans} pans, ${(c.ms / 60000).toFixed(2)} real minutes`);
      all.push(c);
    }
    console.log(`${seed}: ${run.refused.length} refused; setup ${run.setup} tap(s); journal:`);
    for (const line of run.journal) console.log(`  ${line}`);
    await context.close();
  }
  // Day 0 starts at 07:00, so it's short; the reading is the full days after it.
  const full = all.filter((c) => c.day !== 0);
  console.log(
    `${profile}, ${rate}× CPU, ${full.length} full days over ${seeds} seed(s): ` +
      `median ${median(full.map((c) => c.taps))} taps a day (most ${Math.max(...full.map((c) => c.taps))}), ` +
      `${median(full.map((c) => c.pans))} pans, ${(median(full.map((c) => c.ms)) / 60000).toFixed(2)} real minutes`,
  );
} finally {
  await browser.close();
  await stop();
}
