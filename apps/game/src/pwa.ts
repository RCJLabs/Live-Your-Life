/**
 * The service worker: the game opens offline once it has loaded once. A new version is offered,
 * never forced: `offer` shows the prompt and is given the function that reloads into it.
 */
import { registerSW } from 'virtual:pwa-register';

/**
 * How often to ask for a new version while the game is visible. An installed app is resumed
 * from the task switcher rather than navigated, so the browser's own check rarely runs; six
 * hours keeps it to one small request (Engine-Builder's update gate, from project-ascent).
 */
const CHECK_MS = 6 * 60 * 60 * 1000;

export function startPwa(offer: (update: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => offer(() => void updateSW(true)),
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration);
    },
  });
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  let checkedAt = Date.now(); // registering just checked
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - checkedAt < CHECK_MS) return;
    checkedAt = Date.now();
    // Offline or a server blip: nothing to report, the next check asks again.
    registration.update().catch(() => {});
  });
}
