/**
 * The life (M1.6, D49–D52): the line cook's life on the generated block, played by taps. You tap a
 * place and walk there with the clock running; a place's menu offers what the game offers there;
 * an activity's time passes as a fast-forward with you in its pose; the sim's choices stop the
 * clock; the bar shows the time, the cash and your two lowest needs; the panel what waits on you;
 * the toasts and the journal what happened. The sim decides everything; this only shows it and
 * sends what you choose.
 */
import type { Action } from '@eb/core';
import type { LawState } from '@lyl/sim';
import { type Camera, clampCamera, daylight, panBy, project, Stage, unproject, viewOf, zoomAt } from '@lyl/stage';
import { blockScene } from '../city/scene.ts';
import { cutFor } from '../city/walker.ts';
import { startPwa } from '../pwa.ts';
import { castLooks } from '../spike/actors.ts';
import { frame, limitsFor } from '../spike/framing.ts';
import { listen } from '../spike/input.ts';
import { describe, Measure } from '../spike/measure.ts';
import { makeBar, makeToast } from './dom.ts';
import { makeMap } from './map.ts';
import { itemsAt, makeSheet, modeSheet } from './menus.ts';
import { makePanel } from './panel.ts';
import { waiting } from './pending.ts';
import { type Place, placeAt, placesOf } from './places.ts';
import { Player } from './player.ts';
import { Life } from './session.ts';

const MAX_DPR = 2;
/** Speed 2 runs four times as fast as speed 1 (DESIGN.md, Time). */
const FACTOR = { 1: 1, 2: 4 } as const;
/** Real milliseconds a game minute takes to show in a fast-forward, within these bounds. */
const FF = { perMinute: 6, min: 700, max: 3000 } as const;

const q = new URLSearchParams(location.search);
const seed = q.get('seed') || 'life-1';
const life = new Life(seed);
const law = life.state.law as LawState;
const block = blockScene(law.block);
const places = placesOf(life.sim.content, block.plan, block.grid, law.block);
const look = castLooks(seed).cook;
const player = new Player(places.bed);

const main = document.querySelector('main') as HTMLElement;
for (const id of ['top', 'controls', 'measured']) document.getElementById(id)?.remove();
const canvas = document.getElementById('city') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const layer = () => {
  const c = document.createElement('canvas');
  return { canvas: c, ctx: c.getContext('2d') as CanvasRenderingContext2D };
};
const stage = new Stage(block.scene, layer, { cache: true });
const limits = limitsFor(block);

const s = {
  paused: false,
  speed: 1 as 1 | 2,
  /** Stage seconds, for poses. */
  t: 0,
  /** A fast-forward's ticks and real span, while an activity's time is shown passing. */
  ff: null as { from: number; to: number; start: number; ms: number } | null,
  /** When the player last moved the camera: it follows you again after a while. */
  moved: Number.NEGATIVE_INFINITY,
  waiting: 0,
  waitingAt: 0,
};

const blocked = () => panel.open || sheet.open || choice.open || map.open || s.ff !== null;

function act(a: Action, at: Place | null = null): void {
  const before = life.fact('time.tick') as number;
  const ok = life.act(a);
  s.waitingAt = 0;
  if (!ok || a.type !== 'life/do') return;
  const after = life.fact('time.tick') as number;
  const f = at?.fixture?.use;
  if (at && f) player.use(at, f.pose === 'lie' ? 'lie' : f.pose, a.activity === 'sleep' ? 'sleep' : null);
  const ms = Math.min(FF.max, Math.max(FF.min, (after - before) * FF.perMinute));
  s.ff = { from: before, to: after, start: performance.now(), ms };
}

let here: Place | null = null;
const sheet = makeSheet(
  'menu',
  (a) => act(a, here),
  () => undefined,
);
const choice = makeSheet(
  'choice',
  (a) => act(a),
  () => undefined,
);
const panel = makePanel(
  life,
  (a) => act(a),
  () => undefined,
);
const map = makeMap(
  block.plan,
  places,
  (p) => player.goTo(block.plan, block.grid, p),
  () => undefined,
);
const toast = makeToast();
const bar = makeBar({
  pause: () => {
    s.paused = !s.paused;
    s.waitingAt = 0;
  },
  speed: () => {
    s.speed = s.speed === 1 ? 2 : 1;
    s.waitingAt = 0;
  },
  panel: () => (panel.open ? panel.hide() : panel.show()),
  map: () => map.show(player),
});
main.append(bar.root, toast.root, sheet.root, choice.root, panel.root, map.root);

function arrive(place: Place): void {
  here = place;
  if (place.kind === 'door') return;
  sheet.show(place.label, null, itemsAt(life, place), 'Leave');
}

let size = { width: 1, height: 1, dpr: 1 };
let camera: Camera = { cx: 0, cy: 0, u: 20 };
function resize(): void {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  size = { width, height, dpr: Math.min(MAX_DPR, window.devicePixelRatio || 1) };
  canvas.width = Math.round(width * size.dpr);
  canvas.height = Math.round(height * size.dpr);
  const top = bar.root.getBoundingClientRect().bottom;
  camera = frame(block, 'close', 'apartment', false, size, { top, bottom: 0 });
}
resize();
window.addEventListener('resize', resize);

