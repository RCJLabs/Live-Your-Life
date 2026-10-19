/**
 * The browser bot's hands (M1.8): it plays the page as a player does, by tapping it, and counts
 * every tap. It reads what a player sees through the page's hooks (the time, the needs, what is
 * offered, where things are), never the sim's state, and it changes nothing except by a tap.
 * Bringing the camera round to a place is a pan, counted apart from taps.
 */
import { expect, type Page } from '@playwright/test';

export interface PlaceInfo {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly building: string;
  readonly serves: readonly string[];
}

export type Offer = Readonly<Record<string, unknown>> & { readonly type: string };

type Hooks = Record<string, (...args: unknown[]) => unknown>;

export class Driver {
  readonly page: Page;
  taps = 0;
  pans = 0;
  places: PlaceInfo[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  hook<T>(fn: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      ([f, a]) => (window as unknown as { __lyl: { life: Hooks } }).__lyl.life[f as string]?.(...(a as unknown[])),
      [fn, args],
    ) as Promise<T>;
  }

  fact<T>(id: string, args?: Record<string, unknown>): Promise<T> {
    return this.hook<T>('fact', id, args);
  }

  async start(): Promise<void> {
    await this.page.waitForFunction(() => 'life' in ((window as { __lyl?: object }).__lyl ?? {}));
    this.places = await this.hook<PlaceInfo[]>('places');
  }

  /** One tap on whatever a selector finds first. */
  async tap(selector: string): Promise<void> {
    await this.page.locator(selector).first().click();
    this.taps++;
  }

  /** A tap on a place in the city, after panning the camera round to it. */
  async tapPlace(id: string): Promise<void> {
    await this.hook('focus', id);
    this.pans++;
    await this.page.waitForTimeout(60);
    const at = await this.hook<{ x: number; y: number }>('screenOf', id);
    await this.page.mouse.click(at.x, at.y);
    this.taps++;
  }

  /** Waits until the page is done on its own: walking, or an activity's time passing on screen. */
  async settle(): Promise<void> {
    await expect.poll(() => this.hook<boolean>('busy'), { timeout: 120_000, intervals: [100] }).toBe(false);
  }

  async open(): Promise<{ panel: boolean; menu: boolean; choice: boolean; map: boolean }> {
    return this.hook('open');
  }

  /** The building of the place you last reached. */
  async building(): Promise<string> {
    const at = await this.hook<string | null>('reached');
    return this.places.find((p) => p.id === at)?.building ?? '';
  }

  /** Goes to a place: by the map to its building's door when it's in another, then a tap on it. */
  async goTo(place: PlaceInfo): Promise<void> {
    if ((await this.building()) !== place.building) {
      const door = this.places.find((p) => p.kind === 'door' && p.building === place.building);
      if (door) {
        await this.tap('#map-button');
        await this.tap(`#map-places button[data-place="${door.id}"]`);
        await this.settle();
      }
    }
    if ((await this.hook<string | null>('reached')) === place.id && (await this.open()).menu) return;
    await this.tapPlace(place.id);
    await this.settle();
  }

  /** Closes whatever is open in the way of the clock: a menu or the panel. */
  async clear(): Promise<void> {
    const open = await this.open();
    if (open.menu) await this.tap('#menu button[data-action="leave"]');
    if (open.panel) await this.tap('#panel-close');
    if (open.map) await this.tap('#map-close');
  }
}
