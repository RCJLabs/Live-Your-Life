import { expect, type Page, test } from '@playwright/test';
import { watchErrors } from './checks.ts';

/**
 * M2.3's labor market on the page (D73, D74), by taps: quit the diner, apply for a job across the
 * city from the Jobs tab, sleep until the answer, take the offer, sign up for a shift, and go to
 * work from the panel: off screen, the walk there and back passing on the clock.
 */

type Life = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Life } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

interface PlaceInfo {
  id: string;
  label: string;
  building: string;
}

async function tap(page: Page, id: string): Promise<void> {
  await L(page, 'focus', id);
  await page.waitForTimeout(80);
  const at = await L<{ x: number; y: number }>(page, 'screenOf', id);
  await page.mouse.click(at.x, at.y);
}

async function arrive(page: Page): Promise<void> {
  await expect
    .poll(async () => (await L<{ walking: boolean }>(page, 'where')).walking, { timeout: 30_000 })
    .toBe(false);
}

const jobs = async (page: Page) => {
  if (!(await page.locator('#panel').isVisible())) await page.click('#badge');
  await page.click('button[data-tab="jobs"]');
};

/** Sleeps, or rests, in your bed once, and waits for its time to pass on screen. */
async function sleepOnce(page: Page, bed: PlaceInfo): Promise<void> {
  await tap(page, bed.id);
  await arrive(page);
  await page.locator('#menu button[data-action="life/do"]').first().click();
  await expect.poll(() => L<boolean>(page, 'busy'), { timeout: 10_000 }).toBe(false);
}

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test('quits, applies across the city, takes the offer and goes to work off screen', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await page.goto('./?seed=life-1');
  await expect(page.locator('#when')).toContainText('07:0');
  const bed = (await L<PlaceInfo[]>(page, 'places')).find(
    (p) => p.label === 'Bed' && p.building === 'apartment',
  ) as PlaceInfo;

  await jobs(page);
  await expect(page.locator('#your-job')).toContainText('on your block');
  await page.click('#your-job button[data-action="job/quit"]');
  await expect(page.locator('#your-job')).toHaveText('You have no job.');

  // Apply for openings across the city until one is taken: the odds are shown, and rolled.
  for (let tries = 0; tries < 12 && (await L<number>(page, 'fact', 'market.offers')) === 0; tries++) {
    await jobs(page);
    const away = page
      .locator('#openings li', { hasNotText: 'on your block' })
      .locator('button[data-action="market/apply"]');
    // Up to three at once, as the seeker bot does: the line cook takes 15 in 100 (D76).
    if ((await away.count()) > 0) {
      await expect(page.locator('#openings li', { hasText: 'who apply are taken' }).first()).toBeVisible();
    }
    for (let n = 0; n < 3 && (await away.count()) > 0; n++) await away.first().click();
    await page.click('#panel-close');
    for (let n = 0; n < 6 && (await L<number>(page, 'fact', 'market.waiting')) > 0; n++) await sleepOnce(page, bed);
  }
  expect(await L<number>(page, 'fact', 'market.offers'), 'an offer, after twelve rounds').toBeGreaterThan(0);
  await jobs(page);
  await page.locator('#job-offers button[data-action="market/accept"]').first().click();
  await expect(page.locator('#your-job')).toContainText('-minute walk');
  expect(await L<boolean>(page, 'fact', 'market.at-diner')).toBe(false);

  // A shift, then sleep until it is time to go.
  await page.click('button[data-tab="week"]');
  await page.locator('#postings button').first().click();
  await page.click('#panel-close');
  for (let i = 0; i < 8; i++) {
    const go = (await L<{ kind: string; text: string }[]>(page, 'waiting')).some((w) => w.text.includes('walk away'));
    if (go) break;
    await sleepOnce(page, bed);
  }
  await page.click('#badge');
  await page.click('button[data-tab="waiting"]');
  // The alarm is the walk the page measured and the sim keeps, and ten minutes to get out (you.ts).
  const commute = (await L<number>(page, 'fact', 'you.alarm')) - 10;
  const leftAt = await L<number>(page, 'fact', 'time.tick');
  // When the shift ends: it starts in `next-shift-in`, and the line cook's last eight hours.
  const endsAt = leftAt + ((await L<number | undefined>(page, 'fact', 'job.next-shift-in')) ?? 0) + 480;
  const works = async () => (await L<string[]>(page, 'log')).filter((t) => t === 'life/do').length;
  const worksBefore = await works();
  await page.locator('#waiting button', { hasText: 'Go to work' }).click();
  await expect(page.locator('#panel')).toBeHidden();

  // Off screen until it's over, answering whatever stops the shift.
  for (let i = 0; i < 40 && (await L<string | null>(page, 'trip')) !== null; i++) {
    if (await page.locator('#choice').isVisible()) await page.locator('#choice button').first().click();
    await page.waitForTimeout(1000);
  }
  expect(await L<string | null>(page, 'trip')).toBeNull();
  // Home at your door.
  const reached = await L<string>(page, 'reached');
  const back = (await L<(PlaceInfo & { kind: string })[]>(page, 'places')).find((p) => p.id === reached);
  expect(back?.kind).toBe('door');
  const journal = await L<string[]>(page, 'journal');
  expect(
    journal.some((l) => l.includes('started a new job')),
    journal.join('\n'),
  ).toBe(true);
  // The shift was worked, and the walk home passed on the clock after it.
  expect(await works()).toBeGreaterThan(worksBefore);
  expect(commute).toBeGreaterThan(0);
  expect((await L<number>(page, 'fact', 'time.tick')) - endsAt, 'home a walk after the shift').toBeGreaterThanOrEqual(
    commute,
  );
  expect(await L(page, 'refused')).toEqual([]);
  expect(errors).toEqual([]);
});
