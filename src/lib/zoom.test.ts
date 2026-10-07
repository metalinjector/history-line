import { describe, expect, it } from 'vitest';
import { granularityForZoom } from './timeline';
import { fitZoom, visualZoom, VISUAL_ZOOM_MAX, ZOOM_MIN } from './zoom';

describe('fitZoom', () => {
  it('uses the actual visual scale after geometry stops growing', () => {
    // At logical zoom 1.9 the DOM is still rendered at 1.2. A 1200 px grid
    // fitting into 600 px asks for 0.6 (then clamps to the supported 0.65),
    // not the erroneous 0.95 obtained from the logical zoom.
    expect(fitZoom(1200, 600, 1.9)).toBe(ZOOM_MIN);
  });

  it('preserves proportional fitting below the visual cap', () => {
    expect(fitZoom(800, 600, 1)).toBeCloseTo(0.75);
  });

  it('shrinks only the part of the layout that scales with zoom', () => {
    // Horizontal lanes: the rails above the cards never shrink, the cards do.
    expect(fitZoom(1238, 1038, 1, 238)).toBeCloseTo(0.8, 5);
    expect(fitZoom(700, 600, 1, 100)).toBeCloseTo(500 / 600);
    // A fixed part larger than the viewport cannot be fitted at all.
    expect(fitZoom(700, 90, 1, 100)).toBe(ZOOM_MIN);
  });

  it('never fits past the visual cap, so fitting does not switch to months or days', () => {
    const fitted = fitZoom(100, 1000, visualZoom(1));
    expect(fitted).toBeLessThan(VISUAL_ZOOM_MAX);
    expect(fitted).toBeGreaterThan(VISUAL_ZOOM_MAX - 0.02);
    expect(granularityForZoom(fitted)).toBe('year');
  });

  it('clamps invalid extremes', () => {
    expect(fitZoom(0, 1000, 1)).toBe(1);
  });
});
