/**
 * The map (D51): the block seen from above, each building named, you on it, and a tap on a
 * building sends you to its door; below it, since M2.1, the city with its districts named and
 * where you live. Drawn as SVG, so its names stay sharp and its buildings are buttons.
 */
import type { BlockPlan, CityPlan, DistrictRecord, Home } from '@lyl/sim';
import { cityPicture } from './citymap.ts';
import { button, el } from './dom.ts';
import type { Place, Places } from './places.ts';

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export interface MapView {
  readonly root: HTMLElement;
  readonly open: boolean;
  show(you: { x: number; y: number }): void;
  hide(): void;
}

/** The city the block stands in, when it stands in one (M2.1). */
export interface InCity {
  readonly city: CityPlan;
  readonly districts: readonly DistrictRecord[];
  readonly home: Home;
}

export function makeMap(
  plan: BlockPlan,
  places: Places,
  go: (p: Place) => void,
  closed: () => void,
  inCity: InCity | null = null,
): MapView {
  const s = plan.street;
  const doors = places.all.filter((p) => p.kind === 'door');
  const box = { x0: s.xa, y0: s.alley, x1: s.xb, y1: s.openBack };
  const picture = svg('svg', {
    viewBox: `${box.x0} ${box.y0} ${box.x1 - box.x0} ${box.y1 - box.y0}`,
    class: 'map-picture',
    role: 'img',
    'aria-label': 'The block from above',
  });
  const you = svg('circle', { r: 1.2, class: 'map-you' });
  const hide = () => {
    root.hidden = true;
    closed();
  };
  picture.append(
    svg('rect', { x: s.xa, y: s.lotFront, width: s.xb - s.xa, height: s.curb - s.lotFront, class: 'map-walk' }),
    svg('rect', { x: s.xa, y: s.curb, width: s.xb - s.xa, height: s.farCurb - s.curb, class: 'map-road' }),
    svg('rect', { x: s.xa, y: s.farCurb, width: s.xb - s.xa, height: s.openFront - s.farCurb, class: 'map-walk' }),
  );
  for (const b of plan.buildings) {
    const door = doors.find((d) => d.building === b.id);
    picture.append(svg('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, class: 'map-building' }));
    if (door) {
      const label = svg('text', { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, class: 'map-label' });
      label.textContent = door.label;
      picture.append(label);
    }
  }
  picture.append(you);
  // The buildings as buttons too, in the street's order: a map has to work without the picture.
  const list = el(
    'div',
    { class: 'map-places', id: 'map-places' },
    ...doors
      .slice()
      .sort((a, b) => a.stand.x - b.stand.x)
      .map((d) =>
        button(
          d.label,
          () => {
            hide();
            go(d);
          },
          { 'data-place': d.id },
        ),
      ),
  );
  const root = el(
    'section',
    { class: 'map', id: 'map', role: 'dialog', 'aria-label': 'Map', hidden: true },
    el('div', { class: 'panel-head' }, el('h2', {}, 'The block'), button('Close', hide, { id: 'map-close' })),
    picture as unknown as Node,
    list,
    ...(inCity
      ? [el('h2', {}, inCity.city.name), cityPicture(inCity.city, inCity.districts, inCity.home) as unknown as Node]
      : []),
  );
  return {
    root,
    get open() {
      return !root.hidden;
    },
    show(at) {
      you.setAttribute('cx', String(at.x));
      you.setAttribute('cy', String(at.y));
      root.hidden = false;
    },
    hide,
  };
}
