import { useEffect } from 'react';

/**
 * Колесо мыши в горизонтальной шкале листает время.
 *
 * Обычное колесо крутит по вертикали, а в горизонтальной шкале по вертикали
 * лежат линии стран, а не время. Поэтому вертикальная прокрутка колесом
 * переводится в горизонтальную, а Shift + колесо, наоборот, двигает полосы —
 * оси поменялись местами вместе со шкалой.
 *
 * Жесты, у которых уже есть горизонтальная составляющая (тачпад, Shift + колесо
 * в macOS), браузер обрабатывает сам, как и Ctrl + колесо — масштаб страницы.
 */
export function useWheelAlongTime(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    // Дискретные щелчки колеса по 100 px дёргали бы шкалу — догоняем цель плавно.
    let target = 0;
    let frame = 0;

    const step = () => {
      const current = node.scrollLeft;
      const distance = target - current;
      // Не меньше пикселя за кадр: дробный шаг браузер мог бы округлить до нуля.
      node.scrollLeft =
        Math.abs(distance) < 2 ? target : current + Math.sign(distance) * Math.max(1, Math.abs(distance) * 0.3);
      // Дошли до цели или упёрлись в край шкалы.
      if (node.scrollLeft === target || node.scrollLeft === current) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 32
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? node.clientWidth
            : 1;
      const delta = event.deltaY * unit;
      event.preventDefault();

      if (event.shiftKey) {
        node.scrollTop += delta;
        return;
      }

      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // Тачпад присылает мелкие частые шаги, они и так плавные.
      if (reduced || Math.abs(delta) < 40) {
        cancelAnimationFrame(frame);
        frame = 0;
        node.scrollLeft += delta;
        return;
      }

      if (!frame) target = node.scrollLeft;
      target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, target + delta));
      if (!frame) frame = requestAnimationFrame(step);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frame);
    };
  }, [enabled, ref]);
}
