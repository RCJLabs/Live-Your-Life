/**
 * `node tools/city/chromium.ts [seeds] [rounds]`: the city bench in headless Chromium at full CPU
 * and slowed four times (M2.1, D65), as tools/population/chromium.ts runs its harness. The heap
 * is Chromium's `performance.memory`, coarse unless Chromium is started to read it precisely.
 */
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const seeds = Number(process.argv[2] ?? 10);
const rounds = Number(process.argv[3] ?? 3);
const server = await createServer({
  configFile: false,
  root: resolve(import.meta.dirname, 'page'),
  logLevel: 'silent',
  server: { port: 4191 },
});
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite gave no address for the city bench page');
const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
try {
  for (const rate of [1, 4]) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => 'runCity' in window);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const text = await page.evaluate(
      ([s, r]) => (window as unknown as { runCity: (s: number, r: number) => Promise<string> }).runCity(s, r),
      [seeds, rounds] as [number, number],
    );
    console.log(`\nChromium ${browser.version()}, CPU ${rate}×, ${seeds} seeds × ${rounds} rounds`);
    console.log(text);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
