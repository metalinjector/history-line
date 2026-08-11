export const ZOOM_MIN = 0.65;
export const ZOOM_MAX = 1.9;

/** После этого значения ширина карточек не растёт — меняется только детализация времени. */
export const VISUAL_ZOOM_MAX = 1.2;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

export function visualZoom(zoom: number): number {
  return Math.min(zoom, VISUAL_ZOOM_MAX);
}

/**
 * Возвращает логический zoom, при котором измеренная сетка поместится в viewport.
 * Измеренная ширина зависит от visual zoom, поэтому использовать здесь сырой zoom
 * после порога 1.2 нельзя: он больше не соответствует геометрии DOM.
 */
export function fitZoomToWidth(measuredWidth: number, availableWidth: number, currentZoom: number): number {
  if (measuredWidth <= 0 || availableWidth <= 0) return clampZoom(currentZoom);
  return clampZoom((availableWidth / measuredWidth) * visualZoom(currentZoom));
}
