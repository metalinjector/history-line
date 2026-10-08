import { describe, expect, it } from 'vitest';
import { parseCustomImport } from './lib/customObjects';
import { parseTimelineUrl } from './lib/urlState';
import { migrateMergedNotes, migrateMergedRelations, referenceMerges } from './data/referenceMerges';
import { timelineItems } from './data/timelineItems';
import sourceRule from './lib/sourceRule.ts?raw';

/**
 * Контракты каркаса — см. docs/CORE.md.
 *
 * Эти тесты охраняют не поведение функций, а обещания: ссылки, которые
 * читатели уже разослали, файлы, которые они уже сохранили, данные в их
 * браузерах и границы первого экрана. Если тест упал, скорее всего сломано
 * что-то чужое. Менять ожидания можно только осознанно и вместе с миграцией:
 * старое имя параметра читается дальше, старый ключ переносится в новый,
 * старая версия файла принимается импортом.
 */

const sources = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Статические импорты файла (без `import type`), разрешённые относительно src/. */
function staticImports(path: string, code: string): string[] {
  const base = new URL(path.slice(2), 'file:///src/');
  return Array.from(code.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"](\.[^'"]+)['"]/gm), (match) =>
    new URL(match[1], base).pathname.replace(/\.tsx?$/, ''),
  );
}

