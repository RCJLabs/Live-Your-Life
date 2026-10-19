/**
 * The tester brief's screenshots (docs/research/art-spike.md) and the figures' heights in each
 * framing, for ROADMAP.md's Readings. Every shot is a frozen moment of the default seed, so it
 * comes out the same each time. Drawn at 2×, the most the game draws at.
 *
 *   pnpm build && node apps/game/e2e/shots.ts [out-dir]
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { BASE, serve } from './serve.ts';

const out = process.argv[2] ?? 'docs/research/art-spike';
/** A moment when the walker is in frame and the first of the two arguing is speaking. */
const MOMENT = 'freeze=1.2';

const SHOTS = [
  { file: 'a-posture-only.png', query: `at=13:00&bubbles=0&hud=0&${MOMENT}`, width: 390, height: 844 },
  { file: 'b-with-bubbles.png', query: `at=13:00&hud=0&${MOMENT}`, width: 390, height: 844 },
  { file: 'c-night.png', query: `at=22:30&hud=0&${MOMENT}`, width: 390, height: 844 },
  { file: 'd-close-diner.png', query: `at=13:00&hud=0&view=close&focus=diner&${MOMENT}`, width: 390, height: 844 },
  { file: 'e-close-flat.png', query: `at=13:00&hud=0&view=close&focus=apartment&${MOMENT}`, width: 390, height: 844 },
  { file: 'f-landscape.png', query: `at=13:00&hud=0&${MOMENT}`, width: 844, height: 390 },
  { file: 'g-walls-up.png', query: `at=13:00&hud=0&walls=up&${MOMENT}`, width: 390, height: 844 },
  { file: 'h-with-controls.png', query: `at=13:00&${MOMENT}`, width: 390, height: 844 },
];

await mkdir(out, { recursive: true });
const stop = await serve();
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(`${BASE}?${shot.query}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${shot.file}` });
    const heights = (await page.evaluate('window.__lyl.heights()')) as Record<string, number>;
    const shown = Object.entries(heights)
      .map(([who, h]) => `${who} ${h.toFixed(0)}`)
      .join(', ');
    console.log(`${shot.file} (${shot.width}×${shot.height}): people ${shown || 'none standing'} CSS px tall`);
    await page.close();
  }
} finally {
  await browser.close();
  stop();
}
