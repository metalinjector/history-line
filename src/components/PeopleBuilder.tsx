import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  CountryId,
  RelationDraftInput,
  SourceKind,
  TimelineItem,
  TimelineItemKind,
} from '../types';
import { countries, countryById } from '../data/countries';
import { suggestedPeople } from '../data/suggestedPeople';
import { suggestRelations } from '../lib/suggestRelations';
import './PeopleBuilder.css';

type Props = {
  addedPeople: TimelineItem[];
  /** Все объекты базы — по ним считаются подсказки связей. */
  allItems: TimelineItem[];
  onAdd: (
    draft: Omit<TimelineItem, 'id' | 'custom'>,
    links?: RelationDraftInput[],
  ) => void;
  onRemove: (id: string) => void;
  onSelect: (item: TimelineItem) => void;
};

const sourceKinds: { value: SourceKind; label: string }[] = [
  { value: 'academic', label: 'Академический' },
  { value: 'archive', label: 'Архив / документ' },
  { value: 'institution', label: 'Музей / учреждение' },
  { value: 'encyclopedia', label: 'Энциклопедия' },
];

function isWebUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function relationIsComplete(relation: RelationDraftInput): boolean {
  const sources = relation.sources ?? [];
  return (
    relation.label.trim().length > 3 &&
    relation.detail.trim().length >= 20 &&
    sources.length >= 2 &&
    sources.every((source) => source.label.trim().length > 1 && isWebUrl(source.url)) &&
    sources.some((source) => source.kind !== 'encyclopedia')
  );
}

const principles = [
  {
    title: 'Страна — это линия, а не паспорт',
    text: 'Выбирайте ту колонку, чью историю человек объясняет. Скорина работал в Праге и Вильне, но объясняет линию Беларуси. Мария Кюри родилась в Варшаве, а её открытия — часть французской науки.',
  },
  {
    title: 'Год — это действие, а не рождение',
    text: 'Ставьте год ключевого поступка: публикации книги, прихода к власти, реформы, открытия, премии. Так деятель встаёт рядом с событиями, которые он объясняет, а не в случайную строку.',
  },
  {
    title: 'Событие отвечает «что», деятель — «через кого»',
    text: 'Событие — это то, что произошло: битва, договор, революция. Деятель — это оптика: человек, через которого удобно понять процесс. Одна и та же эпоха обычно требует и того, и другого.',
  },
];

const emptyDraft = {
  title: '',
  country: 'germany' as CountryId,
  year: 1500,
  kind: 'person' as TimelineItemKind,
  summary: '',
  detail: '',
  life: '',
  tags: '',
};

export function PeopleBuilder({ addedPeople, allItems, onAdd, onRemove, onSelect }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [chosenLinks, setChosenLinks] = useState<Record<string, RelationDraftInput>>({});

  const draftTags = useMemo(
    () => draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [draft.tags],
  );

  /**
   * Потенциальные исторические связи считаются сразу при вводе — до сохранения.
   * Это подсказка, а не автоматическое создание связи: причинность
   * подтверждает человек, см. docs/AI-CONTRIBUTING.md.
   */
  const candidates = useMemo(
    () =>
      suggestRelations({ country: draft.country, year: Number(draft.year) || 1, tags: draftTags }, allItems),
    [allItems, draft.country, draft.year, draftTags],
  );

  // Подсказки зависят от страны, года и тегов. Если пользователь изменил черновик,
  // связи с исчезнувшими кандидатами не должны тихо сохраниться в localStorage.
  useEffect(() => {
    const available = new Set(candidates.map((candidate) => candidate.item.id));
    setChosenLinks((current) => {
      const entries = Object.entries(current).filter(([id]) => available.has(id));
      return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
    });
  }, [candidates]);

  /** Подсказки, которые уже стоят на шкале, помечаются как добавленные. */
  const addedKeys = useMemo(
    () => new Set(addedPeople.map((item) => `${item.title}|${item.year}`)),
    [addedPeople],
  );

  const selectedRelations = Object.values(chosenLinks);
  const canSubmit =
    draft.title.trim().length > 1 &&
    draft.summary.trim().length > 1 &&
    selectedRelations.every(relationIsComplete);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onAdd(
      {
      country: draft.country,
      year: Number(draft.year) || 1,
      kind: draft.kind,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      detail: draft.detail.trim() || draft.summary.trim(),
      life: draft.kind === 'person' && draft.life.trim() ? draft.life.trim() : undefined,
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      importance: 2,
      },
      selectedRelations,
    );
    setDraft({ ...emptyDraft, country: draft.country });
    setChosenLinks({});
    setFormOpen(false);
  };

  return (
    <section className="builder" id="builder">
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
            <motion.article
              className="builder__principle panel"
              key={principle.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="builder__principle-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
            </motion.article>
          ))}
        </div>

        <div className="builder__toolbar">
          <h3 className="builder__subtitle">Готовые карточки</h3>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setFormOpen((value) => !value)}
            aria-expanded={formOpen}
          >
            <span aria-hidden="true">{formOpen ? '−' : '+'}</span>
            Свой объект
          </button>
        </div>

        <AnimatePresence initial={false}>
          {formOpen ? (
            <motion.form
              className="builder__form panel"
              onSubmit={submit}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="builder__form-inner">
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
                    min={1}
                    max={2100}
                    value={draft.year}
                    onChange={(event) => setDraft({ ...draft, year: Number(event.target.value) })}
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

                <label className="field field--full">
                  <span>Теги через запятую</span>
                  <input
                    value={draft.tags}
                    onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                    placeholder="наука, астрономия"
                  />
                </label>

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
                                    <option value="exchange">Перекличка / обмен</option>
                                    <option value="conflict">Противостояние</option>
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
                    Добавить в хронологию
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFormOpen(false)}>
                    Отмена
                  </button>
                </div>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <div className="builder__grid">
          {suggestedPeople.map((suggestion, index) => {
            const country = countryById[suggestion.item.country];
            const added = addedKeys.has(`${suggestion.item.title}|${suggestion.item.year}`);

            return (
              <motion.article
                key={suggestion.id}
                className="suggestion panel"
                style={
                  {
                    '--c': `hsl(${country.color})`,
                    '--c-ink': `hsl(${country.colorInk})`,
                  } as React.CSSProperties
                }
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
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
              </motion.article>
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
                    <b>{item.year}</b>
                    {item.title}
                    <span className="builder__added-country">{countryById[item.country].short}</span>
                  </button>
                  <button
                    type="button"
                    className="builder__added-remove"
                    onClick={() => onRemove(item.id)}
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
