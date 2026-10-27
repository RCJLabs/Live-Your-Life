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

/**
 * Eats at the flat's kitchenette when hungry, as a player waiting on answers would; a seed whose
 * offers come late would otherwise starve into hospital in its sleeps.
 */
async function eatIfHungry(page: Page, kitchen: PlaceInfo): Promise<void> {
  if ((await L<number>(page, 'fact', 'life.need', { need: 'food' })) >= 40) return;
  await tap(page, kitchen.id);
  await arrive(page);
  await page.locator('#menu button[data-activity="eat"]').first().click();
  await expect.poll(() => L<boolean>(page, 'busy'), { timeout: 10_000 }).toBe(false);
}

/** Sleeps, or rests, in your bed once, and waits for its time to pass on screen. */
async function sleepOnce(page: Page, bed: PlaceInfo, kitchen: PlaceInfo): Promise<void> {
  await eatIfHungry(page, kitchen);
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
  const all = await L<PlaceInfo[]>(page, 'places');
  const bed = all.find((p) => p.label === 'Bed' && p.building === 'apartment') as PlaceInfo;
  const kitchen = all.find((p) => p.label === 'Kitchenette' && p.building === 'apartment') as PlaceInfo;

  await jobs(page);
  await expect(page.locator('#your-job')).toContainText('on your block');
  // The rank the line cook leads to, and the hours it takes (M2.5).
  await expect(page.locator('#next-rank')).toHaveText(/^Next here: kitchen lead, after 2,000 more hours of work/);
  await page.click('#your-job button[data-action="job/quit"]');
  await expect(page.locator('#your-job')).toHaveText('You have no job.');

  // Apply for openings across the city until one is taken: the odds are shown, and rolled.
  for (let tries = 0; tries < 12 && (await L<number>(page, 'fact', 'market.offers')) === 0; tries++) {
    await jobs(page);
    const away = page
      .locator('#openings li', { hasNotText: 'on your block' })
      .locator('button[data-action="market/apply"]');
    if ((await away.count()) > 0) {
      await expect(page.locator('#openings li', { hasText: 'who apply are taken' }).first()).toBeVisible();
    }
    // Up to five at once, the most the market waits on, the best odds listed first: the line cook
    // takes 15 in 100 (D76), most of M2.8's careers 5. Three a round was enough only on the seeds
    // where the city's draw put a line cook's opening near; each career added redraws it.
    const listed = await L<{ opening: string; odds: number; problem: string | null }[]>(
      page,
      'fact',
      'market.openings',
    );
    const best = listed.filter((l) => l.problem === null).sort((a, b) => b.odds - a.odds);
    let sent = 0;
    for (const l of best) {
      if (sent >= 5) break;
      const go = page
        .locator(`#openings li[data-opening="${l.opening}"]`, { hasNotText: 'on your block' })
        .locator('button[data-action="market/apply"]');
      if ((await go.count()) === 0) continue;
      await go.click();
      sent++;
    }
    await page.click('#panel-close');
    for (let n = 0; n < 6 && (await L<number>(page, 'fact', 'market.waiting')) > 0; n++)
      await sleepOnce(page, bed, kitchen);
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
    await sleepOnce(page, bed, kitchen);
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
  // The ways there (M2.9): the bus while one runs, its minutes and fare as the sim previews them.
  await expect(page.locator('#choice button[data-way="walk"]')).toHaveText(`Walk, ${commute} minutes`);
  const bus = page.locator('#choice button[data-way="bus"]');
  const busShown = /^Bus, (\d+) minutes?, (\$[\d.,]+)$/.exec((await bus.textContent()) ?? '');
  expect(busShown, 'a bus to work is offered with its minutes and fare').not.toBeNull();
  await bus.click();

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
  expect(
    journal.some((l) => l.includes(`took the bus, ${busShown?.[1]} minutes for ${busShown?.[2]}`)),
    journal.join('\n'),
  ).toBe(true);
  // The shift was worked, and the way home passed on the clock after it.
  expect(await works()).toBeGreaterThan(worksBefore);
  expect(commute).toBeGreaterThan(0);
  expect((await L<number>(page, 'fact', 'time.tick')) - endsAt, 'home some minutes after the shift').toBeGreaterThan(0);
  expect(await L(page, 'refused')).toEqual([]);
  expect(errors).toEqual([]);
});
