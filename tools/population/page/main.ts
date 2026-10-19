/**
 * The harness in a page: `runHarness` for headless Chromium (chromium.ts), which sets the CPU
 * throttle before calling it; opened by hand with `?run`, it runs at once. It yields between
 * readings, so the page can show how far it has got.
 */
import { DAYS, formatSweep, SIZES, sweep } from '../src/sweep.ts';

const out = document.getElementById('out') as HTMLPreElement;

async function runHarness(days: number, sizes: readonly number[]): Promise<string> {
  out.textContent = 'running';
  const result = await sweep({
    sizes,
    days,
    now: () => performance.now(),
    between: async (done) => {
      out.textContent += `\n${done}`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  });
  out.textContent = formatSweep(result);
  return out.textContent;
}

Object.assign(window, { runHarness });

const params = new URLSearchParams(location.search);
if (params.has('run')) {
  void runHarness(Number(params.get('days') ?? DAYS), params.get('sizes')?.split(',').map(Number) ?? SIZES);
}
