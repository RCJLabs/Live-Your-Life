/**
 * `node tools/population/chromium.ts [days] [sizes]`: the population harness in headless
 * Chromium, at full CPU and slowed four times (the DevTools protocol's CPU throttle, as
 * apps/game/e2e/perf.ts). Vite serves the harness page from source. The container has no GPU,
 * which this doesn't touch, but its CPU is not a phone's: the 4× run stands in for one.
 */
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { DAYS, SIZES } from './src/sweep.ts';

const days = Number(process.argv[2] ?? DAYS);
const sizes = process.argv[3] ? process.argv[3].split(',').map(Number) : [...SIZES];
const RATES = [1, 4];

const server = await createServer({
  configFile: false,
  root: resolve(import.meta.dirname, 'page'),
  logLevel: 'silent',
  server: { port: 4190 },
});
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite gave no address for the harness page');
const browser = await chromium.launch();
try {
  for (const rate of RATES) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => 'runHarness' in window);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const started = Date.now();
    const text = await page.evaluate(
      ([d, s]) => (window as unknown as { runHarness: (d: number, s: number[]) => Promise<string> }).runHarness(d, s),
      [days, sizes] as [number, number[]],
    );
    console.log(
      `\n${days} game days, CPU ${rate}×, Chromium ${browser.version()}, ${((Date.now() - started) / 1000).toFixed(0)} s`,
    );
    console.log(text);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
