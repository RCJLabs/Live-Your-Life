import { expect, test } from '@playwright/test';
import { play } from './bot/run.ts';

/**
 * M1.8's browser bot in CI: the steady life played by taps alone into its first shift, on
 * Wednesday, refusing nothing. The week's reading, at four times slower CPU, is the script's
 * (day-bot.ts).
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test('the browser bot plays to its first shift and works it, by taps alone, and the sim refuses nothing', async ({
  page,
}) => {
  test.setTimeout(900_000);
  await page.goto('./?seed=bot-1');
  const run = await play(page, 'steady', 3);
  expect(run.refused).toEqual([]);
  expect(run.days.map((d) => d.day)).toEqual([0, 1, 2]);
  for (const d of run.days) expect(d.taps, `day ${d.day}`).toBeGreaterThan(0);
  expect(run.journal.some((line) => line.includes('signed up'))).toBe(true);
  expect(
    run.journal.some((line) => line.includes('worked')),
    run.journal.join('\n'),
  ).toBe(true);
});
