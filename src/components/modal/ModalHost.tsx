import { useMemo } from 'react';
import type { TimelineState } from '../../lib/useTimelineState';
import { withContent } from '../../data/content';
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
 * Собрана в один ленивый чанк вместе с разбором Markdown, KaTeX, загрузчиком
 * Mermaid и редакционной базой (статьи, источники, трактовки — data/content.ts):
 * пока читатель не открыл ни одной статьи, ничего этого не грузится.
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

  // На шкале у объекта только сводка редакционной базы; окну нужен полный текст.
  const item = useMemo(() => (openedItem ? withContent(openedItem) : undefined), [openedItem]);

  if (openedRelation && openedRelationEnds) {
    return (
      <RelationModal
        relation={openedRelation}
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
