import type { CountryId, TimelineColumn } from '../types';

type Props = {
  columns: TimelineColumn[];
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
 * Строка колонок. Прилипает к верхнему краю поля хронологии при прокрутке.
 *
 * Колонка показывает по подписи на каждую дорожку — страну или наложенный слой.
 * Пока пользователь тащит слой, колонки становятся зонами приёма.
 */
export function TimelineHeader({
  columns,
  selectedCountry,
  draggingLayerId,
  onHide,
  canHide,
  onDropLayer,
  onRemoveLayer,
}: Props) {
  return (
    <div className="thead" role="row">
      <div className="thead__date" role="columnheader">
        <span className="thead__date-label">Год</span>
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
                    <span className="thead__inherited" title={`Древняя линия колонки «${column.tracks[0].label}»`}>
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

            {canAcceptLayer ? <span className="thead__drop-hint">положить слой сюда</span> : null}
          </div>
        );
      })}
    </div>
  );
}
