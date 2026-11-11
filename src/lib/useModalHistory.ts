import { useEffect, useRef } from 'react';

/** Метка записи истории, которую добавило открытое окно. */
const MODAL_ENTRY = 'history-line:modal';

/**
 * Кнопка «Назад» закрывает открытое окно, а не уводит с сайта.
 *
 * На телефоне окно статьи занимает весь экран, и «Назад» (жест или кнопка) —
 * привычный способ из него выйти. Без записи в истории браузер уходил
 * с сайта, и читатель терял место на шкале.
 *
 * Открытие окна добавляет одну запись в историю — одну на всё время, пока
 * открыто хоть какое-то окно: переходы между статьями внутри окна новых
 * записей не создают. Закрытие окна кнопкой или Esc эту запись снимает.
 * Окно, открытое прямо по ссылке (`?item=…`), записи не добавляет: «Назад»
 * оттуда ведёт туда, откуда читатель пришёл.
 *
 * Хук должен стоять в компоненте раньше эффекта, который пишет состояние
 * в адрес: тогда запись окна добавляется поверх ещё прежнего адреса,
 * и «Назад» возвращает адрес без открытого окна.
 *
 * @param open     открыто ли сейчас какое-нибудь окно
 * @param close    закрыть все окна
 * @param onReturn история сдвинулась — адрес нужно привести к состоянию
 */
export function useModalHistory(open: boolean, close: () => void, onReturn: () => void) {
  /** Есть ли в истории запись, добавленная этим хуком и ещё не снятая. */
  const pushed = useRef(false);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;

    if (open) {
      const state: unknown = window.history.state;
      const base = typeof state === 'object' && state !== null ? state : {};
      window.history.pushState({ ...base, [MODAL_ENTRY]: true }, '');
      pushed.current = true;
    } else if (pushed.current) {
      // Окно закрыли в интерфейсе — его запись в истории больше не нужна.
      pushed.current = false;
      window.history.back();
    }
  }, [open]);

  useEffect(() => {
    const onPopState = () => {
      if (pushed.current) {
        // Читатель нажал «Назад» при открытом окне.
        pushed.current = false;
        close();
      }
      onReturn();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [close, onReturn]);
}
