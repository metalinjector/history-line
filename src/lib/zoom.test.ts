import { describe, expect, it } from 'vitest';
import { fitZoomToWidth, visualZoom, ZOOM_MAX, ZOOM_MIN } from './zoom';

describe('fitZoomToWidth', () => {
  it('uses the actual visual scale after geometry stops growing', () => {
    // At logical zoom 1.9 the DOM is still rendered at 1.2. A 1200 px grid
    // fitting into 600 px asks for 0.6 (then clamps to the supported 0.65),
    // not the erroneous 0.95 obtained from the logical zoom.
    expect(fitZoomToWidth(1200, 600, 1.9)).toBe(ZOOM_MIN);
  });

  it('preserves proportional fitting below the visual cap', () => {
    expect(fitZoomToWidth(800, 600, 1)).toBeCloseTo(0.75);
  });

  it('clamps invalid extremes', () => {
    expect(fitZoomToWidth(100, 1000, visualZoom(1))).toBe(ZOOM_MAX);
    expect(fitZoomToWidth(0, 1000, 1)).toBe(1);
  });
});
