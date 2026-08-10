import { useEffect, useRef, useState } from 'react';
import type { Country, Layer, LayerPlacement } from '../types';
import { OWN_COLUMN } from '../types';
import { groupedLayers, layerStartYear } from '../data/layers';
import type { LayerState } from '../lib/layers';
import './LayerMenu.css';

type Props = {
  activeLayerIds: string[];
  layerState: LayerState;
  maxLayers: number;
  countries: Country[];
  activeCountryIds: string[];
  placementOf: (layerId: string) => LayerPlacement;
  onToggleLayer: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onPlaceLayer: (layerId: string, placement: LayerPlacement) => void;
  /** Сообщает таблице, что слой тащат: колонки становятся зонами приёма. */
  onDragLayer: (layerId?: string) => void;
};

/**
 * Выпадающее меню слоёв и панель включённых.
 *
 * Слои разложены по разделам: персоны — по алфавиту, сюжеты — по времени начала.
 * Число одновременных слоёв ограничено визуально (см. MAX_ACTIVE_LAYERS);
 * ни раскладка, ни размещение на это число не завязаны.
 *
 * Включённый слой можно перетащить мышью на колонку страны прямо в таблице,
 * а для клавиатуры и доступности то же самое доступно выпадающим списком.
 */
export function LayerMenu({
  activeLayerIds,
  layerState,
  maxLayers,
  countries,
  activeCountryIds,
  placementOf,
  onToggleLayer,
  onRemoveLayer,
  onPlaceLayer,
  onDragLayer,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const groups = groupedLayers();
  const full = activeLayerIds.length >= maxLayers;
  const activeLayers = [...layerState.placed, ...layerState.homeless];

  return (
    <div className="layers" ref={rootRef} data-no-pan>
      <div className="layers__bar">
        <button
          type="button"
          className="layers__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="layers__trigger-icon" aria-hidden="true">
            ▤
          </span>
          Слои
          <span className="layers__counter">
            {activeLayerIds.length}/{maxLayers}
          </span>
          <span className="layers__chevron" aria-hidden="true" data-open={open || undefined}>
            ⌄
          </span>
        </button>

        {activeLayers.length === 0 ? (
          <p className="layers__empty">
            Слой — это отдельный сюжет поверх шкалы: биография, череда эпидемий, история
            технологии. Включите слой и положите его на колонку любой страны.
          </p>
        ) : (
          <div className="layers__active">
            {activeLayers.map((layer) => (
              <ActiveLayerChip
                key={layer.id}
                layer={layer}
                homeless={layerState.homeless.some((item) => item.id === layer.id)}
                unplacedReason={layerState.unplacedReasons[layer.id]}
                placement={placementOf(layer.id)}
                countries={countries}
                activeCountryIds={activeCountryIds}
                onPlace={onPlaceLayer}
                onRemove={onRemoveLayer}
                onDragLayer={onDragLayer}
              />
            ))}
          </div>
        )}
      </div>

      {open ? (
        <div className="layers__menu" role="menu">
          <p className="layers__menu-hint">
            Одновременно можно держать до {maxLayers} слоёв. Включённый слой ляжет на колонку
            своей страны — потом его можно перетащить на любую другую.
          </p>

          {groups.map((group) => (
            <section className="layers__group" key={group.category}>
              <h4 className="layers__group-title">{group.label}</h4>
              <ul className="layers__list">
                {group.layers.map((layer) => {
                  const active = activeLayerIds.includes(layer.id);
                  const blocked = !active && full;

                  return (
                    <li key={layer.id}>
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={active}
                        className="layers__item"
                        data-active={active || undefined}
                        disabled={blocked}
                        title={
                          blocked
                            ? `Уже включено ${maxLayers} слоя — выключите один, чтобы добавить этот`
                            : active
                              ? `Убрать слой «${layer.title}»`
                              : `Показать слой «${layer.title}»`
                        }
                        style={{ '--c': `hsl(${layer.color})` } as React.CSSProperties}
                        onClick={() => onToggleLayer(layer.id)}
                      >
                        <span className="layers__check" aria-hidden="true">
                          {active ? '✓' : '+'}
                        </span>
                        <span className="layers__item-text">
                          <b>{layer.title}</b>
                          <span className="layers__item-sub">
                            {layer.subtitle ?? `с ${layerStartYear(layer)} года`} ·{' '}
                            {layer.items.length} событий
                          </span>
                          <span className="layers__item-note">{layer.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ChipProps = {
  layer: Layer;
  homeless: boolean;
  unplacedReason?: 'hidden-host' | 'full-host';
  placement: LayerPlacement;
  countries: Country[];
  activeCountryIds: string[];
  onPlace: (layerId: string, placement: LayerPlacement) => void;
  onRemove: (layerId: string) => void;
  onDragLayer: (layerId?: string) => void;
};

/** Чип включённого слоя: перетаскивается мышью, дублируется списком для клавиатуры. */
function ActiveLayerChip({
  layer,
  homeless,
  unplacedReason,
  placement,
  countries,
  activeCountryIds,
  onPlace,
  onRemove,
  onDragLayer,
}: ChipProps) {
  const placementLabel =
    placement === OWN_COLUMN
      ? 'своя колонка'
      : (countries.find((country) => country.id === placement)?.label ?? placement);

  return (
    <div
      className="layer-chip"
      data-homeless={homeless || undefined}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/layer', layer.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragLayer(layer.id);
      }}
      onDragEnd={() => onDragLayer(undefined)}
      style={
        {
          '--c': `hsl(${layer.color})`,
          '--c-ink': `hsl(${layer.colorInk})`,
        } as React.CSSProperties
      }
      title="Перетащите на колонку страны в таблице"
    >
      <span className="layer-chip__grip" aria-hidden="true">
        ⠿
      </span>
      <span className="layer-chip__text">
        <b>{layer.title}</b>
        <span className="layer-chip__where">
          {homeless
            ? unplacedReason === 'full-host'
              ? 'в колонке уже три линии — выберите другую'
              : 'страна скрыта — выберите другую'
            : placementLabel}
        </span>
      </span>

      <label className="layer-chip__select">
        <span className="visually-hidden">Куда положить слой «{layer.title}»</span>
        <select
          value={placement}
          onChange={(event) => onPlace(layer.id, event.target.value as LayerPlacement)}
        >
          <option value={OWN_COLUMN}>своя колонка</option>
          {countries
            .filter((country) => activeCountryIds.includes(country.id))
            .map((country) => (
              <option key={country.id} value={country.id}>
                {country.label}
              </option>
            ))}
        </select>
      </label>

      <button
        type="button"
        className="layer-chip__remove"
        onClick={() => onRemove(layer.id)}
        title={`Выключить слой «${layer.title}»`}
      >
        <span aria-hidden="true">×</span>
        <span className="visually-hidden">Выключить слой {layer.title}</span>
      </button>
    </div>
  );
}