/** Keeps you on screen: the camera eases toward you once you near an edge, unless the player just moved it. */
function follow(now: number): void {
  if (now - s.moved < 3000) return;
  const p = project(viewOf(camera, size), { x: player.x, y: player.y, z: 0.9 });
  const mx = size.width * 0.3;
  const my = size.height * 0.3;
  if (p.x > mx && p.x < size.width - mx && p.y > my && p.y < size.height - my) return;
  camera = clampCamera(
    { ...camera, cx: camera.cx + (player.x - camera.cx) * 0.05, cy: camera.cy + (player.y - camera.cy) * 0.05 },
    limits,
  );
}

function shownMinute(now: number): number {
  const ofDay = life.fact('time.of-day') as number;
  const ff = s.ff;
  if (!ff) return ofDay;
  const k = Math.min(1, (now - ff.start) / ff.ms);
  const behind = Math.round((ff.to - ff.from) * (1 - k));
  return (((ofDay - behind) % 1440) + 1440) % 1440;
}

const measure = new Measure();
let measured: string | null = null;

let last: number | null = null;
function loop(now: number): void {
  const dt = last === null ? 0 : Math.min(100, now - last);
  last = now;
  if (s.ff && now - s.ff.start >= s.ff.ms) {
    s.ff = null;
    if (life.mode.id === 'world') player.getUp();
  }
  if (!blocked() && !s.paused) {
    const factor = FACTOR[s.speed];
    life.elapse(dt, factor);
    s.t += (dt / 1000) * factor;
    const reached = player.step(dt / 1000, factor);
    if (reached) arrive(reached);
  }
  const m = modeSheet(life);
  if (m && !choice.open && !s.ff) {
    player.stop();
    choice.show(m.title, m.lead, m.items, null);
  }
  if (!toast.busy && life.fresh.length > 0) toast.show(life.fresh.shift() as string);
  const minute = shownMinute(now);
  // The bar and the badge are read a few times a second: their facts don't change faster than a game minute.
  if (now - s.waitingAt > 250) {
    s.waiting = waiting(life).length;
    s.waitingAt = now;
    bar.update(life, { minute, paused: s.paused, speed: s.speed, waiting: s.waiting });
  }
  follow(now);
  const light = daylight(minute);
  const actor = player.actor(look, s.t);
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  stage.render(
    ctx,
    viewOf(camera, size),
    size,
    {
      cut: cutFor(block.plan, block.fronts, actor, false),
      bubbles: true,
      dark: light.dark,
      warm: light.warm,
      time: s.t,
    },
    [actor],
  );
  const result = measure.frame(now);
  if (result) {
    const screen = { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 };
    measured = describe(result, { ...screen, drawn: size.dpr });
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
  // Hidden time is not play time (D3): count again from the next frame.
  last = null;
});

listen(canvas, {
  pan: (dx, dy) => {
    s.moved = performance.now();
    camera = panBy(camera, dx, dy, size, limits);
  },
  zoom: (at, factor) => {
    s.moved = performance.now();
    camera = zoomAt(camera, at, factor, size, limits);
  },
  tap: (at) => {
    if (blocked() || life.mode.id !== 'world') return;
    const ground = unproject(viewOf(camera, size), at);
    const place = placeAt(places, ground.x, ground.y);
    player.goTo(block.plan, block.grid, place ?? { x: ground.x, y: ground.y });
  },
});

startPwa((update) => {
  const banner = document.getElementById('update') as HTMLElement;
  banner.hidden = false;
  document.getElementById('update-now')?.addEventListener('click', update, { once: true });
});

/** For the tests and readings scripts: where things are, what the sim says, nothing that changes it. */
Object.assign(window, {
  __lyl: {
    life: {
      places: () => places.all.map((p) => ({ id: p.id, kind: p.kind, label: p.label, building: p.building })),
      screenOf: (id: string) => {
        const p = places.all.find((x) => x.id === id);
        return p ? project(viewOf(camera, size), { x: p.stand.x, y: p.stand.y, z: 0 }) : null;
      },
      focus: (id: string) => {
        const p = places.all.find((x) => x.id === id);
        if (p) camera = clampCamera({ ...camera, cx: p.stand.x, cy: p.stand.y }, limits);
        s.moved = performance.now();
      },
      standOf: (id: string) => places.all.find((x) => x.id === id)?.stand ?? null,
      fact: (id: string, args?: Record<string, unknown>) => life.fact(id, args),
      mode: () => life.mode.id,
      tick: () => life.fact('time.tick'),
      where: () => ({ x: player.x, y: player.y, walking: player.walking }),
      refused: () => life.refused.map((r) => ({ type: r.action.type, reason: r.reason })),
      log: () => life.session.log.map((a) => a.type),
      journal: () => life.journal.map((e) => e.text),
      waiting: () => waiting(life).map((w) => ({ kind: w.kind, day: w.day, text: w.text })),
      home: places.home,
      /** Walks you to a place, as a tap there would. */
      goTo: (id: string) => {
        const p = places.all.find((x) => x.id === id);
        return p ? player.goTo(block.plan, block.grid, p) : false;
      },
      /** The frame rate over the spike's measure (spike/measure.ts), with the clock at speed 1. */
      measure: () => {
        measured = null;
        s.paused = false;
        s.speed = 1;
        measure.start(performance.now());
        return new Promise<string>((done) => {
          const wait = () => (measured ? done(measured) : setTimeout(wait, 200));
          wait();
        });
      },
    },
  },
});
