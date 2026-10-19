/**
 * The save readings (M1.7) in headless Chromium at the phone's size, with the CPU at full speed and
 * slowed four times: a life's save in bytes, and the time to write it to IndexedDB and load it
 * back (checked, migrated and replayed). The life has run at speed 2 for `seconds` first, so its
 * log holds the page's time as well as what was done.
 *
 *   pnpm build && node apps/game/e2e/saves-bench.ts [n] [seconds]
 */
import { chromium } from '@playwright/test';
import { BASE, serve } from './serve.ts';

const n = Number(process.argv[2] ?? 20);
const seconds = Number(process.argv[3] ?? 10);
type Bench = { bytes: number; log: number; state: number; write: number[]; load: number[] };
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)] as number;

const stop = await serve();
const browser = await chromium.launch();
try {
  for (const rate of [1, 4]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForFunction(() => 'life' in ((window as { __lyl?: object }).__lyl ?? {}));
    await page.click('#speed');
    await page.waitForTimeout(seconds * 1000);
    await page.click('#play');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const b = (await page.evaluate(
      (k) =>
        (window as unknown as { __lyl: { life: { saveBench(n: number): Promise<unknown> } } }).__lyl.life.saveBench(k),
      n,
    )) as Bench;
    console.log(
      `${rate}× CPU: save ${b.bytes} bytes (state ${b.state}, log ${b.log} actions); ` +
        `write median ${median(b.write).toFixed(2)} ms (95th ${p95(b.write).toFixed(2)}), ` +
        `load median ${median(b.load).toFixed(2)} ms (95th ${p95(b.load).toFixed(2)}), N=${n}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await stop();
}
