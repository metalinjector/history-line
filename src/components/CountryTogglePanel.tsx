import { useEffect, useId, useRef, useState } from 'react';
import type { Country, CountryId, CountrySet, TimelineColumn } from '../types';
import { countryById, countryRegionLabels } from '../data/countries';
import { sameSet, suggestSetName } from '../data/countrySets';
import './CountryTogglePanel.css';

type Props = {
  countries: Country[];
  activeIds: CountryId[];
  counts: Record<string, number>;
  /** Колонки, которые сейчас делят несколько линий. */
  sharedColumns: TimelineColumn[];
  columnCount: number;
  maxColumns: number;
  maxPerColumn: number;
  onToggle: (id: CountryId) => void;
  onOnly: (id: CountryId) => void;
  /** Встроенные и свои наборы стран в одном списке. */
  countrySets: CountrySet[];
  onApplySet: (ids: CountryId[]) => void;
  onSaveSet: (label: string) => void;
  onRemoveSet: (id: string) => void;
  onMerge: (target: CountryId, source: CountryId) => void;
  onDetach: (id: CountryId) => void;
  onResetColumns: () => void;
};

/**
 * Переключатели стран и раскладка колонок.
 *
 * По умолчанию у каждой страны своя колонка. Через меню на чипе страну можно
 * подселить в колонку соседа — тогда линии делят одну дорожку и различаются
 * цветом точки. Последнюю видимую страну скрыть нельзя.
 */
