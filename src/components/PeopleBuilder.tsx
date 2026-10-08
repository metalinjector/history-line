import { useMemo, useRef, useState } from 'react';
import type {
  CountryId,
  Relation,
  RelationDraftInput,
  SourceKind,
  TimelineItem,
  TimelineItemKind,
} from '../types';
import { countries, countryById } from '../data/countries';
import { suggestedPeople } from '../data/suggestedPeople';
import { suggestRelations, type RelationCandidate } from '../lib/suggestRelations';
import { buildCustomExport, parseCustomImport, relationIsComplete, type CustomImport } from '../lib/customObjects';
import { formatYearLabel, plural } from '../lib/format';
import { useReveal } from '../lib/useReveal';
import './PeopleBuilder.css';

type ItemDraft = Omit<TimelineItem, 'id' | 'custom'>;

type Props = {
  addedPeople: TimelineItem[];
  /** Связи, которые читатель провёл от своих объектов. */
  addedRelations: Relation[];
  /** Все объекты базы — по ним считаются подсказки связей. */
  allItems: TimelineItem[];
  /** Линии, которые сейчас на шкале: после импорта предлагается включить недостающие. */
  activeCountryIds: CountryId[];
  onAdd: (draft: ItemDraft, links?: RelationDraftInput[]) => void;
  onUpdate: (id: string, draft: ItemDraft, links?: RelationDraftInput[]) => void;
  onImport: (items: TimelineItem[], relations: Relation[]) => void;
  onShowCountries: (ids: CountryId[]) => void;
  onRemove: (id: string) => void;
  onSelect: (item: TimelineItem) => void;
};

type ImportReport = CustomImport & { hiddenCountries: CountryId[] };

const sourceKinds: { value: SourceKind; label: string }[] = [
  { value: 'academic', label: 'Академический' },
  { value: 'archive', label: 'Архив / документ' },
  { value: 'institution', label: 'Музей / учреждение' },
  { value: 'encyclopedia', label: 'Энциклопедия' },
];

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const principles = [
  {
    title: 'Страна — это линия, а не паспорт',
    text: 'Выбирайте ту линию, чью историю человек объясняет. Скорина работал в Праге и Вильне, но объясняет линию Беларуси. Мария Кюри родилась в Варшаве, а её открытия — часть французской науки.',
  },
  {
    title: 'Год — это действие, а не рождение',
    text: 'Ставьте год ключевого поступка: публикации книги, прихода к власти, реформы, открытия, премии. Так деятель встаёт рядом с событиями, которые он объясняет, а не в случайное место шкалы.',
  },
  {
    title: 'Событие отвечает «что», деятель — «через кого»',
    text: 'Событие — это то, что произошло: битва, договор, революция. Деятель — это оптика: человек, через которого удобно понять процесс. Одна и та же эпоха обычно требует и того, и другого.',
  },
];

const CURRENT_YEAR = new Date().getFullYear();

const emptyDraft = {
  title: '',
  country: 'germany' as CountryId,
  year: 1500,
  /** Год окончания процесса; пустая строка — объект без длительности. */
  endYear: '' as number | '',
  kind: 'person' as TimelineItemKind,
  summary: '',
  detail: '',
  life: '',
  tags: '',
  milestone: false,
};

type Draft = typeof emptyDraft;

function draftOf(item: TimelineItem): Draft {
  return {
    title: item.title,
    country: item.country,
    year: item.year,
    endYear: item.endYear ?? '',
    kind: item.kind,
    summary: item.summary,
    detail: !item.detail || item.detail === item.summary ? '' : item.detail,
    life: item.life ?? '',
    tags: item.tags.join(', '),
    milestone: (item.importance ?? 2) >= 3,
  };
}

