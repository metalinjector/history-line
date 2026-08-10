import type { TimelineState } from '../../lib/useTimelineState';
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
 * Mermaid: пока читатель не открыл ни одной статьи, ничего этого не грузится.
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

  if (openedItem && openedCountry) {
    return (
      <ItemModal
        key={openedItem.id}
        item={openedItem}
        country={openedCountry}
        era={openedEra}
        previous={neighbours.previous}
        next={neighbours.next}
        relations={openedItemRelations}
        resolveItem={resolveItem}
        backToDay={backToDay}
        onNavigate={openItem}
        onOpenLink={(id) => {
          const target = resolveItem(id);
          if (target) openItem(target, { scroll: true });
        }}
        onOpenRelation={openRelation}
        note={notes[openedItem.id] ?? ''}
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
