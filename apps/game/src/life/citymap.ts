/**
 * The city on the map (M2.1's sixth gate): Ridgefield's cells in their districts' colours, each
 * district named once, and where you live. Drawn from the plan, as everything is.
 */
import type { CityPlan, DistrictRecord, Home } from '@lyl/sim';

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/**
 * Where to name a district: the cell most deeply inside it, the one with most of its own district
 * round it, nearest the middle of its cells on a tie. A ring's middle is another district's, and
 * the suburbs' middle is the whole city's.
 */
export function labelCell(city: CityPlan, district: number): number {
  const n = city.size;
  const own = (col: number, row: number) =>
    col >= 0 && row >= 0 && col < n && row < n && city.cellDistrict[row * n + col] === district;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let c = 0; c < n * n; c++) {
    if (city.cellDistrict[c] !== district) continue;
    sx += c % n;
    sy += Math.floor(c / n);
    count++;
  }
  const mx = sx / count;
  const my = sy / count;
  let best = -1;
  let bestScore = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let c = 0; c < n * n; c++) {
    if (city.cellDistrict[c] !== district) continue;
    const col = c % n;
    const row = Math.floor(c / n);
    let score = 0;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (own(col + dc, row + dr)) score++;
    const d = (col - mx) * (col - mx) + (row - my) * (row - my);
    if (score > bestScore || (score === bestScore && d < bestD)) {
      best = c;
      bestScore = score;
      bestD = d;
    }
  }
  return best;
}

export function cityPicture(city: CityPlan, districts: readonly DistrictRecord[], home: Home): SVGSVGElement {
  const side = city.size * city.cell;
  const picture = svg('svg', {
    viewBox: `0 0 ${side} ${side}`,
    class: 'map-picture map-city',
    id: 'map-city',
    role: 'img',
    'aria-label': `${city.name} from above, its districts named`,
  });
  for (let c = 0; c < city.size * city.size; c++) {
    const d = districts[city.cellDistrict[c] as number] as DistrictRecord;
    const x = (c % city.size) * city.cell;
    const y = Math.floor(c / city.size) * city.cell;
    picture.append(svg('rect', { x, y, width: city.cell, height: city.cell, fill: d.colour, 'data-district': d.name }));
  }
  districts.forEach((d, i) => {
    const c = labelCell(city, i);
    if (c < 0) return;
    const label = svg('text', {
      x: ((c % city.size) + 0.5) * city.cell,
      y: (Math.floor(c / city.size) + 0.5) * city.cell,
      class: 'map-district',
    });
    label.textContent = d.name;
    picture.append(label);
  });
  const b = home.block;
  picture.append(
    svg('circle', {
      cx: (city.blocks.x[b] as number) + (city.blocks.w[b] as number) / 2,
      cy: (city.blocks.y[b] as number) + (city.blocks.d[b] as number),
      r: city.cell * 0.35,
      class: 'map-you',
      id: 'map-city-you',
    }),
  );
  return picture;
}