export function PeopleBuilder({
  addedPeople,
  addedRelations,
  allItems,
  activeCountryIds,
  onAdd,
  onUpdate,
  onImport,
  onShowCountries,
  onRemove,
  onSelect,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  /** Объект, который сейчас правится; без него форма добавляет новый. */
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState(emptyDraft);
  const [chosenLinks, setChosenLinks] = useState<Record<string, RelationDraftInput>>({});
  const [report, setReport] = useState<ImportReport>();
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useReveal(sectionRef);

  const draftTags = useMemo(
    () => draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [draft.tags],
  );

  const itemsById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);
  const chosenKey = Object.keys(chosenLinks).join('|');

  /**
   * Потенциальные исторические связи считаются сразу при вводе — до сохранения.
   * Это подсказка, а не автоматическое создание связи: причинность
   * подтверждает человек, см. docs/AI-CONTRIBUTING.md. Уже отмеченные связи
   * остаются в списке, даже если после правки года или тегов перестали
   * быть подсказкой: молча их не теряем и молча не сохраняем.
   */
  const candidates = useMemo(() => {
    const suggested = suggestRelations(
      { id: editingId, country: draft.country, year: Number(draft.year) || 1, tags: draftTags },
      allItems,
    );
    const shown = new Set(suggested.map((candidate) => candidate.item.id));
    const kept = chosenKey
      .split('|')
      .filter((id) => id && !shown.has(id))
      .flatMap((id): RelationCandidate[] => {
        const item = itemsById.get(id);
        return item ? [{ item, score: 0, reasons: ['отмечено раньше'], sharedTags: [] }] : [];
      });
    return [...suggested, ...kept];
  }, [allItems, chosenKey, draft.country, draft.year, draftTags, editingId, itemsById]);

  /** Подсказки, которые уже стоят на шкале, помечаются как добавленные. */
  const addedKeys = useMemo(
    () => new Set(addedPeople.map((item) => `${item.title}|${item.year}`)),
    [addedPeople],
  );

  const year = Number(draft.year);
  const yearValid = Number.isInteger(year) && year !== 0 && year >= -3_500_000 && year <= CURRENT_YEAR;
  const endYearValid =
    draft.endYear === '' || (Number.isInteger(draft.endYear) && draft.endYear >= year && draft.endYear <= CURRENT_YEAR);

  const selectedRelations = Object.values(chosenLinks);
  const canSubmit =
    draft.title.trim().length > 1 &&
    draft.summary.trim().length > 1 &&
    yearValid &&
    endYearValid &&
    selectedRelations.every(relationIsComplete);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(undefined);
    setDraft((current) => ({ ...emptyDraft, country: current.country }));
    setChosenLinks({});
  };

  const startEdit = (item: TimelineItem) => {
    setEditingId(item.id);
    setDraft(draftOf(item));
    setChosenLinks(
      Object.fromEntries(
        addedRelations
          .filter((relation) => relation.from === item.id && itemsById.has(relation.to))
          .map((relation) => [
            relation.to,
            { to: relation.to, kind: relation.kind, label: relation.label, detail: relation.detail ?? '', sources: relation.sources },
          ]),
      ),
    );
    setFormOpen(true);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const item: ItemDraft = {
      country: draft.country,
      year,
      ...(draft.endYear !== '' && draft.endYear > year ? { endYear: draft.endYear } : {}),
      kind: draft.kind,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      detail: draft.detail.trim() || draft.summary.trim(),
      life: draft.kind === 'person' && draft.life.trim() ? draft.life.trim() : undefined,
      tags: draftTags,
      importance: draft.milestone ? 3 : 2,
    };
    if (editingId) onUpdate(editingId, item, selectedRelations);
    else onAdd(item, selectedRelations);
    closeForm();
  };

  const importFile = async (file: File) => {
    const imported = parseCustomImport(await file.text(), {
      knownIds: new Set(allItems.filter((item) => !item.custom).map((item) => item.id)),
      customIds: new Set(addedPeople.map((item) => item.id)),
    });
    if (imported.items.length > 0) onImport(imported.items, imported.relations);
    const hiddenCountries = Array.from(new Set(imported.items.map((item) => item.country))).filter(
      (id) => !activeCountryIds.includes(id),
    );
    setReport({ ...imported, hiddenCountries });
  };

  return (
    <section className="builder" id="builder" ref={sectionRef}>
      <div className="shell">
        <header className="builder__head">
          <div>
            <p className="eyebrow">Конструктор персоналий</p>
            <h2 className="builder__title">Добавьте своего деятеля на шкалу</h2>
          </div>
          <p className="builder__lede lede">
            Хронология рассчитана на рост. Ниже — правила, по которым мы ставим людей на шкалу, готовые
            карточки в один клик и форма для собственного объекта. Добавленное сразу появится в таблице и
            сохранится в браузере.
          </p>
        </header>

        <div className="builder__principles">
          {principles.map((principle, index) => (
            <article
              className="builder__principle panel"
              key={principle.title}
              data-reveal
              style={{ '--reveal-delay': `${index * 80}ms` } as React.CSSProperties}
            >
              <span className="builder__principle-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
            </article>
          ))}
        </div>

        <div className="builder__toolbar">
          <h3 className="builder__subtitle">Готовые карточки</h3>
          <div className="builder__toolbar-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => fileRef.current?.click()}
              title="Добавить объекты и связи из файла, сохранённого кнопкой «Экспорт»"
            >
              <span aria-hidden="true">↑</span> Импорт
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={addedPeople.length === 0}
              onClick={() =>
                downloadJson(buildCustomExport(addedPeople, addedRelations), 'history-line-objects.json')
              }
              title="Сохранить свои объекты и связи в JSON-файл"
            >
              <span aria-hidden="true">↓</span> Экспорт
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void importFile(file);
              }}
            />
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => (formOpen ? closeForm() : setFormOpen(true))}
              aria-expanded={formOpen}
            >
              <span aria-hidden="true">{formOpen ? '−' : '+'}</span>
              Свой объект
            </button>
          </div>
        </div>

        {report ? (
          <div className="builder__report panel" role="status">
            <p>
              {report.items.length > 0
                ? `Добавлено: ${report.items.length} ${plural(report.items.length, ['объект', 'объекта', 'объектов'])}` +
                  (report.relations.length > 0
                    ? `, ${report.relations.length} ${plural(report.relations.length, ['связь', 'связи', 'связей'])}`
                    : '') +
                  '.'
                : 'Новых объектов в файле нет.'}
              {report.duplicates > 0 ? ` Уже были на шкале: ${report.duplicates}.` : ''}
            </p>
            {report.hiddenCountries.length > 0 ? (
              <p>
                Линии новых объектов сейчас скрыты:{' '}
                {report.hiddenCountries.map((id) => countryById[id].label).join(', ')}.{' '}
                <button
                  type="button"
                  className="builder__report-action"
                  onClick={() => {
                    onShowCountries(report.hiddenCountries);
                    setReport({ ...report, hiddenCountries: [] });
                  }}
                >
                  Показать их
                </button>
              </p>
            ) : null}
            {report.skipped.length > 0 ? (
              <>
                <p>Не принято:</p>
                <ul>
                  {report.skipped.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <button
              type="button"
              className="builder__report-close"
              onClick={() => setReport(undefined)}
              title="Скрыть отчёт"
            >
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Скрыть отчёт об импорте</span>
            </button>
          </div>
        ) : null}

        {formOpen ? (
          <form className="builder__form panel" onSubmit={submit} ref={formRef}>
            <div className="builder__form-inner">
              {editingId ? (
                <p className="builder__form-title field--full">
                  Правка объекта: <b>{addedPeople.find((item) => item.id === editingId)?.title}</b>
                </p>
              ) : null}

              <label className="field field--wide">
                <span>Заголовок</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Например: Николай Коперник"
                  required
                />
              </label>

              <label className="field">
                <span>Страна</span>
                <select
                  value={draft.country}
                  onChange={(event) => setDraft({ ...draft, country: event.target.value as CountryId })}
                >
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--narrow">
                <span>Год действия</span>
                <input
                  type="number"
                  min={-3_500_000}
                  max={CURRENT_YEAR}
                  step={1}
                  value={draft.year}
                  aria-invalid={!yearValid || undefined}
                  title="Минус — до нашей эры: −500 значит 500 год до н. э."
                  onChange={(event) => setDraft({ ...draft, year: Number(event.target.value) })}
                />
              </label>

              <label className="field field--narrow">
                <span>Год окончания</span>
                <input
                  type="number"
                  min={-3_500_000}
                  max={CURRENT_YEAR}
                  step={1}
                  value={draft.endYear}
                  placeholder="если это процесс"
                  aria-invalid={!endYearValid || undefined}
                  onChange={(event) =>
                    setDraft({ ...draft, endYear: event.target.value === '' ? '' : Number(event.target.value) })
                  }
                />
              </label>

              <label className="field field--narrow">
                <span>Тип</span>
                <select
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft({ ...draft, kind: event.target.value as TimelineItemKind })
                  }
                >
                  <option value="person">Деятель</option>
                  <option value="event">Событие</option>
                </select>
              </label>

              {draft.kind === 'person' ? (
                <label className="field">
                  <span>Годы жизни</span>
                  <input
                    value={draft.life}
                    onChange={(event) => setDraft({ ...draft, life: event.target.value })}
                    placeholder="1473–1543"
                  />
                </label>
              ) : null}

              <label className="field field--wide">
                <span>Кратко — одно предложение</span>
                <input
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                  placeholder="Что произошло или что сделал человек"
                  required
                />
              </label>

              <label className="field field--full">
                <span>Подробно — 2–4 предложения</span>
                <textarea
                  rows={3}
                  value={draft.detail}
                  onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
                  placeholder="Что произошло, почему это важно и как связано с историей соседних стран"
                />
              </label>

              <label className="field field--wide">
                <span>Теги через запятую</span>
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                  placeholder="наука, астрономия"
                />
              </label>

              <label className="field field--check field--wide">
                <input
                  type="checkbox"
                  checked={draft.milestone}
                  onChange={(event) => setDraft({ ...draft, milestone: event.target.checked })}
                />
                <span>Опорная веха эпохи — карточка получит звезду</span>
              </label>

              {!yearValid || !endYearValid ? (
                <p className="builder__form-error field--full" role="alert">
                  {!yearValid
                    ? `Год — целое число от −3 500 000 до ${CURRENT_YEAR}, без нулевого: минус означает «до н. э.».`
                    : 'Год окончания не может быть раньше года действия или позже текущего года.'}
                </p>
              ) : null}

              {candidates.length > 0 ? (
                <div className="field field--full">
                  <span>
                    Возможные связи — отметьте те, что действительно есть
                  </span>
                  <ul className="links">
                    {candidates.map((candidate) => {
                      const active = Boolean(chosenLinks[candidate.item.id]);
                      const relation = chosenLinks[candidate.item.id];
                      const country = countryById[candidate.item.country];
                      return (
                        <li key={candidate.item.id}>
                          <button
                            type="button"
                            className="links__item"
                            data-active={active || undefined}
                            aria-pressed={active}
                            style={{ '--c': `hsl(${country.color})` } as React.CSSProperties}
                            onClick={() =>
                              setChosenLinks((current) =>
                                active
                                  ? Object.fromEntries(
                                      Object.entries(current).filter(([id]) => id !== candidate.item.id),
                                    )
                                  : {
                                      ...current,
                                      [candidate.item.id]: {
                                        to: candidate.item.id,
                                        kind: 'influence',
                                        label: `${draft.title.trim() || 'Новый объект'} — ${candidate.item.title}`,
                                        detail: '',
                                        sources: [
                                          { label: '', url: '', kind: 'academic' },
                                          { label: '', url: '', kind: 'institution' },
                                        ],
                                      },
                                    },
                              )
                            }
                          >
                            <span className="links__check" aria-hidden="true">
                              {active ? '✓' : '+'}
                            </span>
                            <span className="links__text">
                              <b>
                                {candidate.item.year} · {candidate.item.title}
                              </b>
                              <span className="links__why">
                                {country.label} · {candidate.reasons.join(' · ')}
                              </span>
                            </span>
                          </button>
                          {relation ? (
                            <div className="links__editor">
                              <label>
                                <span>Характер связи</span>
                                <select
                                  value={relation.kind}
                                  onChange={(event) =>
                                    setChosenLinks((current) => ({
                                      ...current,
                                      [candidate.item.id]: {
                                        ...relation,
                                        kind: event.target.value as RelationDraftInput['kind'],
                                      },
                                    }))
                                  }
                                >
                                  <option value="influence">Влияние</option>
                                  <option value="exchange">Обмен</option>
                                  <option value="conflict">Противостояние</option>
                                  <option value="comparison">Сопоставление без причинности</option>
                                  <option value="context">Общий исторический контекст</option>
                                </select>
                              </label>
                              <label>
                                <span>Короткая формулировка</span>
                                <input
                                  value={relation.label}
                                  onChange={(event) =>
                                    setChosenLinks((current) => ({
                                      ...current,
                                      [candidate.item.id]: { ...relation, label: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="links__editor-wide">
                                <span>Что именно связывает объекты</span>
                                <textarea
                                  rows={3}
                                  minLength={20}
                                  value={relation.detail}
                                  placeholder="Опишите механизм, направление и исторический контекст связи"
                                  onChange={(event) =>
                                    setChosenLinks((current) => ({
                                      ...current,
                                      [candidate.item.id]: { ...relation, detail: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              {(relation.sources ?? []).map((source, sourceIndex) => (
                                <fieldset className="links__source" key={sourceIndex}>
                                  <legend>Источник {sourceIndex + 1}</legend>
                                  <input
                                    aria-label={`Название источника ${sourceIndex + 1}`}
                                    placeholder="Название публикации"
                                    value={source.label}
                                    onChange={(event) => {
                                      const sources = [...(relation.sources ?? [])];
                                      sources[sourceIndex] = { ...source, label: event.target.value };
                                      setChosenLinks((current) => ({
                                        ...current,
                                        [candidate.item.id]: { ...relation, sources },
                                      }));
                                    }}
                                  />
                                  <input
                                    type="url"
                                    aria-label={`URL источника ${sourceIndex + 1}`}
                                    placeholder="https://…"
                                    value={source.url}
                                    onChange={(event) => {
                                      const sources = [...(relation.sources ?? [])];
                                      sources[sourceIndex] = { ...source, url: event.target.value };
                                      setChosenLinks((current) => ({
                                        ...current,
                                        [candidate.item.id]: { ...relation, sources },
                                      }));
                                    }}
                                  />
                                  <select
                                    aria-label={`Тип источника ${sourceIndex + 1}`}
                                    value={source.kind}
                                    onChange={(event) => {
                                      const sources = [...(relation.sources ?? [])];
                                      sources[sourceIndex] = {
                                        ...source,
                                        kind: event.target.value as SourceKind,
                                      };
                                      setChosenLinks((current) => ({
                                        ...current,
                                        [candidate.item.id]: { ...relation, sources },
                                      }));
                                    }}
                                  >
                                    {sourceKinds.map((kind) => (
                                      <option key={kind.value} value={kind.value}>{kind.label}</option>
                                    ))}
                                  </select>
                                </fieldset>
                              ))}
                              <p className="links__requirement" data-valid={relationIsComplete(relation) || undefined}>
                                {relationIsComplete(relation)
                                  ? '✓ Связь готова к сохранению'
                                  : 'Нужны объяснение (от 20 знаков) и два URL-источника; хотя бы один — не энциклопедия.'}
                              </p>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="builder__form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={!canSubmit}>
                  {editingId ? 'Сохранить изменения' : 'Добавить в хронологию'}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeForm}>
                  Отмена
                </button>
              </div>
            </div>
          </form>
        ) : null}

        <div className="builder__grid">
          {suggestedPeople.map((suggestion, index) => {
            const country = countryById[suggestion.item.country];
            const added = addedKeys.has(`${suggestion.item.title}|${suggestion.item.year}`);

            return (
              <article
                key={suggestion.id}
                className="suggestion panel"
                data-reveal
                style={
                  {
                    '--c': `hsl(${country.color})`,
                    '--c-ink': `hsl(${country.colorInk})`,
                    '--reveal-delay': `${(index % 4) * 60}ms`,
                  } as React.CSSProperties
                }
              >
                <div className="suggestion__top">
                  <span className="suggestion__country">
                    <span className="suggestion__dot" aria-hidden="true" />
                    {country.label}
                  </span>
                  <span className="suggestion__year">{suggestion.item.year}</span>
                </div>

                <h4 className="suggestion__title">{suggestion.item.title}</h4>
                <p className="suggestion__summary">{suggestion.item.summary}</p>

                <p className="suggestion__why">
                  <span>Почему этот год</span>
                  {suggestion.why}
                </p>

                <button
                  type="button"
                  className="btn btn--sm suggestion__add"
                  disabled={added}
                  onClick={() => onAdd(suggestion.item)}
                >
                  {added ? '✓ уже на шкале' : 'Добавить на шкалу'}
                </button>
              </article>
            );
          })}
        </div>

        {addedPeople.length > 0 ? (
          <div className="builder__added">
            <h3 className="builder__subtitle">Ваши объекты на шкале</h3>
            <ul className="builder__added-list">
              {addedPeople.map((item) => (
                <li key={item.id}>
                  <button type="button" className="builder__added-item" onClick={() => onSelect(item)}>
                    <span
                      className="builder__added-dot"
                      style={{ background: `hsl(${countryById[item.country].color})` }}
                      aria-hidden="true"
                    />
                    <b>{formatYearLabel(item.year)}</b>
                    {item.title}
                    <span className="builder__added-country">{countryById[item.country].short}</span>
                  </button>
                  <button
                    type="button"
                    className="builder__added-edit"
                    onClick={() => startEdit(item)}
                    title={`Изменить «${item.title}»`}
                  >
                    <span aria-hidden="true">✎</span>
                    <span className="visually-hidden">Изменить {item.title}</span>
                  </button>
                  <button
                    type="button"
                    className="builder__added-remove"
                    onClick={() => {
                      if (item.id === editingId) closeForm();
                      onRemove(item.id);
                    }}
                    title={`Убрать «${item.title}» со шкалы`}
                  >
                    <span aria-hidden="true">×</span>
                    <span className="visually-hidden">Убрать {item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
