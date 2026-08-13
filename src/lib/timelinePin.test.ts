import { describe, expect, it } from 'vitest';
import { resolveTimelinePin, TIMELINE_PIN_GAP } from './timelinePin';

const base = {
  enabled: true,
  anchorLeft: 175,
  anchorWidth: 1560,
  headerBottom: 60,
};

describe('каскадная фиксация окна хронологии', () => {
  it('не фиксирует окно до соприкосновения с верхней панелью', () => {
    expect(resolveTimelinePin({ ...base, anchorTop: 120 })).toBeUndefined();
  });

  it('фиксирует окно сразу под верхней панелью', () => {
    expect(resolveTimelinePin({ ...base, anchorTop: 60 + TIMELINE_PIN_GAP })).toEqual({
      top: 60 + TIMELINE_PIN_GAP,
      left: 175,
      width: 1560,
    });
  });

  it('не отпускает окно, когда якорь и следующие разделы ушли далеко вверх', () => {
    expect(resolveTimelinePin({ ...base, anchorTop: -5000 })).toEqual({
      top: 60 + TIMELINE_PIN_GAP,
      left: 175,
      width: 1560,
    });
  });

  it('отключает каскад там, где окно заняло бы почти весь экран', () => {
    expect(resolveTimelinePin({ ...base, enabled: false, anchorTop: -5000 })).toBeUndefined();
  });
});