export function CountryTogglePanel({
  countries,
  activeIds,
  counts,
  sharedColumns,
  columnCount,
  maxColumns,
  maxPerColumn,
  onToggle,
  onOnly,
  countrySets,
  onApplySet,
  onSaveSet,
  onRemoveSet,
  onMerge,
  onDetach,
  onResetColumns,
}: Props) {
  const [openMenu, setOpenMenu] = useState<CountryId | undefined>(undefined);
  const [catalogTab, setCatalogTab] = useState<'selected' | 'modern' | 'historical' | 'all'>('selected');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [savingSet, setSavingSet] = useState(false);
  const [setName, setSetName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const activeSet = new Set(activeIds);
  const query = catalogQuery.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const visibleCatalogCountries = countries.filter((country) => {
    if (catalogTab === 'selected' && !activeSet.has(country.id)) return false;
    if (catalogTab === 'modern' && country.kind !== 'modern') return false;
    if (catalogTab === 'historical' && country.kind !== 'historical') return false;
    if (!query) return true;
    const region = country.region ? countryRegionLabels[country.region] : '';
    const haystack = [country.label, country.short, country.note, region, ...(country.aliases ?? [])]
      .join(' ')
      .toLocaleLowerCase('ru')
      .replaceAll('ё', 'е');
    return haystack.includes(query);
  });

  /**
   * Страна → её соседи по общей колонке, которых читатель подселил сам.
   * Унаследованные дорожки сюда не входят: их нельзя разъединить,
   * они появляются и исчезают вместе со своим наследником.
   */
  const partners = new Map<CountryId, Country[]>();
  for (const column of sharedColumns) {
    const countryTracks = column.tracks.filter((track) => track.countryId && !track.inherited);
    for (const track of countryTracks) {
      partners.set(
        track.countryId!,
        countryTracks
          .filter((other) => other.countryId !== track.countryId)
          .map((other) => countryById[other.countryId!]),
      );
    }
  }

  /** Страна → унаследованные ею древние линии, которые сейчас на шкале. */
  const inheritedBy = new Map<CountryId, Country[]>();
  for (const country of countries) {
    if (!activeSet.has(country.id)) continue;
    const taken = (country.ancestors ?? [])
      .filter((id) => !activeSet.has(id) && countryById[id])
      .map((id) => countryById[id]);
    if (taken.length > 0) inheritedBy.set(country.id, taken);
  }

  // Меню закрывается по клику мимо и по Esc.
  useEffect(() => {
    if (!openMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpenMenu(undefined);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(undefined);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const tooManyColumns = columnCount > maxColumns;

  return (
    <div
      className="country-toggles"
      role="group"
      aria-label="Показать, скрыть и объединить страны"
      ref={panelRef}
    >
      {/*
        Наборы стоят перед каталогом: в каталоге больше сотни линий, и почти
        всегда читателю нужен не поиск конкретной страны, а готовая раскладка.
      */}
      <div className="country-sets">
        <div className="country-sets__list">
          {countrySets.map((set) => {
            const current = sameSet(set.countries, activeIds);
            return (
              <span className="country-set" data-current={current || undefined} key={set.id}>
                <button
                  type="button"
                  className="country-set__main"
                  aria-pressed={current}
                  title={set.note ?? `${set.countries.length} линий`}
                  onClick={() => onApplySet(set.countries)}
                >
                  {set.label}
                  <span className="country-set__count">{set.countries.length}</span>
                </button>
                {set.builtin ? null : (
                  <button
                    type="button"
                    className="country-set__remove"
                    title={`Удалить набор «${set.label}»`}
                    onClick={() => onRemoveSet(set.id)}
                  >
                    <span aria-hidden="true">×</span>
                    <span className="visually-hidden">Удалить набор {set.label}</span>
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {savingSet ? (
          <form
            className="country-sets__form"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveSet(setName.trim() || suggestSetName(activeIds, (id) => countryById[id]?.label ?? id));
              setSavingSet(false);
              setSetName('');
            }}
          >
            <input
              autoFocus
              type="text"
              value={setName}
              placeholder={suggestSetName(activeIds, (id) => countryById[id]?.label ?? id)}
              aria-label="Название набора"
              onChange={(event) => setSetName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSavingSet(false);
                  setSetName('');
                }
              }}
            />
            <button type="submit" className="btn btn--sm btn--primary">
              Сохранить
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => {
                setSavingSet(false);
                setSetName('');
              }}
            >
              Отмена
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="country-sets__add"
            onClick={() => setSavingSet(true)}
            title="Сохранить текущий выбор линий как свой набор"
          >
            <span aria-hidden="true">＋</span>
            Сохранить набор
          </button>
        )}
      </div>

      <div className="country-catalog">
        <div className="country-catalog__tabs" role="tablist" aria-label="Разделы каталога стран">
          {([
            ['selected', `Выбрано · ${activeIds.length}`],
            ['modern', 'Современные страны'],
            ['historical', 'Исторические государства'],
            ['all', `Все · ${countries.length}`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={catalogTab === id}
              className="country-catalog__tab"
              onClick={() => setCatalogTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="country-catalog__search">
          <span className="visually-hidden">Найти страну или историческое государство</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={catalogQuery}
            placeholder="Найти страну, государство или регион"
            onChange={(event) => {
              setCatalogQuery(event.target.value);
              if (event.target.value) setCatalogTab('all');
            }}
          />
        </label>
      </div>

      <div className="country-toggles__list">
        {visibleCatalogCountries.map((country) => {
          const active = activeSet.has(country.id);
          const isLast = active && activeIds.length === 1;
          const columnPartners = partners.get(country.id) ?? [];
          const inherited = inheritedBy.get(country.id) ?? [];
          const menuOpen = openMenu === country.id;

          // Подселить можно только к видимой стране, которая ещё не в этой же колонке
          // и чья колонка не заполнена.
          const mergeTargets = countries.filter((other) => {
            if (other.id === country.id || !activeSet.has(other.id)) return false;
            if (columnPartners.some((partner) => partner.id === other.id)) return false;
            const targetSize = (partners.get(other.id)?.length ?? 0) + 1;
            return targetSize < maxPerColumn;
          });

          return (
            <div
              className="country-chip"
              data-active={active || undefined}
              data-shared={(active && columnPartners.length > 0) || undefined}
              key={country.id}
              style={
                {
                  '--c': `hsl(${country.color})`,
                  '--c-ink': `hsl(${country.colorInk})`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className="country-chip__main"
                aria-pressed={active}
                disabled={isLast}
                title={
                  isLast
                    ? 'Нельзя скрыть последнюю страну'
                    : active
                      ? `Скрыть «${country.label}»`
                      : `Показать «${country.label}»`
                }
                onClick={() => onToggle(country.id)}
              >
                <span className="country-chip__dot" aria-hidden="true" />
                <span className="country-chip__label">{country.label}</span>
                {columnPartners.length > 0 ? (
                  <span className="country-chip__link" title="Делит колонку с соседом">
                    {columnPartners.map((partner) => (
                      <span
                        key={partner.id}
                        className="country-chip__link-dot"
                        style={{ background: `hsl(${partner.color})` }}
                      />
                    ))}
                  </span>
                ) : null}
                <span className="country-chip__count">{counts[country.id] ?? 0}</span>
              </button>

              {inherited.length > 0 ? (
                <span
                  className="country-chip__inherited"
                  title={`Колонка «${country.label}» показывает и древние линии: ${inherited
                    .map((line) => line.label)
                    .join(', ')}. Выберите такую линию отдельно, чтобы вынести её в свою колонку.`}
                >
                  + {inherited.map((line) => line.label).join(', ')}
                </span>
              ) : null}

              <button
                type="button"
                className="country-chip__menu-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? `${menuId}-${country.id}` : undefined}
                title={`Действия с линией «${country.label}»`}
                onClick={() => setOpenMenu(menuOpen ? undefined : country.id)}
              >
                <span aria-hidden="true">⋯</span>
                <span className="visually-hidden">Действия с линией {country.label}</span>
              </button>

              {menuOpen ? (
                <div className="chip-menu" role="menu" id={`${menuId}-${country.id}`}>
                  <p className="chip-menu__title">{country.label}</p>

                  <button
                    type="button"
                    role="menuitem"
                    className="chip-menu__item"
                    onClick={() => {
                      onOnly(country.id);
                      setOpenMenu(undefined);
                    }}
                  >
                    Показать только эту линию
                  </button>

                  {columnPartners.length > 0 ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="chip-menu__item"
                      onClick={() => {
                        onDetach(country.id);
                        setOpenMenu(undefined);
                      }}
                    >
                      Вынести в свою колонку
                      <span className="chip-menu__hint">
                        сейчас вместе с: {columnPartners.map((p) => p.label).join(', ')}
                      </span>
                    </button>
                  ) : null}

                  {active && mergeTargets.length > 0 ? (
                    <>
                      <p className="chip-menu__group">Добавить в колонку страны</p>
                      <div className="chip-menu__targets">
                        {mergeTargets.map((target) => (
                          <button
                            key={target.id}
                            type="button"
                            role="menuitem"
                            className="chip-menu__target"
                            style={{ '--t': `hsl(${target.color})` } as React.CSSProperties}
                            onClick={() => {
                              onMerge(target.id, country.id);
                              setOpenMenu(undefined);
                            }}
                          >
                            <span className="chip-menu__target-dot" aria-hidden="true" />
                            {target.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {visibleCatalogCountries.length === 0 ? (
          <p className="country-catalog__empty">В этом разделе ничего не найдено.</p>
        ) : null}
      </div>

      {sharedColumns.length > 0 ? (
        <div className="country-toggles__actions">
          <button type="button" className="btn btn--sm btn--ghost" onClick={onResetColumns}>
            Разъединить колонки
          </button>
        </div>
      ) : null}

      {tooManyColumns ? (
        <p className="country-toggles__note">
          <span className="country-toggles__note-icon" aria-hidden="true">
            ⇄
          </span>
          <span>
            Сейчас {columnCount} колонок — без прокрутки в поле помещается около {maxColumns}.
            Скройте лишние линии или через меню <b>⋯</b> добавьте страну в колонку соседа: тогда
            линии поделят одну дорожку, а события останутся различимы по цвету точки.
          </span>
        </p>
      ) : null}
    </div>
  );
}
