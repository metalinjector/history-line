import { Component, type ErrorInfo, type ReactNode } from 'react';
import './ModalFallback.css';

/**
 * Что читатель видит, пока окно статьи ещё не открылось, и если оно
 * не открылось вовсе.
 *
 * Код окна и полные тексты — отдельные чанки (docs/CORE.md, раздел 3), и на
 * медленной сети между нажатием и окном проходят секунды: без отклика кажется,
 * что кнопка не сработала. А если чанк не пришёл — обрыв сети или сайт успели
 * обновить, пока вкладка была открыта, — ошибка загрузки без этого предохранителя
 * размонтировала бы всё приложение и оставила пустую страницу.
 *
 * Стили лежат в основном бандле, а не в modal.css: они нужны как раз тогда,
 * когда чанк окна недоступен.
 */

/** Заглушка Suspense. Появляется с задержкой: быстрая загрузка обходится без неё. */
export function ModalLoading() {
  return (
    <div className="modal-fallback" data-kind="loading" role="status" aria-live="polite">
      <span className="modal-fallback__spinner" aria-hidden="true" />
      Открываем текст…
    </div>
  );
}

type BoundaryProps = {
  /** Отказаться: закрыть окно, которое так и не открылось. */
  onClose: () => void;
  children: ReactNode;
};

export class ModalBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Окно не открылось', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="modal-fallback" data-kind="error" role="alert">
        {/* Повторить загрузку на месте нельзя: браузер помнит сорвавшийся import()
            до перезагрузки. Адрес уже хранит открытую статью и вид шкалы, так что
            после обновления читатель окажется там же. */}
        <p className="modal-fallback__text">
          <b>Не удалось открыть текст.</b> Проверьте соединение и обновите страницу — она откроется
          на этом же месте. Так бывает и когда сайт обновился, пока вкладка была открыта.
        </p>
        <div className="modal-fallback__actions">
          <button type="button" className="btn btn--sm btn--primary" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={this.props.onClose}>
            Закрыть
          </button>
        </div>
      </div>
    );
  }
}
