import { useMemo, useRef, useState } from 'react';
import type { TimelineGroup } from '../types';
import { nearestGroupIndex, parseYearQuery } from '../lib/yearQuery';
import './TimelineNavigator.css';

type Props = {
  groups: TimelineGroup[];
  /** Группы, видимые сейчас в поле, — без запаса виртуализации. */
  visible: { startIndex: number; endIndex: number } | null;
  /** Группа выбранной карточки. */
  selectedIndex?: number;
  showBce: boolean;
  /** Прыжок к группе с доводкой прокрутки. */
  onJump: (index: number, align: 'start' | 'center') => void;
  /** Прыжок к году из поля: группа встаёт в начало поля и подсвечивается. */
  onGoTo: (index: number) => void;
  /** Быстрая прокрутка без доводки — пока читатель тащит окно по мини-карте. */
  onScrub: (index: number) => void;
};

/**
 * Навигация по всей шкале: поле «к году» и мини-карта.
 *
 * Мини-карта — полоса во всю ширину, где каждой группе (году, месяцу или дню
 * с отметками) отведена равная доля. Так её окно точно соответствует
 * прокрутке шкалы, которая тоже идёт по группам, а не по годам: три миллиона
 * лет предыстории занимают на ней столько же места, сколько отметок в них есть.
 * Высота столбика — сколько объектов в группе, акцентная шапка — веха,
 * фоном — эпохи. Клик и перетаскивание прокручивают шкалу, клавиши
 * ←/→ шагают, PageUp/PageDown — по эпохам, Home/End — к краям.
 */
export function TimelineNavigator({ groups, visible, selectedIndex, showBce, onJump, onGoTo, onScrub }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [hover, setHover] = useState<number>();
  const mapRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef<number | undefined>(undefined);

  const count = groups.length;

  const map = useMemo(() => {
    const max = groups.reduce((value, group) => Math.max(value, group.items.length), 1);
    let bars = '';
    let milestones = '';
    groups.forEach((group, index) => {
      // Корень сглаживает выбросы: год с двадцатью событиями не превращает
      // остальные столбики в пыль.
      const height = Math.max(10, Math.round(Math.sqrt(group.items.length / max) * 100));
      bars += `M${index} 100V${100 - height}h1V100Z`;
      // Веха — акцентная «шапка» поверх столбика: плотность читается по-прежнему.
      if (group.weight >= 3) milestones += `M${index} ${100 - height}h1v10h-1Z`;
    });

    const eras: { id: string; label: string; start: number; end: number }[] = [];
    groups.forEach((group, index) => {
      const last = eras.at(-1);
      if (last?.id === group.era.id) last.end = index + 1;
      else eras.push({ id: group.era.id, label: group.era.label, start: index, end: index + 1 });
    });

    return { bars, milestones, eras };
  }, [groups]);

  if (count === 0) return null;

  const share = (index: number) => `${(index / count) * 100}%`;
  const groupLabel = (group: TimelineGroup) => (group.sublabel ? `${group.label} ${group.sublabel}` : group.label);

  const indexAt = (clientX: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const position = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(count - 1, Math.floor(position * count));
  };

  const start = Math.min(visible?.startIndex ?? 0, count - 1);
  const end = Math.min(Math.max(visible?.endIndex ?? start, start), count - 1);

  const goToYear = (event: React.FormEvent) => {
    event.preventDefault();
    const span = parseYearQuery(query);
    if (!span) {
      setStatus('Не понял год. Например: 1812, 500 до н. э., XVII век, 3 млн');
      return;
    }
    const index = nearestGroupIndex(groups, span);
    const found = groups[index];
    onGoTo(index);
    if (found.year >= span.from && found.year <= span.to) setStatus('');
    else if (span.to < 0 && !showBce) setStatus(`Даты до н. э. скрыты. Ближайшая отметка — ${groupLabel(found)}`);
    else setStatus(`В выборке нет «${query.trim()}». Ближайшая отметка — ${groupLabel(found)}`);
  };

  const handleKey = (event: React.KeyboardEvent) => {
    const step = Math.max(1, Math.round(count / 40));
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = start + step;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = start - step;
        break;
      case 'PageDown':
        next = map.eras.find((era) => era.start > start)?.start ?? count - 1;
        break;
      case 'PageUp':
        next = map.eras.findLast((era) => era.start < start)?.start ?? 0;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
    }
    if (next === undefined) return;
    event.preventDefault();
    setStatus('');
    onJump(Math.min(count - 1, Math.max(0, next)), 'start');
  };

  const current = groups[start];

  return (
    <div className="navigator" data-no-pan>
      <form className="navigator__year" onSubmit={goToYear} role="search" aria-label="Переход к году">
        <label className="navigator__year-label" htmlFor="navigator-year">
          К году
        </label>
        <input
          id="navigator-year"
          className="navigator__input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setStatus('');
          }}
          placeholder="1812, XVII век…"
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby="navigator-status"
        />
        <button type="submit" className="navigator__go" disabled={!query.trim()}>
          <span aria-hidden="true">→</span>
          <span className="visually-hidden">Перейти</span>
        </button>
      </form>

      <div
        ref={mapRef}
        className="navigator__map"
        role="slider"
        tabIndex={0}
        aria-label="Мини-карта шкалы: плотность событий по эпохам"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={start}
        aria-valuetext={current ? `${groupLabel(current)}, ${current.era.label}` : undefined}
        onKeyDown={handleKey}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          setStatus('');
          event.currentTarget.setPointerCapture(event.pointerId);
          const index = indexAt(event.clientX);
          scrubbing.current = index;
          onScrub(index);
        }}
        onPointerMove={(event) => {
          const index = indexAt(event.clientX);
          setHover(index);
          if (scrubbing.current !== undefined && scrubbing.current !== index) {
            scrubbing.current = index;
            onScrub(index);
          }
        }}
        onPointerUp={() => {
          const index = scrubbing.current;
          scrubbing.current = undefined;
          if (index !== undefined) onJump(index, 'center');
        }}
        onPointerCancel={() => {
          scrubbing.current = undefined;
          setHover(undefined);
        }}
        onPointerLeave={() => {
          if (scrubbing.current === undefined) setHover(undefined);
        }}
      >
        <div className="navigator__eras" aria-hidden="true">
          {map.eras.map((era, index) => (
            <span
              key={era.id}
              className="navigator__era"
              data-odd={index % 2 === 1 || undefined}
              style={{ left: share(era.start), width: share(era.end - era.start) }}
              title={era.label}
            >
              {era.label}
            </span>
          ))}
        </div>

        <svg className="navigator__plot" viewBox={`0 0 ${count} 100`} preserveAspectRatio="none" aria-hidden="true">
          {map.eras.map((era, index) =>
            index % 2 === 1 ? (
              <rect key={era.id} className="navigator__band" x={era.start} y={0} width={era.end - era.start} height={100} />
            ) : null,
          )}
          <path className="navigator__bars" d={map.bars} />
          <path className="navigator__milestones" d={map.milestones} />
        </svg>

        <span
          className="navigator__window"
          aria-hidden="true"
          style={{ left: share(start), width: share(end - start + 1) }}
        />

        {selectedIndex !== undefined ? (
          <span className="navigator__selected" aria-hidden="true" style={{ left: share(selectedIndex + 0.5) }} />
        ) : null}

        {hover !== undefined && groups[hover] ? (
          <span className="navigator__hover" aria-hidden="true" style={{ left: share(hover + 0.5) }}>
            {groupLabel(groups[hover])}
          </span>
        ) : null}
      </div>

      <p className="navigator__status" id="navigator-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
