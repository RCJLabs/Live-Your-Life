/**
 * The spike's frame rate in headless Chromium, at the phone's size, with the CPU at full speed
 * and slowed four times (2060TD's `scripts/perf.mjs`: the DevTools protocol's CPU throttle).
 * Each run is the page's own Measure: a second to settle, ten seconds at speed 1. The container
 * has no GPU, so this is not a phone's number; M0.3's gate is the reading on Evan's phone.
 *
 *   pnpm build && node apps/game/e2e/perf.ts [runs] [match]
 *
 * `match` runs only the paths whose name holds it ("generated" for M1.1's block).
 */
import { chromium } from '@playwright/test';
import { BASE, serve } from './serve.ts';

const runs = Number(process.argv[2] ?? 3);
const match = process.argv[3] ?? '';
/** The kept still picture, and the plain painter's order every frame, to compare; and M1.1's generated block. */
const PATHS = [
  { name: 'the life, walking to the diner', query: 'seed=life-1', life: 'door/diner' },
  { name: 'kept still picture', query: 'spike&at=13:00' },
  { name: 'everything every frame', query: 'spike&at=13:00&cache=0' },
  { name: 'kept still picture, at night', query: 'spike&at=22:30' },
  { name: 'generated block', query: 'block=generated&at=13:00' },
  { name: 'generated block, at night', query: 'block=generated&at=22:30' },
].filter((p) => p.name.includes(match));
const stop = await serve();
const browser = await chromium.launch();
try {
  for (const [path, rate] of PATHS.flatMap((p) => [1, 4].map((r) => [p, r] as const))) {
    const lines: { fps: number; text: string }[] = [];
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${BASE}?${path.query}`);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      let text: string;
      if ('life' in path) {
        // The life has no Measure button: its hook runs the same measure while you walk the block.
        await page.waitForFunction(() => 'life' in ((window as { __lyl?: object }).__lyl ?? {}));
        text = await page.evaluate(async (to) => {
          const life = (window as unknown as { __lyl: { life: Record<string, (...a: unknown[]) => unknown> } }).__lyl
            .life;
          life.goTo?.(to);
          return (await life.measure?.()) as string;
        }, path.life);
      } else {
        await page.locator('#measure').click();
        await page.locator('#measured').waitFor({ state: 'visible', timeout: 60_000 });
        text = (await page.locator('#measured-text').textContent()) ?? '';
      }
      lines.push({ fps: Number.parseFloat(text), text });
      await context.close();
    }
    lines.sort((a, b) => a.fps - b.fps);
    const median = lines[Math.floor(lines.length / 2)];
    console.log(`${path.name}, CPU ${rate}×, median of ${runs}: ${median?.text.split(' Screen')[0]}`);
    console.log(`  all runs: ${lines.map((l) => l.fps.toFixed(1)).join(', ')} fps`);
  }
} finally {
  await browser.close();
  stop();
}
