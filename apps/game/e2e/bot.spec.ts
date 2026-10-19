import { expect, test } from '@playwright/test';
import { play } from './bot/run.ts';

/**
 * M1.8's browser bot in CI: one full day of the steady life played by taps alone, refusing
 * nothing. The week's reading, at four times slower CPU, is the script's (day-bot.ts).
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test('the browser bot plays a day by taps alone, and the sim refuses nothing it is sent', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('./?seed=bot-1');
  const run = await play(page, 'steady', 2);
  expect(run.refused).toEqual([]);
  expect(run.days.map((d) => d.day)).toEqual([0, 1]);
  for (const d of run.days) expect(d.taps, `day ${d.day}`).toBeGreaterThan(0);
  expect(run.journal.some((line) => line.includes('signed up'))).toBe(true);
});
