import { use, useMemo } from 'react';
import type { TimelineState } from '../../lib/useTimelineState';
import { loadContent } from '../../data/loadContent';
import { ItemModal } from './ItemModal';
import { DayModal } from './DayModal';
import { RelationModal } from './RelationModal';
import './modal.css';

type Props = {
  state: TimelineState;
};

/**
 * Единая точка входа для всех модальных окон.
 *
 * Собрана в один ленивый чанк вместе с разбором Markdown, KaTeX и загрузчиком
 * Mermaid. Полные тексты базы (data/content.ts) — отдельный, самый тяжёлый
 * чанк: окно ждёт его через `use`, пока снаружи стоит Suspense, — и только
 * когда открыт объект или связь.
 * Одновременно открыто не больше одного окна.
 */
export default function ModalHost({ state }: Props) {
  const {
    openedItem,
    openedCountry,
    openedEra,
    openedDay,
    openedRelation,
    openedRelationEnds,
    openedItemRelations,
    openedContemporaries,
    backToDay,
    neighbours,
    resolveItem,
    notes,
    setNote,
    openItem,
    openDay,
    openRelation,
    closeModals,
    toggleTag,
  } = state;

  // На шкале у объекта только витрина; окну нужен полный текст.
  const content = openedItem || openedRelation ? use(loadContent()) : undefined;
  const item = useMemo(
    () => (openedItem && content ? content.withContent(openedItem) : undefined),
    [openedItem, content],
  );

  if (openedRelation && openedRelationEnds && content) {
    return (
      <RelationModal
        relation={content.withRelationContent(openedRelation)}
        from={openedRelationEnds.from}
        to={openedRelationEnds.to}
        onOpenItem={(item) => openItem(item, { scroll: true })}
        resolveItem={resolveItem}
        onOpenLink={(id) => {
          const target = resolveItem(id);
          if (target) openItem(target, { scroll: true });
        }}
        onClose={closeModals}
      />
    );
  }

  if (item && openedCountry) {
    return (
      <ItemModal
        key={item.id}
        item={item}
        country={openedCountry}
        era={openedEra}
        previous={neighbours.previous}
        next={neighbours.next}
        relations={openedItemRelations}
        contemporaries={openedContemporaries}
        resolveItem={resolveItem}
        backToDay={backToDay}
        onNavigate={openItem}
        onOpenLink={(id) => {
          const target = resolveItem(id);
          if (target) openItem(target, { scroll: true });
        }}
        onOpenRelation={openRelation}
        note={notes[item.id] ?? ''}
        onNoteChange={setNote}
        onBackToDay={openDay}
        onClose={closeModals}
        onTagClick={toggleTag}
      />
    );
  }

  if (openedDay) {
    return (
      <DayModal
        group={openedDay}
        onOpenItem={(item) => openItem(item, { fromDay: openedDay.key })}
        onClose={closeModals}
      />
    );
  }

  return null;
}
