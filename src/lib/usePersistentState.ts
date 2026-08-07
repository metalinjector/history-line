import { useEffect, useState } from 'react';

const PREFIX = 'history-line:';

/**
 * useState, который переживает перезагрузку страницы.
 * Ошибки чтения и записи игнорируются: приватный режим браузера
 * не должен ломать интерфейс.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* хранилище недоступно — просто работаем без сохранения */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Уважает системную настройку «уменьшить движение». */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}
