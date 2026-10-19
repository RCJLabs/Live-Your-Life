/**
 * The spike's controls: play and speed, walls and bubbles, day and night, zoom, the measure,
 * and hiding it all for a clean screenshot. Plain buttons, 44 px at least, labelled for a
 * screen reader (CLAUDE.md, "Mobile first").
 */
export interface Controls {
  togglePlay(): void;
  toggleSpeed(): void;
  toggleWalls(): void;
  toggleBubbles(): void;
  day(): void;
  night(): void;
  zoom(factor: number): void;
  measure(): void;
  hide(): void;
}

export interface HudState {
  readonly playing: boolean;
  readonly speed: 1 | 2;
  readonly cut: boolean;
  readonly bubbles: boolean;
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function bindHud(c: Controls): void {
  const on = (id: string, fn: () => void) => byId(id).addEventListener('click', fn);
  on('play', c.togglePlay);
  on('speed', c.toggleSpeed);
  on('walls', c.toggleWalls);
  on('bubbles', c.toggleBubbles);
  on('day', c.day);
  on('night', c.night);
  on('zoom-in', () => c.zoom(1.25));
  on('zoom-out', () => c.zoom(0.8));
  on('measure', c.measure);
  on('hide', c.hide);
  on('close-measure', () => {
    byId('measured').hidden = true;
  });
  on('copy', () => {
    const text = byId('measured-text').textContent ?? '';
    navigator.clipboard?.writeText(text).catch(() => {});
  });
}

export function showHud(s: HudState): void {
  byId('play').textContent = s.playing ? 'Pause' : 'Play';
  byId('speed').textContent = `Speed ${s.speed}`;
  byId('walls').setAttribute('aria-pressed', String(s.cut));
  byId('bubbles').setAttribute('aria-pressed', String(s.bubbles));
}

export function showMeasured(text: string): void {
  byId('measured-text').textContent = text;
  byId('measured').hidden = false;
}

export const setText = (id: string, text: string): void => {
  const el = byId(id);
  if (el.textContent !== text) el.textContent = text;
};
