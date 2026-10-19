/**
 * The art spike (M0.3, D29): one city block, drawn in code, with six people, day and night.
 * The sim keeps the clock; the stage draws the block; the people are scripted for the spike.
 * What it is for: a stranger, from a 390 px screenshot, can tell who is working, sleeping or
 * arguing, and which building is the restaurant (risk 1, docs/BRAINSTORM.md).
 */
import { type Camera, clampCamera, daylight, panBy, Stage, viewOf, zoomAt } from '@lyl/stage';
import { startPwa } from './pwa.ts';
import { actorsAt, castLooks } from './spike/actors.ts';
import { makeBlock } from './spike/block.ts';
import { Clock, type Speed } from './spike/clock.ts';
import { frame, limitsFor } from './spike/framing.ts';
import { bindHud, setText, showHud, showMeasured } from './spike/hud.ts';
import { listen } from './spike/input.ts';
import { describe, Measure } from './spike/measure.ts';
import { readParams } from './spike/params.ts';
import './style.css';

/** Devices draw at most 2× (2060TD's cap): a 3× screen's extra pixels cost more than they show. */
const MAX_DPR = 2;
const INTERIORS = new Set(['diner', 'apartment']);
const NONE = new Set<string>();

const params = readParams(location.search);
const block = makeBlock(params.seed);
const looks = castLooks(params.seed);
const clock = new Clock(params.seed);
if (params.at) clock.jump(params.at.hour, params.at.minute);

const main = document.querySelector('main') as HTMLElement;
const canvas = document.getElementById('city') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const night = document.createElement('canvas');
const stage = new Stage(block.scene, { canvas: night, ctx: night.getContext('2d') as CanvasRenderingContext2D });
const limits = limitsFor(block);

const state = {
  playing: params.freeze === null,
  speed: 1 as Speed,
  cut: params.cut,
  bubbles: params.bubbles,
  time: params.freeze ?? 0,
  /** Until the player moves the camera, a resize re-frames the block. */
  framed: true,
};
if (!params.hud) main.classList.add('hidden-ui');

function sizeNow() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  return { width, height, dpr: Math.min(MAX_DPR, window.devicePixelRatio || 1) };
}
let size = sizeNow();
/** The screen the controls cover, top and bottom; a hidden HUD covers none. */
function insets() {
  if (main.classList.contains('hidden-ui')) return { top: 0, bottom: 0 };
  const top = document.getElementById('top')?.getBoundingClientRect().bottom ?? 0;
  const controls = document.getElementById('controls')?.getBoundingClientRect().height ?? 0;
  return { top, bottom: controls };
}
let camera: Camera = frame(block, params.framing, params.focus, state.cut, size, insets());

function resize(): void {
  size = sizeNow();
  canvas.width = Math.round(size.width * size.dpr);
  canvas.height = Math.round(size.height * size.dpr);
  camera = state.framed
    ? frame(block, params.framing, params.focus, state.cut, size, insets())
    : clampCamera(camera, limits);
}
resize();
window.addEventListener('resize', resize);

let heights: ReadonlyMap<string, number> = new Map();
function render(): void {
  const light = daylight(clock.minuteOfDay);
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  const drawn = stage.render(
    ctx,
    viewOf(camera, size),
    size,
    { cut: state.cut ? INTERIORS : NONE, bubbles: state.bubbles, dark: light.dark, warm: light.warm, time: state.time },
    actorsAt(block, looks, state.time),
  );
  heights = drawn.heights;
}

const measure = new Measure();
let last: number | null = null;
let fpsWindow: number[] = [];
function loop(now: number): void {
  const dt = last === null ? 0 : Math.min(100, now - last);
  last = now;
  if (state.playing) {
    clock.elapse(dt, state.speed);
    state.time += (dt / 1000) * state.speed;
  }
  render();
  setText('when', clock.text);
  fpsWindow.push(now);
  fpsWindow = fpsWindow.filter((t) => now - t < 2000);
  if (!measure.running)
    setText(
      'fps',
      fpsWindow.length > 10 ? `${Math.round((fpsWindow.length - 1) / ((now - (fpsWindow[0] ?? now)) / 1000))} fps` : '',
    );
  const result = measure.frame(now);
  if (result)
    showMeasured(
      describe(result, {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        drawn: size.dpr,
      }),
    );
  else if (measure.running) setText('fps', 'Measuring…');
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  // Hidden time is not play time (D3): count again from the next frame.
  last = null;
});

const middle = () => ({ x: size.width / 2, y: size.height / 2 });
bindHud({
  togglePlay: () => {
    state.playing = !state.playing;
    showHud(state);
  },
  toggleSpeed: () => {
    state.speed = state.speed === 1 ? 2 : 1;
    showHud(state);
  },
  toggleWalls: () => {
    state.cut = !state.cut;
    showHud(state);
  },
  toggleBubbles: () => {
    state.bubbles = !state.bubbles;
    showHud(state);
  },
  day: () => clock.jump(13, 0),
  night: () => clock.jump(22, 30),
  zoom: (factor) => {
    state.framed = false;
    camera = zoomAt(camera, middle(), factor, size, limits);
  },
  measure: () => {
    state.playing = true;
    state.speed = 1;
    showHud(state);
    measure.start(performance.now());
  },
  hide: () => main.classList.add('hidden-ui'),
});
showHud(state);

listen(canvas, {
  pan: (dx, dy) => {
    state.framed = false;
    camera = panBy(camera, dx, dy, size, limits);
  },
  zoom: (at, factor) => {
    state.framed = false;
    camera = zoomAt(camera, at, factor, size, limits);
  },
  tap: () => main.classList.remove('hidden-ui'),
});

const { version, sha } = __LYL_BUILD__;
setText('build', `Art test · version ${version}, build ${sha.slice(0, 7)}`);

startPwa((update) => {
  const banner = document.getElementById('update') as HTMLElement;
  banner.hidden = false;
  document.getElementById('update-now')?.addEventListener('click', update, { once: true });
});

/** For the screenshot and readings scripts: what was drawn, and the measure. Nothing leaves the page. */
Object.assign(window, {
  __lyl: {
    heights: () => Object.fromEntries(heights),
    camera: () => ({ ...camera }),
    size: () => ({ ...size }),
    measure: () => measure.start(performance.now()),
  },
});

render();
requestAnimationFrame(loop);
