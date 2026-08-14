export const TIMELINE_PIN_GAP = 8;
/** Небольшой просвет над нижней границей окна/системной панелью. */
export const TIMELINE_PIN_BOTTOM_GAP = 12;

export type TimelinePinGeometry = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TimelinePinInput = {
  enabled: boolean;
  anchorTop: number;
  anchorLeft: number;
  anchorWidth: number;
  headerBottom: number;
  viewportHeight: number;
};

/**
 * Геометрия фиксированного окна хронологии.
 *
 * После прохождения порога учитывается только верх якоря — нижняя граница
 * секции намеренно не участвует. Поэтому окно не выталкивается наверх, когда
 * следующие разделы страницы проходят под ним.
 */
export function resolveTimelinePin(input: TimelinePinInput): TimelinePinGeometry | undefined {
  if (!input.enabled) return undefined;

  const top = input.headerBottom + TIMELINE_PIN_GAP;
  if (input.anchorTop > top) return undefined;

  return {
    top,
    left: input.anchorLeft,
    width: input.anchorWidth,
    height: Math.max(0, input.viewportHeight - top - TIMELINE_PIN_BOTTOM_GAP),
  };
}
