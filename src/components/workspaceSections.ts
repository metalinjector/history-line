export type WorkspaceSectionId =
  | 'routes'
  | 'research'
  | 'people'
  | 'editorial'
  | 'method';

export type WorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  shortLabel: string;
  description: string;
  glyph: string;
};

/**
 * Единый каталог разделов верхней рабочей панели.
 *
 * Шапка и сама панель используют один массив, поэтому порядок, подписи и
 * доступность разделов не могут разойтись при следующих изменениях интерфейса.
 */
export const workspaceSections: WorkspaceSection[] = [
  {
    id: 'routes',
    label: 'Кураторские маршруты',
    shortLabel: 'Маршруты',
    description: 'Готовые исторические сюжеты, которые ведут по связанным карточкам.',
    glyph: '↝',
  },
  {
    id: 'research',
    label: 'Исследование и экспорт',
    shortLabel: 'Экспорт',
    description: 'Ссылка на текущий вид, JSON, Markdown и версия для печати.',
    glyph: '↗',
  },
  {
    id: 'people',
    label: 'Персоналии и свои объекты',
    shortLabel: 'Персоналии',
    description: 'Готовые карточки и конструктор собственного объекта для шкалы.',
    glyph: '+',
  },
  {
    id: 'editorial',
    label: 'Редакторская матрица',
    shortLabel: 'Редактор',
    description: 'Покрытие стран и эпох источниками, статьями и точными датами.',
    glyph: '▦',
  },
  {
    id: 'method',
    label: 'Как это устроено',
    shortLabel: 'Справка',
    description: 'Правила чтения шкалы, принципы текстов и направление развития.',
    glyph: '?',
  },
];

export const workspaceSectionById = Object.fromEntries(
  workspaceSections.map((section) => [section.id, section]),
) as Record<WorkspaceSectionId, WorkspaceSection>;