describe('контракты каркаса', () => {
  it('ссылки, разосланные сегодня, открывают тот же вид', () => {
    // Ссылка в том виде, в каком её строит buildTimelineUrl на момент заморозки.
    // Её уже могли сохранить в закладки, конспекты и чаты.
    const link =
      '?view=1&c=france%2Crussia&kind=events&q=%D1%80%D0%B5%D0%B2%D0%BE%D0%BB%D1%8E%D1%86%D0%B8%D1%8F&key=1' +
      '&bce=0&period=era%3Aworld-wars&tag=%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0&z=1.55&o=h&layers=einstein' +
      '&place=einstein%3Aown&groups=france%2Brussia&focus=ru-1917&item=ru-1917&day=1917&relation=rel-1917' +
      '&threads=0&story=revolution-1917-1922&step=3';

    expect(parseTimelineUrl(link)).toMatchObject({
      countries: ['france', 'russia'],
      kind: 'events',
      query: 'революция',
      keyOnly: true,
      period: { type: 'era', id: 'world-wars' },
      showBce: false,
      tags: ['война'],
      zoom: 1.55,
      orientation: 'horizontal',
      activeLayerIds: ['einstein'],
      layerPlacements: { einstein: 'own' },
      columnGroups: [['france', 'russia']],
      selectedId: 'ru-1917',
      openedId: 'ru-1917',
      openedDayKey: '1917',
      openedRelationId: 'rel-1917',
      showRelations: false,
      storyId: 'revolution-1917-1922',
      storyStep: 2,
    });

    // Ссылка из времён до горизонтальной шкалы открывается так, как её
    // видел автор, — вертикально, даже если у читателя сохранена горизонтальная.
    expect(parseTimelineUrl('?view=1&c=france,russia&focus=ru-1917')).toMatchObject({
      countries: ['france', 'russia'],
      selectedId: 'ru-1917',
      orientation: 'vertical',
    });
  });

  it('id слитой записи справочника продолжает работать', () => {
    // Запись справочника, повторявшая карточку, снята со шкалы, но её id уже
    // мог попасть в ссылки, заметки и связи читателей — он ведёт на карточку.
    const onScale = new Set(timelineItems.map((item) => item.id));
    for (const [merged, card] of Object.entries(referenceMerges)) {
      expect(onScale.has(merged), merged).toBe(false);
      expect(onScale.has(card), `${merged} → ${card}`).toBe(true);
    }
    const [merged, card] = Object.entries(referenceMerges)[0];
    expect(parseTimelineUrl(`?focus=${merged}&item=${merged}`)).toMatchObject({ selectedId: card, openedId: card });
    expect(migrateMergedNotes({ [merged]: 'старая', [card]: 'новая', other: 'x' })).toEqual({ [card]: 'новая\n\nстарая', other: 'x' });
    expect(migrateMergedRelations([{ from: 'custom-1', to: merged }])).toEqual([{ from: 'custom-1', to: card }]);
    const untouched = { other: 'x' };
    expect(migrateMergedNotes(untouched)).toBe(untouched);
  });

  it('файл своих объектов формата @1 принимается импортом', () => {
    // Файл в том виде, в каком его сохраняет «Экспорт» конструктора.
    const file = `{
      "schema": "history-line/custom-objects@1",
      "exportedAt": "2026-10-07T12:00:00.000Z",
      "items": [{
        "id": "custom-germany-1543-abc123", "country": "germany", "year": 1543, "kind": "person",
        "title": "Николай Коперник", "summary": "Публикует «О вращении небесных сфер».",
        "detail": "Гелиоцентрическая система.", "life": "1473–1543", "tags": ["наука"],
        "importance": 2, "custom": true
      }],
      "relations": [{
        "id": "custom-germany-1543-abc123-rel-0", "from": "custom-germany-1543-abc123", "to": "de-luther-1517",
        "kind": "context", "label": "Коперник и Реформация",
        "detail": "Обе перемены подрывают авторитет прежней картины мира в одни десятилетия.",
        "sources": [
          { "label": "Stanford Encyclopedia of Philosophy", "url": "https://plato.stanford.edu/entries/copernicus/", "kind": "academic" },
          { "label": "Britannica", "url": "https://www.britannica.com/biography/Nicolaus-Copernicus", "kind": "encyclopedia" }
        ],
        "verification": "verified"
      }]
    }`;

    const imported = parseCustomImport(file, { knownIds: new Set(['de-luther-1517']), customIds: new Set(), currentYear: 2026 });
    expect(imported.skipped).toEqual([]);
    expect(imported.items).toHaveLength(1);
    expect(imported.items[0]).toMatchObject({ id: 'custom-germany-1543-abc123', title: 'Николай Коперник', year: 1543 });
    expect(imported.relations).toHaveLength(1);
  });

  it('ключи сохранённого в браузере не переименовываются', () => {
    // Под этими ключами (с префиксом history-line:) лежат свои объекты,
    // заметки и настройки читателей. Новый ключ — можно; переименовать
    // старый — только с переносом значения, иначе данные пропадут молча.
    const keys = Object.values(sources)
      .flatMap((code) => Array.from(code.matchAll(/usePersistentState[^(]*\(\s*'([a-z-]+)'/g), (match) => match[1]))
      .sort();

    expect(keys).toEqual([
      'added-people',
      'added-relations',
      'column-groups',
      'countries',
      'country-sets',
      'layer-placements',
      'layers',
      'notes',
      'orientation',
      'show-bce',
      'show-relations',
      'theme',
      'zoom',
    ]);
  });

  it('полная редакционная база не попадает в первый экран', () => {
    // data/content.ts — полные тексты: описания, параллели, статьи, источники,
    // трактовки, объяснения связей. Статически его не импортирует никто:
    // все берут его через data/loadContent.ts, когда читатель провалился внутрь.
    // Даже ленивое окно: его код подгружается заранее, а тексты — нет.
    const importers = Object.entries(sources)
      .filter(([path, code]) => staticImports(path, code).includes('/src/data/content'))
      .map(([path]) => path);

    expect(importers).toEqual([]);
  });

  it('правило верификации ни от чего не зависит', () => {
    // lib/sourceRule.ts загружает конфиг Vite (плагин сводки содержания):
    // импорты в нём ломают сборку при будущем configLoader: 'native'.
    expect(sourceRule).not.toMatch(/^\s*import\s/m);
  });
});
