/** The city bench in a page: `runCity` for headless Chromium (chromium.ts), which throttles the CPU first. */
import { formatCity, measureCity } from '../src/measure.ts';

const out = document.getElementById('out') as HTMLPreElement;
const memory = () => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;

async function runCity(seeds: number, rounds: number): Promise<string> {
  const reading = await measureCity(
    seeds,
    rounds,
    () => performance.now(),
    memory,
    () => new Promise((r) => setTimeout(r, 0)),
  );
  out.textContent = formatCity(reading);
  return out.textContent;
}

Object.assign(window, { runCity });
