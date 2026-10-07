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
 * Возвращает логический zoom, при котором измеренная сетка поместится в viewport
 * поперёк оси времени: по ширине колонок в вертикальной шкале и по высоте
 * полос в горизонтальной. Измеренный размер зависит от visual zoom, поэтому
 * использовать здесь сырой zoom после порога 1.2 нельзя: он больше
 * не соответствует геометрии DOM.
 *
 * fixedSize — часть измеренного размера, которая от масштаба не зависит
 * (полоса под линиями дорожек): уменьшать можно только остальное.
 *
 * С VISUAL_ZOOM_MAX геометрия больше не растёт, а масштаб начинает дробить
 * годы на месяцы и дни, — «уместить» не должно менять детализацию шкалы,
 * поэтому результат останавливается на шаг ползунка ниже этого порога.
 */
export function fitZoom(measuredSize: number, availableSize: number, currentZoom: number, fixedSize = 0): number {
  const scalable = measuredSize - fixedSize;
  if (scalable <= 0 || availableSize <= 0) return clampZoom(currentZoom);
  const fitted = ((availableSize - fixedSize) / scalable) * visualZoom(currentZoom);
  return clampZoom(Math.min(VISUAL_ZOOM_MAX - 0.01, fitted));
}
