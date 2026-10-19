import { expect, type Page, test } from '@playwright/test';
import { expectNoAxeIssues, expectNothingOffscreen, smallTargets, watchErrors } from './checks.ts';

/** M1.7's saves (D53, D54): a life saved as it goes, back after a reload, and no going back within it. */

type Hooks = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Hooks } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

interface PlaceInfo {
  id: string;
  kind: string;
  label: string;
  building: string;
}

async function arrive(page: Page): Promise<void> {
  await expect
    .poll(async () => (await L<{ walking: boolean }>(page, 'where')).walking, { timeout: 30_000 })
    .toBe(false);
}

/** Reloads, as closing and opening the game would, and goes on with a slot's life. */
async function reopen(page: Page, slot = 'life-1'): Promise<void> {
  await page.reload();
  await page.locator(`#lives li[data-slot="${slot}"] button[data-do="go"]`).click();
  await expect(page.locator('#when')).toContainText('June');
}

/** Writes over a key in the page's save database, as a damaged disk or an old bug might. */
async function damage(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((done, fail) => {
        const open = indexedDB.open('eb', 1);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, k);
          tx.oncomplete = () => {
            open.result.close();
            done();
          };
          tx.onerror = () => fail(tx.error);
        };
      }),
    [key, value],
  );
}

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test('brings a life back after a reload: the day, the money, the journal and the place you last reached', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await expect(page.locator('#when')).toContainText('June');
  await page.click('#badge');
  await page.click('button[data-tab="week"]');
  await page.locator('#postings button').first().click();
  await page.click('#panel-close');
  await page.click('#map-button');
  await page.locator('#map-places button', { hasText: 'Diner' }).first().click();
  await arrive(page);
  await page.click('#play');
  const diner = (await L<PlaceInfo[]>(page, 'places')).find((p) => p.kind === 'door' && p.building === 'diner');
  const before = {
    tick: await L<number>(page, 'tick'),
    cash: await L<number>(page, 'fact', 'economy.amount', { resource: 'cash' }),
    journal: await L<string[]>(page, 'journal'),
    reached: await L<string>(page, 'reached'),
  };
  expect(await L<boolean>(page, 'saved')).toBe(true);
  await reopen(page);
  expect(await L<number>(page, 'tick')).toBe(before.tick);
  expect(await L<number>(page, 'fact', 'economy.amount', { resource: 'cash' })).toBe(before.cash);
  expect(await L<string[]>(page, 'journal')).toEqual(before.journal);
  expect(before.journal.some((line) => line.includes('signed up'))).toBe(true);
  const at = await L<{ x: number; y: number }>(page, 'where');
  expect(before.reached, 'the place you last reached is the diner’s door').toBe(diner?.id);
  const want = await L<{ x: number; y: number }>(page, 'standOf', diner?.id);
  expect(Math.hypot(at.x - want.x, at.y - want.y)).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});

test('a roll taken stands: reloading straight after doesn’t undo it', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#when')).toContainText('June');
  const shelves = (await L<PlaceInfo[]>(page, 'places')).filter((p) => p.kind === 'shelf');
  let took = false;
  for (const shelf of shelves) {
    await L(page, 'goTo', shelf.id);
    await arrive(page);
    const take = page.locator('#menu button[data-action="law/take"]');
    if ((await take.count()) === 0) {
      await page.click('#menu button[data-action="leave"]');
      continue;
    }
    await take.first().click();
    took = true;
    break;
  }
  expect(took, 'a shelf offers a take').toBe(true);
  const heat = await L<number>(page, 'fact', 'law.heat');
  expect(heat, 'the take raised the heat').toBeGreaterThan(0);
  const journal = await L<string[]>(page, 'journal');
  // No wait for the save: the reload comes as fast as a player's could.
  await reopen(page);
  expect(await L<number>(page, 'fact', 'law.heat')).toBe(heat);
  expect(await L<string[]>(page, 'journal')).toEqual(journal);
});

test('three slots each hold a life, and a life can be ended for good to free its slot', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#when')).toContainText('June');
  expect(await L<boolean>(page, 'saved')).toBe(true);
  await page.goto('./?lives');
  const cards = page.locator('#lives li');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator('h2')).not.toHaveText('Life 1');
  await expect(cards.nth(1)).toContainText('No one yet.');
  await expectNothingOffscreen(page);
  expect(await smallTargets(page, '#lives')).toEqual([]);
  await expectNoAxeIssues(page);

  await cards.nth(1).locator('button[data-do="start"]').click();
  await expect(page.locator('#when')).toContainText('June');
  expect(await L<string>(page, 'slot')).toBe('life-2');
  expect(await L<boolean>(page, 'saved')).toBe(true);
  await page.click('#badge');
  await page.click('#lives-button');
  await expect(cards.nth(1).locator('button[data-do="go"]')).toBeVisible();

  await cards.nth(1).locator('button[data-do="end"]').click();
  await expect(cards.nth(1)).toContainText('for good');
  await cards.nth(1).locator('button[data-do="keep"]').click();
  await expect(cards.nth(1).locator('button[data-do="go"]')).toBeVisible();
  await cards.nth(1).locator('button[data-do="end"]').click();
  await cards.nth(1).locator('button[data-do="end-for-good"]').click();
  await expect(cards.nth(1)).toContainText('No one yet.');
  await expect(cards.nth(0).locator('button[data-do="go"]')).toBeVisible();
});

test('a save that won’t load is kept aside and the player is told, never written over', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#when')).toContainText('June');
  expect(await L<boolean>(page, 'saved')).toBe(true);
  // The save and the one before it both damaged, so there is nothing to go on from.
  await damage(page, 'eb/live-your-life/full/slot/life-1', '{"format":1,"damaged":true}');
  await damage(page, 'eb/live-your-life/full/backup/life-1', 'not a save');
  await page.goto('./?lives');
  await page.locator('#lives li[data-slot="life-1"] button[data-do="go"]').click();
  await expect(page.locator('#lives-notice')).toContainText('couldn’t be loaded');
  await expect(page.locator('#lives-notice')).toContainText('kept aside');
  const aside = await page.evaluate(
    () =>
      new Promise<number>((done) => {
        const open = indexedDB.open('eb', 1);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').getAllKeys();
          req.onsuccess = () => done(req.result.filter((k) => String(k).includes('/quarantine/')).length);
        };
      }),
  );
  expect(aside).toBeGreaterThan(0);
});

test('a damaged last save goes on from the one before it, and says so', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#when')).toContainText('June');
  await page.click('#badge');
  await page.click('button[data-tab="week"]');
  await page.locator('#postings button').first().click();
  await page.click('#panel-close');
  expect(await L<boolean>(page, 'saved')).toBe(true);
  await damage(page, 'eb/live-your-life/full/slot/life-1', 'not a save');
  await page.goto('./?lives');
  await page.locator('#lives li[data-slot="life-1"] button[data-do="go"]').click();
  await expect(page.locator('#when')).toContainText('June');
  await expect(page.locator('.toast')).toContainText('goes on from the one before');
});
