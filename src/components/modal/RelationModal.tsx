import type { Relation, TimelineItem } from '../../types';
import { countryById } from '../../data/countries';
import { formatItemDate } from '../../lib/format';
import { resolveWikiLinks, sourceKindLabel } from '../../lib/markdown';
import { isRelationVerified } from '../../lib/provenance';
import { Modal, ModalClose } from './Modal';
import { MarkdownView } from './MarkdownView';

type Props = {
  relation: Relation;
  from: TimelineItem;
  to: TimelineItem;
  onOpenItem: (item: TimelineItem) => void;
  resolveItem: (id: string) => TimelineItem | undefined;
  onOpenLink: (id: string) => void;
  onClose: () => void;
};

const kindLabels: Record<Relation['kind'], string> = {
  influence: 'влияние',
  conflict: 'противостояние',
  exchange: 'перекличка',
};

/**
 * Окно связи между двумя объектами: что на что повлияло и как.
 * Открывается кликом по нити на хронологии.
 */
export function RelationModal({ relation, from, to, onOpenItem, resolveItem, onOpenLink, onClose }: Props) {
  const fromCountry = countryById[from.country];
  const toCountry = countryById[to.country];
  const verified = isRelationVerified(relation);

  return (
    <Modal labelledBy="relation-modal-title" onClose={onClose}>
      <header className="modal__head">
        <div className="modal__meta">
          <span className="modal__kind">Связь · {kindLabels[relation.kind]}</span>
          <span className="modal__provenance" data-verified={verified || undefined}>
            {verified ? '✓ проверено' : '△ редакционный черновик'}
          </span>
        </div>
        <ModalClose />
      </header>

      <div className="modal__title-block">
        <h2 className="modal__title" id="relation-modal-title">
          {relation.label}
        </h2>

        <div className="relation__ends">
          {[
            { item: from, country: fromCountry, role: 'Источник' },
            { item: to, country: toCountry, role: 'Следствие' },
          ].map(({ item, country, role }, index) => (
            <div key={item.id} className="relation__end-wrap">
              {index === 1 ? (
                <span className="relation__arrow" aria-hidden="true">
                  {relation.kind === 'exchange' ? '↔' : '→'}
                </span>
              ) : null}
              <button
                type="button"
                className="relation__end"
                style={
                  {
                    '--c': `hsl(${country.color})`,
                    '--c-ink': `hsl(${country.colorInk})`,
                  } as React.CSSProperties
                }
                onClick={() => onOpenItem(item)}
                title={`Открыть «${item.title}»`}
              >
                <span className="relation__end-role">{role}</span>
                <span className="relation__end-country">
                  <span className="relation__end-dot" aria-hidden="true" />
                  {country.label} · {formatItemDate(item)}
                </span>
                <span className="relation__end-title">{item.title}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="modal__body md">
        {!verified ? (
          <aside className="provenance-warning">
            <b>Источники связи ещё не верифицированы.</b>
            <span>
              Объяснение сохранено как редакционная гипотеза: для статуса «проверено» нужны два
              независимых источника, включая хотя бы один неэнциклопедический.
            </span>
          </aside>
        ) : null}
        <MarkdownView onOpenItem={onOpenLink}>
          {resolveWikiLinks(relation.detail.trim(), resolveItem)}
        </MarkdownView>

        {relation.sources?.length ? (
          <section className="relation-sources">
            <h3>Источники связи</h3>
            <ul>
              {relation.sources.map((source, index) => (
                <li key={`${source.label}-${index}`}>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                  ) : (
                    <span>{source.label}</span>
                  )}
                  <small>{sourceKindLabel(source.kind)}</small>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
