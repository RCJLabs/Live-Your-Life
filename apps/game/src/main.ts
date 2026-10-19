/**
 * The placeholder page (ROADMAP.md, M0.1). It runs the game's clock: the sim decides the time,
 * and this page, the stage, passes it the milliseconds of each frame and shows what the sim's
 * facts say. So the sim, the engine's kernel and the service worker are proven together before
 * any game exists. Nothing is saved.
 */
import { createRecordStore, createSession } from '@eb/core';
import { createLifeGame } from '@lyl/sim';
import { startPwa } from './pwa.ts';
import './style.css';

const sim = { content: createRecordStore({}) };
const game = createLifeGame();
const session = createSession(game, sim, game.init('placeholder', sim));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const when = byId('when');
const part = byId('part');
const pause = byId('pause') as HTMLButtonElement;

const fact = (id: string) => game.fact(session.state, id, undefined, sim);
const word = (id: string) => {
  const text = String(fact(id));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const twoDigits = (id: string) => String(fact(id)).padStart(2, '0');

let shownTick = -1;
function render(): void {
  const tick = fact('time.tick') as number;
  if (tick === shownTick) return;
  shownTick = tick;
  when.textContent = `${word('time.weekday')} ${fact('time.day-of-month')} ${word('time.month')} ${fact('time.year')}, ${twoDigits('clock.hour')}:${twoDigits('clock.minute')}`;
  part.textContent = `${word('time.phase')}, ${fact('time.season')}`;
}

// The stage's frame loop. Time passes only while the page is visible and not paused (D3);
// whole milliseconds go to the sim and the fraction waits for the next frame, so the clock
// neither runs fast nor slow over a long session.
let running = true;
let last: number | null = null;
let fraction = 0;
function frame(now: number): void {
  if (running && last !== null) {
    fraction += now - last;
    const ms = Math.floor(fraction);
    fraction -= ms;
    if (ms > 0) session.dispatch({ type: 'time/elapse', ms });
    session.drain();
    // A frame is an action, so the log grows at the frame rate; nothing is saved here, so it is cut short.
    if (session.log.length > 600) session.compact();
    render();
  }
  last = now;
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  // Hidden time is not play time: start counting again from the next frame.
  last = null;
  fraction = 0;
});

pause.addEventListener('click', () => {
  running = !running;
  last = null;
  pause.textContent = running ? 'Pause' : 'Resume';
});

const { version, sha } = __LYL_BUILD__;
byId('build').textContent = `Version ${version}, build ${sha.slice(0, 7)}`;

startPwa((update) => {
  const banner = byId('update');
  banner.hidden = false;
  byId('update-now').addEventListener('click', update, { once: true });
});

render();
requestAnimationFrame(frame);
