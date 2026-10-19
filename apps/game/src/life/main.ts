/**
 * The page's start (M1.7): open the lives kept on this device, then play one. The first visit, with
 * nothing kept, starts a life at once; after that the page opens on your lives. `?seed=` plays a
 * life from that seed without keeping it, for the tests and readings scripts; `?lives` opens the
 * list.
 */
import { startPwa } from '../pwa.ts';
import { Keeper, type Listed, type Loaded, type Slot } from './keeper.ts';
import { makeLives } from './lives.ts';
import { play } from './play.ts';
import { Life } from './session.ts';

const q = new URLSearchParams(location.search);
const main = document.querySelector('main') as HTMLElement;

startPwa((update) => {
  const banner = document.getElementById('update') as HTMLElement;
  banner.hidden = false;
  document.getElementById('update-now')?.addEventListener('click', update, { once: true });
});

/** A new life's seed: the page's to draw, as the sim takes no randomness of its own. */
function freshSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const failed = (message: string) =>
  window.dispatchEvent(new CustomEvent('lyl-save-failed', { detail: `The game couldn’t save: ${message}` }));

/** Why a life didn't load, in the interface's words. */
function why(slot: Slot, result: Extract<Loaded, { ok: false }>): string {
  const n = slot.slice(-1);
  if (result.problem === 'newer') return `Life ${n} was saved by a newer version of the game. Update to go on with it.`;
  const kept = result.quarantined ? ' A copy of it was kept aside, untouched.' : '';
  return `Life ${n} couldn’t be loaded.${kept} You can end it to free its place.`;
}

async function boot(): Promise<void> {
  const seed = q.get('seed');
  if (seed) {
    play(new Life(seed), null, null, () => undefined);
    return;
  }
  const keeper = await Keeper.open(__LYL_BUILD__.sha, failed);
  const goTo = () => {
    location.search = '?lives';
  };
  const start = (slot: Slot) => {
    lives.root.remove();
    const life = new Life(freshSeed());
    play(life, { keeper, slot }, null, goTo);
    void keeper.save(slot, life, null);
  };
  const lives = makeLives({
    start,
    async go(slot) {
      const result = await keeper.load(slot, new Life('loading'));
      if (!result.ok) {
        lives.show(await keeper.list(), why(slot, result));
        return;
      }
      lives.root.remove();
      const notice = result.fromBackup
        ? 'The last save of this life couldn’t be loaded, so it goes on from the one before. A copy was kept aside.'
        : null;
      play(new Life(result), { keeper, slot }, result.at, goTo, notice);
    },
    async end(slot) {
      await keeper.end(slot);
      lives.show(await keeper.list());
    },
  });
  const list: Listed[] = await keeper.list();
  if (!q.has('lives') && list.every((l) => l.kind === 'empty')) {
    start('life-1');
    return;
  }
  for (const id of ['top', 'controls', 'measured']) document.getElementById(id)?.remove();
  main.append(lives.root);
  lives.show(list);
}

await boot();
