/**
 * Checks every page gets: no console errors, nothing past the device's width, 44 px targets,
 * no axe issues. From Engine-Builder's `apps/editor/e2e/checks.ts`, where each was proven by
 * failing first; the reasons are kept with them.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Console errors and uncaught exceptions seen while a test runs; every test expects none. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * Every rendered box sits inside the device's width. The page never scrolls (its body is
 * overflow: hidden), so `scrollWidth` can't fail; and on a phone, content too wide makes the
 * browser widen the layout viewport, so `innerWidth` grows with it. So the width comes from the
 * test's own viewport, and the layout viewport must not have grown.
 */
export async function expectNothingOffscreen(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  expect(await page.evaluate(() => window.innerWidth), 'layout viewport grew past the device width').toBe(width);
  const offenders = await page.evaluate((width) => {
    const found: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || (box.width <= 1 && box.height <= 1)) continue;
      if (box.right > width + 0.5 || box.left < -0.5) {
        found.push(`${el.tagName.toLowerCase()}#${el.id} [${Math.round(box.left)}–${Math.round(box.right)}]`);
      }
    }
    return found.slice(0, 5);
  }, width);
  expect(offenders, 'elements outside the viewport').toEqual([]);
}

/** Visible controls inside `scope` narrower or shorter than 44 px, as "name w×h". */
export function smallTargets(page: Page, scope: string): Promise<string[]> {
  const controls = 'button, input, select, textarea, a[href]';
  return page.locator(`${scope} :is(${controls}):visible`).evaluateAll((els) =>
    els
      .map((el) => ({
        name: el.textContent?.trim() || el.getAttribute('aria-label') || el.id,
        box: el.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(({ name, box }) => `${name} ${Math.round(box.width)}×${Math.round(box.height)}`),
  );
}

/** No axe violations of any impact, and no id on two elements. */
export async function expectNoAxeIssues(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes[0]?.target.join(' ')})`)).toEqual([]);
  const twice = await page.evaluate(() => {
    const seen = new Set<string>();
    const found = new Set<string>();
    for (const el of document.querySelectorAll('[id]')) {
      if (seen.has(el.id)) found.add(el.id);
      seen.add(el.id);
    }
    return [...found];
  });
  expect(twice, 'ids on more than one element').toEqual([]);
}

/** How bright the city's canvas is, 0 to 255, and how many different colours it shows, sampled. */
export function picture(page: Page): Promise<{ brightness: number; colours: number }> {
  return page.evaluate(() => {
    const canvas = document.getElementById('city') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let n = 0;
    const colours = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      sum += (r + g + b) / 3;
      n++;
      colours.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
    }
    return { brightness: sum / n, colours: colours.size };
  });
}
