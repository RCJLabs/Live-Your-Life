/**
 * `node tools/population/life.ts [rounds]`: the life bench (src/life.ts) in Node, then in headless
 * Chromium at full CPU and slowed four times, as chromium.ts runs the harness. Default: 5 rounds.
 */
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { formatLife, measureLife } from './src/life.ts';

const rounds = Number(process.argv[2] ?? 5);
const node = await measureLife(
  rounds,
  () => performance.now(),
  async () => {},
);
console.log(`Node ${process.version}, ${rounds} rounds\n${formatLife(node)}`);

const server = await createServer({
  configFile: false,
  root: resolve(import.meta.dirname, 'page'),
  logLevel: 'silent',
  server: { port: 4192 },
});
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite gave no address for the harness page');
const browser = await chromium.launch();
try {
  for (const rate of [1, 4]) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => 'runLife' in window);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const text = await page.evaluate(
      (r) => (window as unknown as { runLife: (r: number) => Promise<string> }).runLife(r),
      rounds,
    );
    console.log(`\nChromium ${browser.version()}, CPU ${rate}×, ${rounds} rounds\n${text}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
