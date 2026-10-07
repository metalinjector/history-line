import type { CountryId, Orientation, TimelineColumn } from '../types';
import { laneWords } from '../lib/orientation';

type Props = {
  columns: TimelineColumn[];
  /** В горизонтальной шкале шапка становится колонкой подписей слева. */
  orientation: Orientation;
  /** Линии без объектов в текущей выборке: их полосы ужимаются. */
  emptyColumnIds: Set<string>;
  selectedCountry?: CountryId;
  /** Идентификатор слоя, который сейчас тащат мышью, — колонки подсвечиваются как цели. */
  draggingLayerId?: string;
  onHide: (id: CountryId) => void;
  canHide: boolean;
  /** Бросок слоя на колонку: слой переезжает на её страну. */
  onDropLayer: (layerId: string, column: TimelineColumn) => void;
  onRemoveLayer: (layerId: string) => void;
};

/**
 * Подписи линий. В вертикальной шкале это строка колонок, прилипающая
 * к верхнему краю поля; в горизонтальной — колонка полос, прилипающая
 * к левому. Разметка одна и та же, раскладку меняет CSS.
 *
 * Колонка показывает по подписи на каждую дорожку — страну или наложенный слой.
 * Пока пользователь тащит слой, колонки становятся зонами приёма.
 */
export function TimelineHeader({
  columns,
  orientation,
  emptyColumnIds,
  selectedCountry,
  draggingLayerId,
  onHide,
  canHide,
  onDropLayer,
  onRemoveLayer,
}: Props) {
  const words = laneWords(orientation);

  return (
    <div className="thead" role="row">
      <div className="thead__date" role="columnheader">
        <span className="thead__date-label">
          Год{orientation === 'horizontal' ? <span aria-hidden="true"> →</span> : null}
        </span>
        {orientation === 'horizontal' ? (
          <span className="thead__lanes-label" aria-hidden="true">
            Линии ↓
          </span>
        ) : null}
      </div>

      {columns.map((column) => {
        const holdsSelected = column.tracks.some((track) => track.countryId === selectedCountry);
        const canAcceptLayer = Boolean(draggingLayerId) && !column.layerOnly;

        return (
          <div
            className="thead__cell"
            role="columnheader"
            key={column.id}
            data-shared={column.shared || undefined}
            data-selected={holdsSelected || undefined}
            data-layer-only={column.layerOnly || undefined}
            data-empty={emptyColumnIds.has(column.id) || undefined}
            title={emptyColumnIds.has(column.id) ? 'В текущей выборке у этой линии нет объектов' : undefined}
            data-drop={canAcceptLayer || undefined}
            onDragOver={(event) => {
              if (!canAcceptLayer) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              event.currentTarget.dataset.dropActive = 'true';
            }}
            onDragLeave={(event) => {
              delete event.currentTarget.dataset.dropActive;
            }}
            onDrop={(event) => {
              delete event.currentTarget.dataset.dropActive;
              if (!canAcceptLayer) return;
              event.preventDefault();
              const layerId = event.dataTransfer.getData('text/layer') || draggingLayerId;
              if (layerId) onDropLayer(layerId, column);
            }}
          >
            <div className="thead__stack">
              {column.tracks.map((track) => (
                <div
                  className="thead__line"
                  key={track.id}
                  data-kind={track.kind}
                  data-inherited={track.inherited || undefined}
                  style={
                    {
                      '--c': `hsl(${track.color})`,
                      '--c-ink': `hsl(${track.colorInk})`,
                    } as React.CSSProperties
                  }
                  data-selected={
                    (track.countryId && track.countryId === selectedCountry) || undefined
                  }
                >
                  <span className="thead__dot" aria-hidden="true" />
                  <span className="thead__label">{track.label}</span>
                  <span className="thead__short">{track.short}</span>

                  {track.kind === 'layer' ? (
                    <button
                      type="button"
                      className="thead__hide"
                      onClick={() => onRemoveLayer(track.layerId!)}
                      title={`Убрать слой «${track.label}»`}
                    >
                      <span aria-hidden="true">×</span>
                      <span className="visually-hidden">Убрать слой {track.label}</span>
                    </button>
                  ) : track.inherited ? (
                    // Унаследованную дорожку нельзя скрыть отдельно: она пришла
                    // вместе со своим наследником и уйдёт вместе с ним. Крестик
                    // здесь означал бы «отделить», а не «скрыть», — лучше без него.
                    <span
                      className="thead__inherited"
                      title={`Древняя линия ${words.gen} «${column.tracks[0].label}»`}
                    >
                      унаследована
                    </span>
                  ) : canHide ? (
                    <button
                      type="button"
                      className="thead__hide"
                      onClick={() => onHide(track.countryId!)}
                      title={`Скрыть линию «${track.label}»`}
                    >
                      <span aria-hidden="true">×</span>
                      <span className="visually-hidden">Скрыть линию {track.label}</span>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <span className="thead__underline" aria-hidden="true">
              {column.tracks.map((track) => (
                <span key={track.id} style={{ background: `hsl(${track.color})` }} />
              ))}
            </span>

            {canAcceptLayer ? (
              <span className="thead__drop-hint">
                {/* Ужатой пустой колонке хватает места только на знак */}
                {emptyColumnIds.has(column.id) && orientation === 'vertical' ? '+ слой' : 'положить слой сюда'}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
