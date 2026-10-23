/**
 * The life (M1.6, D49–D52): the line cook's life on the generated block, played by taps. You tap a
 * place and walk there with the clock running; a place's menu offers what the game offers there;
 * an activity's time passes as a fast-forward with you in its pose; the sim's choices stop the
 * clock; the bar shows the time, the cash and your two lowest needs; the panel what waits on you;
 * the toasts and the journal what happened. The sim decides everything; this only shows it and
 * sends what you choose. Since M1.7 the life is saved after everything you do, every game hour,
 * on arrival and when the page is hidden (D54); a life played from `?seed=` is not kept.
 */
import type { Action } from '@eb/core';
import { cellAt, type LawState, LINKED, LONGEST_WALK, type MarketSlice, WEEKDAYS } from '@lyl/sim';
import {
  type Camera,
  clampCamera,
  daylight,
  type Look,
  panBy,
  project,
  Stage,
  unproject,
  viewOf,
  zoomAt,
} from '@lyl/stage';
import { makeCrowd } from '../city/crowd.ts';
import { passersAt } from '../city/passers.ts';
import { townScene } from '../city/town.ts';
import { cutFor } from '../city/walker.ts';
import { workOf } from '../city/workplace.ts';
import { castLooks } from '../spike/actors.ts';
import { frame, limitsFor } from '../spike/framing.ts';
import { listen } from '../spike/input.ts';
import { describe, Measure } from '../spike/measure.ts';
import { type Rung, ring } from './alarm.ts';
import { makeBar, makeToast } from './dom.ts';
import type { Keeper, Slot } from './keeper.ts';
import { makeMap } from './map.ts';
import { itemsAt, makeSheet, modeSheet } from './menus.ts';
import { makePanel } from './panel.ts';
import { type Waiting, waiting } from './pending.ts';
import { type Place, placeAt, placesOf } from './places.ts';
import { Player, walkMinutes } from './player.ts';
import type { Life } from './session.ts';
import { canGo, GO_TO_WORK, startTrip, type Trip, tripAction } from './trip.ts';

const MAX_DPR = 2;
/** Speed 2 runs four times as fast as speed 1 (DESIGN.md, Time). */
const FACTOR = { 1: 1, 2: 4 } as const;
/** Real milliseconds a game minute takes to show in a fast-forward, within these bounds. */
const FF = { perMinute: 6, min: 700, max: 3000 } as const;

/** Where a life is kept, if it is: none for a life from `?seed=`. */
export interface Kept {
  readonly keeper: Keeper;
  readonly slot: Slot;
}

