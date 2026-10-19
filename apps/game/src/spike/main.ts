/**
 * The art spike (M0.3, D29): one city block, drawn in code, with six people, day and night.
 * The sim keeps the clock; the stage draws the block; the people are scripted for the spike.
 * What it is for: a stranger, from a 390 px screenshot, can tell who is working, sleeping or
 * arguing, and which building is the restaurant (risk 1, docs/BRAINSTORM.md).
 */
import { type Camera, clampCamera, daylight, panBy, Stage, viewOf, zoomAt } from '@lyl/stage';
import { startPwa } from '../pwa.ts';
import { actorsAt, castLooks } from './actors.ts';
import { makeBlock } from './block.ts';
import { Clock, type Speed } from './clock.ts';
import { frame, limitsFor } from './framing.ts';
import { bindHud, setText, showHud, showMeasured } from './hud.ts';
import { listen } from './input.ts';
import { describe, Measure } from './measure.ts';
import { readParams } from './params.ts';

/** Devices draw at most 2× (2060TD's cap): a 3× screen's extra pixels cost more than they show. */
const MAX_DPR = 2;
const INTERIORS = new Set(['diner', 'apartment']);
const NONE = new Set<string>();

const params = readParams(location.search);
// M1.1's generated block loads only when asked for, so the spike's page stays as it was (D33).
const generated = params.block === 'generated' ? (await import('../city/scene.ts')).generatedBlock(params.seed) : null;
const overlay = generated && params.grid ? (await import('../city/overlay.ts')).drawWalkGrid : null;
const block = generated ?? makeBlock(params.seed);
const looks = castLooks(params.seed);
const clock = new Clock(params.seed);
if (params.at) clock.jump(params.at.hour, params.at.minute);

const main = document.querySelector('main') as HTMLElement;
const canvas = document.getElementById('city') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
/** An offscreen canvas for the stage's kept layers: the still picture, the night, its glows. */
const layer = () => {
  const c = document.createElement('canvas');
  return { canvas: c, ctx: c.getContext('2d') as CanvasRenderingContext2D };
};
const stage = new Stage(block.scene, layer, { cache: params.cache });
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

/** The spike cuts both interiors or neither; the generated block also cuts where its walker is (D36). */
const cutNow = (t: number): ReadonlySet<string> =>
  generated ? generated.cutAt(looks.cook, t, state.cut) : state.cut ? INTERIORS : NONE;

let heights: ReadonlyMap<string, number> = new Map();
function render(): void {
  const light = daylight(clock.minuteOfDay);
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  const drawn = stage.render(
    ctx,
    viewOf(camera, size),
    size,
    { cut: cutNow(state.time), bubbles: state.bubbles, dark: light.dark, warm: light.warm, time: state.time },
    generated ? generated.actorsAt(looks.cook, state.time) : actorsAt(block, looks, state.time),
  );
  heights = drawn.heights;
  if (overlay && generated) overlay(ctx, viewOf(camera, size), generated.grid);
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
setText('build', `${generated ? 'Block test' : 'Art test'} · version ${version}, build ${sha.slice(0, 7)}`);

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
    block: () =>
      generated && {
        lots: generated.plan.lots.length,
        buildings: generated.plan.buildings.map((b) => b.template),
        open: generated.plan.street.open,
      },
    walker: () => {
      const c = generated?.commute;
      if (!generated || !c) return null;
      const [now] = generated.actorsAt(looks.cook, state.time);
      return {
        unit: c.unit,
        metres: c.metres,
        round: c.round,
        legs: c.legs.map((l) => ({ doing: l.doing, from: l.from, to: l.to })),
        at: now && { x: now.x, y: now.y, pose: now.pose.kind },
        cut: [...cutNow(state.time)].sort(),
      };
    },
  },
});

render();
requestAnimationFrame(loop);
