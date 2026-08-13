export const TIMELINE_PIN_GAP = 8;

export type TimelinePinGeometry = {
  top: number;
  left: number;
  width: number;
};

type TimelinePinInput = {
  enabled: boolean;
  anchorTop: number;
  anchorLeft: number;
  anchorWidth: number;
  headerBottom: number;
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
  };
}