export function play(
  life: Life,
  kept: Kept | null,
  at: string | null,
  lives: () => void,
  notice: string | null = null,
): void {
  const law = life.state.law as LawState;
  const block = townScene(law.block);
  // The tier-1 people out on the town's streets (M2.2, D69), their hours the sim's.
  const peopleSeed = life.fact('people.seed') as number;
  const crowd = makeCrowd(block, peopleSeed, life.fact('people.count') as number);
  // Where the city's employers stand, and the walk to each (M2.3, D73).
  const work = workOf(block, peopleSeed, life.fact('people.count') as number);
  const passerLooks = new Map<number, Look>();
  const onFoot = (x: number, y: number) => {
    const cell = cellAt(block.grid, x, y);
    return cell >= 0 && (block.grid.cost[cell] as number) < Infinity;
  };
  /** Whether the coworker or the fence is at their post in an hour of a day (D70), as their modules say. */
  const atPost = (i: number, day: number, hour: number): boolean => {
    if (i === LINKED.coworker) {
      const start = life.fact('ties.their-start', { day }) as number;
      const length = life.fact('ties.their-minutes', { day }) as number;
      return start >= 0 && hour * 60 >= start && hour * 60 < start + length;
    }
    const from = life.fact('law.fence-from') as number;
    return from >= 0 && hour >= from && hour < (life.fact('law.fence-to') as number);
  };
  /**
   * Who is out at a minute of the life as the page shows it, with its fraction: people are placed
   * every frame from the clock, not stepped once a game minute when the sim's clock moves.
   */
  const crowdNow = (t: number, minute: number) => {
    const day = life.fact('time.day') as number;
    const weekday = WEEKDAYS.indexOf(life.fact('time.weekday') as (typeof WEEKDAYS)[number]);
    const people = crowd.actorsAt(minute, (((weekday - day) % 7) + 7) % 7, t, atPost);
    // And passers-by (D72), the city's statistics on its sidewalks.
    return [...people, ...passersAt(block.walkways, peopleSeed, minute, t, passerLooks, onFoot)];
  };
  const places = placesOf(life.sim.content, block.plan, block.grid, law.block);
  const look = castLooks(life.seed).cook;
  const start = places.all.find((p) => p.id === at) ?? places.bed;
  let player = new Player(start);
  // D61: the stage measures your walk to work and tells the sim, and again when your job moves
  // (M2.3): to the griddle on your block, or across the city to a job elsewhere. The alarm sets it aside.
  const griddle = places.all.find((p) => p.serves?.includes('work'));
  const dinerWalk = griddle ? walkMinutes(block.plan, block.grid, places.bed, griddle) : null;
  function measureCommute(): void {
    const employer = (life.state.market as MarketSlice).employer;
    const away = employer === null || life.fact('market.at-diner') === true ? null : work.walkTo(employer);
    const walk = away ? away.minutes : dinerWalk;
    if (walk !== null && (life.state.you as { commute: number | null }).commute !== Math.min(walk, LONGEST_WALK))
      life.act({ type: 'you/commute', minutes: Math.min(walk, LONGEST_WALK) });
  }
  measureCommute();
  /** The place you last reached, kept with the save. */
  let reachedAt: string | null = start.id;

  const main = document.querySelector('main') as HTMLElement;
  for (const id of ['top', 'controls', 'measured']) document.getElementById(id)?.remove();
  const canvas = document.getElementById('city') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const layer = () => {
    const c = document.createElement('canvas');
    return { canvas: c, ctx: c.getContext('2d') as CanvasRenderingContext2D };
  };
  const stage = new Stage(block.scene, layer, { cache: true, cull: true });
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

  /** The game hour last saved, so the clock running saves once an hour. */
  let savedHour = Math.floor((life.fact('time.tick') as number) / 60);
  function save(): void {
    savedHour = Math.floor((life.fact('time.tick') as number) / 60);
    if (kept) void kept.keeper.save(kept.slot, life, reachedAt);
  }

  /** D60, D62: the alarms drop the clock to 1×, each once, and say why. */
  let rung: Rung = { shift: -1, court: -1 };
  function alarms(list: readonly Waiting[]): void {
    const now = ring(life, list, rung);
    rung = now.rung;
    if (now.slow) s.speed = 1;
    life.fresh.push(...now.lines);
  }

  /** Off to a job away from your block (M2.3): you're not on the town's streets until it's over. */
  let trip: Trip | null = null;
  const blocked = () => panel.open || sheet.open || choice.open || map.open || s.ff !== null;

  function act(a: Action, at: Place | null = null): void {
    if (a.type === GO_TO_WORK) {
      const walk = (life.state.you as { commute: number | null }).commute;
      if (trip === null && canGo(life, walk)) {
        trip = startTrip(walk as number);
        player.stop();
        panel.hide();
      }
      return;
    }
    const before = life.fact('time.tick') as number;
    const ok = life.act(a);
    s.waitingAt = 0;
    // Saved at once, so what a choice brought can't be undone by reloading (D54).
    if (ok) save();
    // A walk across the city passes as a fast-forward too, with you off the screen.
    if (!ok || (a.type !== 'life/do' && !(trip && a.type === 'time/advance'))) return;
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
    work,
    (a) => act(a),
    () => undefined,
    kept
      ? () => {
          save();
          lives();
        }
      : null,
  );
  const map = makeMap(
    block.plan,
    places,
    (p) => player.goTo(block.plan, block.grid, p),
    () => undefined,
    block,
  );
  const toast = makeToast();
  if (notice) life.fresh.unshift(notice);
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
    reachedAt = place.id;
    save();
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

  /** The minute of the life the page shows, from the start day's midnight, with its fraction. */
  function shownTime(now: number): number {
    const at = (life.fact('time.day') as number) * 1440 + (life.fact('time.of-day') as number);
    const ff = s.ff;
    if (!ff) return at + life.partial;
    // A fast-forward shown passing: the people go by at its pace, the clock catching up.
    return at - (ff.to - ff.from) * (1 - Math.min(1, (now - ff.start) / ff.ms));
  }

  const measure = new Measure();
  let measured: string | null = null;

  let last: number | null = null;
  /** What the last frame cut away (D64). */
  let cut: ReadonlySet<string> = new Set();
  function loop(now: number): void {
    const dt = last === null ? 0 : Math.min(100, now - last);
    last = now;
    if (s.ff && now - s.ff.start >= s.ff.ms) {
      s.ff = null;
      if (life.mode.id === 'world') player.getUp();
    }
    // Going to work off screen: each step once the last has shown and any choice is made.
    if (trip && !blocked() && life.mode.id === 'world') {
      const next = tripAction(life, trip);
      if (next) act(next);
      else {
        trip = null;
        // Back at your building's door.
        const door = places.all.find((p) => p.kind === 'door' && p.building === places.bed.building) ?? places.bed;
        player = new Player(door);
        reachedAt = door.id;
        save();
      }
    }
    if (!blocked() && !s.paused) {
      const factor = FACTOR[s.speed];
      life.elapse(dt, factor);
      s.t += (dt / 1000) * factor;
      const reached = player.step(dt / 1000, factor);
      if (reached) arrive(reached);
      if (Math.floor((life.fact('time.tick') as number) / 60) !== savedHour) save();
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
      if (!trip) measureCommute();
      const list = waiting(life);
      s.waiting = list.length;
      alarms(list);
      s.waitingAt = now;
      bar.update(life, { minute, paused: s.paused, speed: s.speed, waiting: s.waiting });
    }
    follow(now);
    const light = daylight(minute);
    const actor = player.actor(look, s.t);
    cut = cutFor(block.plan, block.scene.buildings, actor, false);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    stage.render(
      ctx,
      viewOf(camera, size),
      size,
      {
        cut,
        bubbles: true,
        dark: light.dark,
        warm: light.warm,
        time: s.t,
      },
      [...(trip ? [] : [actor]), ...crowdNow(s.t, shownTime(now))],
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
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('lyl-save-failed', (e) => toast.show((e as CustomEvent<string>).detail));

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
      if (blocked() || trip || life.mode.id !== 'world') return;
      const ground = unproject(viewOf(camera, size), at);
      const place = placeAt(places, ground.x, ground.y);
      player.goTo(block.plan, block.grid, place ?? { x: ground.x, y: ground.y });
    },
  });

  /** For the tests and readings scripts: where things are, what the sim says, nothing that changes it. */
  Object.assign(window, {
    __lyl: {
      life: {
        places: () =>
          places.all.map((p) => ({
            id: p.id,
            kind: p.kind,
            label: p.label,
            building: p.building,
            serves: p.serves ?? [],
          })),
        options: () => life.options().map((a) => ({ ...a })),
        /** Whether the page is busy on its own: walking, or an activity's time passing on screen. */
        busy: () => player.walking || s.ff !== null || trip !== null,
        /** Where a trip to work is (M2.3), or null. */
        trip: () => trip?.step ?? null,
        open: () => ({ panel: panel.open, menu: sheet.open, choice: choice.open, map: map.open }),
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
        /** Just north of the nearest building across the street, where it stands between the camera and you (M2.1). */
        across: () => block.across,
        cut: () => [...cut],
        /** Who of the tier-1 people is out in the town now (M2.2, D69). */
        crowd: () =>
          crowdNow(s.t, shownTime(performance.now())).map((a) => ({
            id: a.id,
            x: a.x,
            y: a.y,
            walking: a.pose.kind === 'walk',
          })),
        screenAt: (x: number, y: number) => project(viewOf(camera, size), { x, y, z: 0 }),
        focusAt: (x: number, y: number) => {
          camera = clampCamera({ ...camera, cx: x, cy: y }, limits);
          s.moved = performance.now();
        },
        refused: () => life.refused.map((r) => ({ type: r.action.type, reason: r.reason })),
        log: () => life.session.log.map((a) => a.type),
        journal: () => life.journal.map((e) => e.text),
        slot: () => kept?.slot ?? null,
        saved: () => (kept ? kept.keeper.save(kept.slot, life, reachedAt).then((r) => r.ok) : Promise.resolve(false)),
        reached: () => reachedAt,
        /** For the save readings (e2e/saves-bench.ts): a save's size, and n writes and loads timed. */
        saveBench: async (n: number) => {
          if (!kept) return null;
          const times = { write: [] as number[], load: [] as number[] };
          for (let i = 0; i < n; i++) {
            let t = performance.now();
            await kept.keeper.save(kept.slot, life, reachedAt);
            times.write.push(performance.now() - t);
            t = performance.now();
            await kept.keeper.load(kept.slot, life);
            times.load.push(performance.now() - t);
          }
          const raw = (await kept.keeper.store.get(`eb/live-your-life/full/slot/${kept.slot}`)) ?? '';
          return {
            bytes: raw.length,
            log: life.session.log.length,
            state: JSON.stringify(life.state).length,
            ...times,
          };
        },
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
}
