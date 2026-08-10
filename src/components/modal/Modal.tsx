import { useEffect, useRef } from 'react';

type Props = {
  /** Цвет верхней полосы и акцентов окна. */
  accent?: string;
  accentInk?: string;
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Оболочка модального окна.
 *
 * Используется нативный <dialog>: он сам забирает фокус, запирает его внутри,
 * закрывается по Esc и рисует затемнение через ::backdrop — надёжнее
 * и доступнее самодельной реализации.
 */
export function Modal({ accent, accentInk, labelledBy, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      className="modal"
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // Клик по подложке: цель — сам dialog, а не его содержимое.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      style={
        {
          '--c': accent ?? 'var(--accent)',
          '--c-ink': accentInk ?? 'var(--accent)',
        } as React.CSSProperties
      }
      aria-labelledby={labelledBy}
    >
      <div className="modal__panel">
        <span className="modal__bar" aria-hidden="true" />
        {children}
      </div>
    </dialog>
  );
}

/** Кнопка закрытия — общая для всех окон. */
export function ModalClose() {
  return (
    <button
      type="button"
      className="modal__close"
      onClick={(event) => event.currentTarget.closest('dialog')?.close()}
      title="Закрыть (Esc)"
    >
      <span aria-hidden="true">×</span>
      <span className="visually-hidden">Закрыть</span>
    </button>
  );
}
