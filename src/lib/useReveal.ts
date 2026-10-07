import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Плавное появление при прокрутке.
 *
 * Элементы с атрибутом data-reveal внутри root (и сам root, если у него
 * есть этот атрибут) получают data-revealed, когда впервые показываются
 * на экране. Саму анимацию задаёт CSS (styles/base.css), каскад — переменная
 * --reveal-delay. Пока скрипт не отработал, элемент виден: прячет его только
 * правило для [data-reveal]:not([data-revealed]), а оно не действует
 * при печати и при «уменьшить движение».
 *
 * Эффект запускается после каждой отрисовки и подхватывает новые элементы,
 * поэтому карточка, добавленная позже, не останется невидимой.
 */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  const observer = useRef<IntersectionObserver | null>(null);
  const watched = useRef(new WeakSet<Element>());

  useEffect(
    () => () => {
      // После размонтирования (и повторного монтирования в StrictMode)
      // всё нужно наблюдать заново.
      observer.current?.disconnect();
      observer.current = null;
      watched.current = new WeakSet();
    },
    [],
  );

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const pending = [node, ...node.querySelectorAll<HTMLElement>('[data-reveal]')].filter(
      (element) =>
        element.hasAttribute('data-reveal') &&
        !element.hasAttribute('data-revealed') &&
        !watched.current.has(element),
    );
    if (pending.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      for (const element of pending) element.dataset.revealed = '';
      return;
    }

    // Не порог видимой доли, а нижняя кромка экрана: элемент выше экрана
    // никогда не набрал бы нужную долю и остался бы скрытым навсегда.
    observer.current ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = '';
          observer.current?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    for (const element of pending) {
      watched.current.add(element);
      observer.current.observe(element);
    }
  });
}

/**
 * Подложка выбранного варианта в сегментированном переключателе:
 * переезжает к нему, а не появляется на месте. Возвращает ref для контейнера
 * и стиль подложки; выбранный вариант помечается атрибутом data-active.
 */
export function useSlidingPill<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<{ x: number; width: number } | undefined>();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>('[data-active]');
      if (!active) return;
      setBox((previous) =>
        previous?.x === active.offsetLeft && previous.width === active.offsetWidth
          ? previous
          : { x: active.offsetLeft, width: active.offsetWidth },
      );
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    return () => resize.disconnect();
  }, [activeKey]);

  const style: React.CSSProperties = box
    ? { width: box.width, transform: `translateX(${box.x}px)` }
    : { visibility: 'hidden' };

  return { ref, style };
}
