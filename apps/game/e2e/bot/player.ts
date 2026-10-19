/**
 * The browser bot's mind (M1.8, D55): the steady bot's rules (packages/sim/src/bot.ts), played on
 * the page by taps. It answers what stops the clock, signs up for every shift it can, pays what
 * it owes once a week of meals is kept back, eats, works, sleeps, and sees to its lowest need;
 * otherwise it lets the clock run at speed 2, as a player waiting would. Unlike the headless
 * bot it has to get there: it walks to the diner when a shift is near, since the walk takes
 * time the menu doesn't know about (ROADMAP open question 39). The thief takes once from a shelf
 * on the first day, then lives the same way until the case is over.
 */
import { type Need, REMEDY, RESERVE } from '@lyl/sim';
import type { Driver, Offer, PlaceInfo } from './driver.ts';

export type Profile = 'steady' | 'thief';

/** How long before a shift the bot sets off for the diner: the walk is about 20 game minutes (D49). */
const SET_OFF = 40;

type Intent =
  | { readonly kind: 'choice' }
  | { readonly kind: 'panel'; readonly tab: 'waiting' | 'week'; readonly action: string }
  | { readonly kind: 'do'; readonly activity: string }
  | { readonly kind: 'commute' }
  | { readonly kind: 'take' }
  | { readonly kind: 'wait' };

const has = (offers: readonly Offer[], type: string, activity?: string) =>
  offers.some((a) => a.type === type && (activity === undefined || a.activity === activity));

/** What the bot does next, from what the page shows. */
async function intent(d: Driver, profile: Profile, took: boolean): Promise<Intent> {
  if ((await d.open()).choice) return { kind: 'choice' };
  if ((await d.hook<string>('mode')) !== 'world') return { kind: 'wait' };
  const offers = await d.hook<Offer[]>('options');
  const need = (n: Need) => d.fact<number>('life.need', { need: n });
  const cash = await d.fact<number>('economy.amount', { resource: 'cash' });
  const owed = await d.fact<number>('home.owed');
  if (has(offers, 'ties/answer')) return { kind: 'panel', tab: 'waiting', action: 'ties/answer' };
  if (has(offers, 'job/sign-up')) return { kind: 'panel', tab: 'week', action: 'job/sign-up' };
  if (cash - owed >= RESERVE && has(offers, 'home/pay-owed'))
    return { kind: 'panel', tab: 'waiting', action: 'home/pay-owed' };
  if (cash >= 2 * RESERVE && has(offers, 'law/pay')) return { kind: 'panel', tab: 'waiting', action: 'law/pay' };
  if (profile === 'thief' && !took && (await d.fact<string>('time.phase')) !== 'night') return { kind: 'take' };
  if ((await need('food')) < 15 && has(offers, 'life/do', 'eat')) return { kind: 'do', activity: 'eat' };
  if (has(offers, 'life/do', 'work')) return { kind: 'do', activity: 'work' };
  const next = await d.fact<number | undefined>('job.next-shift-in');
  if (next !== undefined && next <= SET_OFF && (await d.building()) !== 'diner') return { kind: 'commute' };
  const rest = await need('rest');
  if (rest < 10 && has(offers, 'life/do', 'sleep')) return { kind: 'do', activity: 'sleep' };
  const night = (await d.fact<string>('time.phase')) === 'night';
  if (night && rest < 70 && has(offers, 'life/do', 'sleep')) return { kind: 'do', activity: 'sleep' };
  const lowest = await d.fact<Need>('life.lowest');
  if ((await need(lowest)) < 40 && has(offers, 'life/do', REMEDY[lowest]))
    return { kind: 'do', activity: REMEDY[lowest] };
  return { kind: 'wait' };
}

/** Where to do an activity: the first of the buildings preferred that has a fixture for it, else anywhere. */
function placeFor(d: Driver, activity: string, prefer: readonly string[]): PlaceInfo | undefined {
  const serving = d.places.filter((p) => p.kind === 'fixture' && p.serves.includes(activity));
  for (const b of prefer) {
    const p = serving.find((x) => x.building === b);
    if (p) return p;
  }
  return serving[0];
}

async function inPanel(d: Driver, tab: 'waiting' | 'week', action: string): Promise<void> {
  await d.tap('#badge');
  const pressed = await d.page.locator(`button[data-tab="${tab}"]`).getAttribute('aria-pressed');
  if (pressed !== 'true') await d.tap(`button[data-tab="${tab}"]`);
  const sel = tab === 'week' ? '#postings button' : `#panel button[data-action="${action}"]`;
  if ((await d.page.locator(sel).count()) > 0) await d.tap(sel);
  await d.tap('#panel-close');
}

async function doAt(d: Driver, activity: string): Promise<void> {
  // Your flat's fixtures are the only beds on the page (places.ts), so a bed's building is home.
  const home = d.places.find((p) => p.serves.includes('sleep'))?.building ?? '';
  const place = placeFor(d, activity, activity === 'work' ? ['diner'] : [await d.building(), home]);
  if (!place) return;
  await d.goTo(place);
  const item = d.page.locator(`#menu button[data-activity="${activity}"]`);
  if ((await d.open()).menu && (await item.count()) > 0) {
    await d.tap(`#menu button[data-activity="${activity}"]`);
    await d.settle();
  } else await d.clear();
}

/** Tries the shop's shelves until one offers a take, and takes. True if something was taken. */
async function take(d: Driver): Promise<boolean> {
  for (const shelf of d.places.filter((p) => p.kind === 'shelf')) {
    await d.goTo(shelf);
    if ((await d.page.locator('#menu button[data-action="law/take"]').count()) > 0) {
      await d.tap('#menu button[data-action="law/take"]');
      return true;
    }
    await d.clear();
  }
  return false;
}

/** One step of play. Returns whether the thief has made its one try. */
export async function step(d: Driver, profile: Profile, took: boolean): Promise<boolean> {
  const next = await intent(d, profile, took);
  switch (next.kind) {
    case 'choice':
      await d.tap('#choice button');
      await d.settle();
      return took;
    case 'panel':
      await inPanel(d, next.tab, next.action);
      return took;
    case 'do':
      await doAt(d, next.activity);
      return took;
    case 'commute': {
      const door = d.places.find((p) => p.kind === 'door' && p.building === 'diner');
      if (door) await d.goTo(door);
      await d.clear();
      return took;
    }
    case 'take':
      // One try: if no shelf offers a take, the thief lives as the steady bot does.
      await take(d);
      return true;
    case 'wait':
      await d.clear();
      await d.page.waitForTimeout(500);
      return took;
  }
}
