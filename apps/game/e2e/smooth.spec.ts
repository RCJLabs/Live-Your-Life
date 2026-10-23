import { expect, type Page, test } from '@playwright/test';

/**
 * The people in the town move smoothly (M2.2's walkers, D72's passers-by): placed every frame from
 * the clock as the page shows it, not only when the sim's clock steps a whole game minute. At 1×
 * a walker covers about 4 m of a game minute, two game minutes a real second; stepping by whole
 * minutes, each jumped about 2 m twice a second and stood still between.
 */

type Spot = { id: string; x: number; y: number; walking: boolean };

/** Every walker's place on each of `frames` animation frames. */
const sample = (page: Page, frames: number): Promise<Spot[][]> =>
  page.evaluate(
    (n) =>
      new Promise<Spot[][]>((done) => {
        const life = (window as unknown as { __lyl: { life: { crowd: () => Spot[] } } }).__lyl.life;
        const out: Spot[][] = [];
        const step = () => {
          out.push(life.crowd().filter((a) => a.walking));
          if (out.length < n) requestAnimationFrame(step);
          else done(out);
        };
        requestAnimationFrame(step);
      }),
    frames,
  );

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test('moves the people a little every frame, never in jumps', async ({ page }) => {
  await page.goto('./?seed=life-1');
  await expect(page.locator('#when')).toContainText('07:0');
  // The morning rush, at speed 1 and at speed 2.
  for (const speed of [1, 2]) {
    if (speed === 2) await page.click('#speed');
    const frames = await sample(page, 90);
    let moves = 0;
    let still = 0;
    let largest = 0;
    for (let f = 1; f < frames.length; f++) {
      const before = new Map((frames[f - 1] as Spot[]).map((s) => [s.id, s]));
      for (const s of frames[f] as Spot[]) {
        const b = before.get(s.id);
        if (!b) continue;
        const d = Math.abs(s.x - b.x) + Math.abs(s.y - b.y);
        if (d === 0) still++;
        else moves++;
        largest = Math.max(largest, d);
      }
    }
    expect(moves, `someone walks at speed ${speed}`).toBeGreaterThan(50);
    // A walker who stands still on most frames is being moved in steps.
    expect(still / (moves + still), `frames a walker stood still at speed ${speed}`).toBeLessThan(0.2);
    // Speed 2 is four times as fast: about 1 m a frame at 30 frames a second, never a jump.
    expect(largest, `the largest step in a frame at speed ${speed}`).toBeLessThan(speed === 1 ? 0.6 : 2);
  }
});
