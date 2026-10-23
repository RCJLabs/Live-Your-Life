/**
 * `node tools/city/bench.ts [seeds] [rounds]`: the whole city planned in Node (M2.1, D65), with
 * the heap's growth over one plan kept. Run with --expose-gc for a steadier heap reading.
 */
import { formatCity, measureCity } from './src/measure.ts';

const seeds = Number(process.argv[2] ?? 10);
const rounds = Number(process.argv[3] ?? 3);
const gc = (globalThis as { gc?: () => void }).gc;
const heap = () => {
  gc?.();
  const m = process.memoryUsage();
  // Typed arrays sit outside the heap, in array buffers: both count.
  return m.heapUsed + m.arrayBuffers;
};
const reading = await measureCity(seeds, rounds, () => performance.now(), heap);
console.log(`Node ${process.version}, ${seeds} seeds × ${rounds} rounds`);
console.log(formatCity(reading));
