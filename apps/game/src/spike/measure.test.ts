import { describe, expect, it } from 'vitest';
import { frameStats, MEASURE_MS, Measure, SETTLE_MS } from './measure.ts';
import { readParams } from './params.ts';

describe('the frame-rate reading', () => {
  it('gives fps over the total time, and the median, 95th and worst frame by nearest rank', () => {
    const s = frameStats([16, 17, 16, 33, 16]);
    expect(s.frames).toBe(5);
    expect(s.fps).toBeCloseTo(5000 / 98, 9);
    expect(s.median).toBe(16);
    expect(s.p95).toBe(33);
    expect(s.worst).toBe(33);
  });

  it('settles a second, measures ten, then reports once', () => {
    const m = new Measure();
    m.start(0);
    let result = null;
    let reports = 0;
    for (let t = 0; t <= SETTLE_MS + MEASURE_MS + 100; t += 20) {
      const r = m.frame(t);
      if (r) {
        result = r;
        reports++;
      }
    }
    expect(reports).toBe(1);
    expect(result?.fps).toBeCloseTo(50, 6);
    expect(m.running).toBe(false);
  });
});

describe('the address', () => {
  it("defaults to the spike's block in the wide view, walls down, bubbles and controls on, the clock running", () => {
    expect(readParams('')).toEqual({
      seed: 'rust-belt-1',
      at: null,
      framing: 'wide',
      focus: 'diner',
      cut: true,
      bubbles: true,
      hud: true,
      freeze: null,
      cache: true,
      block: 'spike',
      grid: false,
    });
  });

  it('reads every setting, and ignores what it cannot read', () => {
    expect(
      readParams(
        '?seed=abc&at=22:30&view=close&focus=apartment&walls=up&bubbles=0&hud=0&freeze=1.2&cache=0&block=generated&grid=1',
      ),
    ).toEqual({
      seed: 'abc',
      at: { hour: 22, minute: 30 },
      framing: 'close',
      focus: 'apartment',
      cut: false,
      bubbles: false,
      hud: false,
      freeze: 1.2,
      cache: false,
      block: 'generated',
      grid: true,
    });
    const odd = readParams('?at=25:00&view=sideways&freeze=soon&block=city');
    expect(odd.at).toBeNull();
    expect(odd.framing).toBe('wide');
    expect(odd.freeze).toBeNull();
    expect(odd.block).toBe('spike');
  });
});
