import { useCallback, useEffect, useRef, useState } from 'react';

type PanningOptions = {
  /** Множитель скорости перемещения. */
  speed?: number;
  /** Инерция после отпускания кнопки, 0 — выключена. */
  friction?: number;
};

/**
 * Перетаскивание поля хронологии левой кнопкой мыши.
 *
 * Особенности:
 * — движение по горизонтали меняет scrollLeft, по вертикали — scrollTop контейнера;
 * — интерактивные элементы (кнопки, ссылки, поля ввода) не запускают перетаскивание;
 * — после реального перетаскивания подавляется клик, чтобы не выбралась карточка;
 * — после отпускания есть короткая инерция, чтобы движение ощущалось плавным.
 */
export function usePanning<T extends HTMLElement>({ speed = 1, friction = 0.92 }: PanningOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const dragState = useRef({ active: false, lastX: 0, lastY: 0, vx: 0, vy: 0, pointerId: -1 });
  const movedRef = useRef(false);
  const rafRef = useRef(0);

  const stopInertia = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const runInertia = useCallback(() => {
    const node = ref.current;
    if (!node || friction <= 0) return;

    const step = () => {
      const state = dragState.current;
      state.vx *= friction;
      state.vy *= friction;
      if (Math.abs(state.vx) < 0.25 && Math.abs(state.vy) < 0.25) {
        rafRef.current = 0;
        return;
      }
      node.scrollLeft -= state.vx;
      node.scrollTop -= state.vy;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [friction]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<T>) => {
      if (event.button !== 0 || event.pointerType === 'touch') return;
      const target = event.target as HTMLElement;
      // Элементы управления и текст должны работать обычным образом.
      if (target.closest('button, a, input, select, textarea, [role="slider"], [data-no-pan]')) return;

      stopInertia();
      const node = ref.current;
      if (!node) return;

      dragState.current = {
        active: true,
        lastX: event.clientX,
        lastY: event.clientY,
        vx: 0,
        vy: 0,
        pointerId: event.pointerId,
      };
      movedRef.current = false;
      setIsPanning(true);
    },
    [stopInertia],
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const handleMove = (event: PointerEvent) => {
      const state = dragState.current;
      if (!state.active || event.pointerId !== state.pointerId) return;

      const dx = (event.clientX - state.lastX) * speed;
      const dy = (event.clientY - state.lastY) * speed;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.vx = dx;
      state.vy = dy;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;

      node.scrollLeft -= dx;
      node.scrollTop -= dy;
      event.preventDefault();
    };

    const handleUp = (event: PointerEvent) => {
      const state = dragState.current;
      if (!state.active || event.pointerId !== state.pointerId) return;
      state.active = false;
      setIsPanning(false);
      runInertia();
      // Клик приходит сразу после pointerup: снимаем флаг в следующем кадре.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          movedRef.current = false;
        });
      });
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [runInertia, speed]);

  useEffect(() => stopInertia, [stopInertia]);

  /** true, если перед кликом было реальное перетаскивание — такой клик надо игнорировать. */
  const didPan = useCallback(() => movedRef.current, []);

  return { ref, isPanning, onPointerDown, didPan, stopInertia };
}
