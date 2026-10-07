import { countryById } from '../data/countries';
import type { Relation, RelationDraftInput, SourceKind, SourceLink, TimelineItem } from '../types';
import { hasVerifiedSources } from './provenance';

/**
 * ⚠ КОНТРАКТ — docs/CORE.md, раздел 4. Файлы history-line/custom-objects@1
 * уже сохранены у читателей и должны импортироваться всегда: новые поля —
 * только необязательные, несовместимое изменение — новая версия схемы,
 * а импорт продолжает принимать @1. Замороженный файл — в src/contracts.test.ts.
 *
 * Свои объекты читателя: обмен файлом.
 *
 * Объекты из конструктора живут в браузере. Экспорт сохраняет их вместе
 * со связями в JSON, импорт принимает такой файл обратно — у себя на другом
 * компьютере или от коллеги. Импорт не доверяет файлу: каждое поле проверяется,
 * лишние отбрасываются, а всё, что не прошло, попадает в отчёт с причиной.
 */
export const CUSTOM_SCHEMA = 'history-line/custom-objects@1';

export type CustomExport = {
  schema: typeof CUSTOM_SCHEMA;
  exportedAt: string;
  items: TimelineItem[];
  relations: Relation[];
};

export type CustomImport = {
  /** Объекты, готовые к добавлению на шкалу. */
  items: TimelineItem[];
  relations: Relation[];
  /** Сколько объектов файла уже есть на шкале — они не дублируются. */
  duplicates: number;
  /** Что не принято и почему — по строке на объект или связь. */
  skipped: string[];
};

const RELATION_KINDS = new Set<Relation['kind']>(['influence', 'conflict', 'exchange', 'comparison', 'context']);
const SOURCE_KINDS = new Set<SourceKind>(['archive', 'academic', 'institution', 'encyclopedia', 'reference']);

export function isWebUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Связь читателя принимается только с объяснением и двумя источниками-ссылками,
 * хотя бы один из которых не энциклопедия, — те же требования, что и к базе.
 */
export function relationIsComplete(relation: Pick<Relation, 'label' | 'detail' | 'sources'>): boolean {
  const sources = relation.sources ?? [];
  return (
    relation.label.trim().length > 3 &&
    relation.detail.trim().length >= 20 &&
    hasVerifiedSources(sources) &&
    sources.every((source) => isWebUrl(source.url))
  );
}

/** Связи объекта читателя из черновиков конструктора: id выводятся из id объекта. */
export function relationsFromDrafts(from: string, links: RelationDraftInput[]): Relation[] {
  return links.map((link, index) => ({
    id: `${from}-rel-${index}`,
    from,
    ...link,
    verification: 'verified' as const,
  }));
}

export function newCustomId(item: Pick<TimelineItem, 'country' | 'year'>): string {
  return `custom-${item.country}-${item.year}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildCustomExport(
  items: TimelineItem[],
  relations: Relation[],
  exportedAt = new Date().toISOString(),
): CustomExport {
  const ids = new Set(items.map((item) => item.id));
  return {
    schema: CUSTOM_SCHEMA,
    exportedAt,
    items,
    relations: relations.filter((relation) => ids.has(relation.from)),
  };
}

type Context = {
  /** Идентификаторы объектов базы и слоёв: на них могут ссылаться связи. */
  knownIds: Set<string>;
  /** Объекты читателя, которые уже на шкале. */
  customIds: Set<string>;
  currentYear?: number;
};

/**
 * Разбирает файл экспорта. Не бросает исключений: всё, что не так,
 * описывается в отчёте, а годное принимается.
 */
export function parseCustomImport(text: string, context: Context): CustomImport {
  const result: CustomImport = { items: [], relations: [], duplicates: 0, skipped: [] };
  const currentYear = context.currentYear ?? new Date().getFullYear();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    result.skipped.push('Файл не читается как JSON.');
    return result;
  }
  if (!isRecord(data) || data.schema !== CUSTOM_SCHEMA || !Array.isArray(data.items)) {
    result.skipped.push('Это не файл своих объектов History Line.');
    return result;
  }

  // Старый id из файла → id на этой шкале.
  const idMap = new Map<string, string>();
  const taken = new Set([...context.knownIds, ...context.customIds]);

  data.items.forEach((raw, index) => {
    const name = isRecord(raw) && typeof raw.title === 'string' && raw.title.trim() ? `«${raw.title.trim()}»` : `№ ${index + 1}`;
    const problem = itemProblem(raw, currentYear);
    if (problem || !isRecord(raw)) {
      result.skipped.push(`Объект ${name}: ${problem ?? 'не объект'}.`);
      return;
    }

    const fileId = typeof raw.id === 'string' ? raw.id : undefined;
    if (fileId && context.customIds.has(fileId)) {
      idMap.set(fileId, fileId);
      result.duplicates++;
      return;
    }

    const item = normalizeItem(raw);
    item.id = fileId?.startsWith('custom-') && !taken.has(fileId) ? fileId : newCustomId(item);
    taken.add(item.id);
    if (fileId) idMap.set(fileId, item.id);
    result.items.push(item);
  });

  const relations = Array.isArray(data.relations) ? data.relations : [];
  const reachable = new Set([...context.knownIds, ...context.customIds, ...result.items.map((item) => item.id)]);
  const counters = new Map<string, number>();

  for (const raw of relations) {
    if (!isRecord(raw)) continue;
    const label = typeof raw.label === 'string' && raw.label.trim() ? `«${raw.label.trim()}»` : 'без подписи';
    const from = typeof raw.from === 'string' ? idMap.get(raw.from) : undefined;
    // Связи уже бывших на шкале объектов не трогаем: они пришли вместе с ними.
    if (from && context.customIds.has(from)) continue;
    const to = typeof raw.to === 'string' ? (idMap.get(raw.to) ?? raw.to) : undefined;
    if (!from || !to || !reachable.has(to)) {
      result.skipped.push(`Связь ${label}: не найден один из её объектов.`);
      continue;
    }
    if (typeof raw.kind !== 'string' || !RELATION_KINDS.has(raw.kind as Relation['kind'])) {
      result.skipped.push(`Связь ${label}: неизвестный характер связи.`);
      continue;
    }
    const relation = {
      label: typeof raw.label === 'string' ? raw.label.trim() : '',
      detail: typeof raw.detail === 'string' ? raw.detail.trim() : '',
      sources: normalizeSources(raw.sources),
    };
    if (!relationIsComplete(relation)) {
      result.skipped.push(
        `Связь ${label}: нужны объяснение от 20 знаков и два источника со ссылками, хотя бы один — не энциклопедия.`,
      );
      continue;
    }
    const index = counters.get(from) ?? 0;
    counters.set(from, index + 1);
    result.relations.push({
      id: `${from}-rel-${index}`,
      from,
      to,
      kind: raw.kind as Relation['kind'],
      ...relation,
      verification: 'verified',
    });
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isYear = (value: unknown): value is number => Number.isInteger(value) && value !== 0;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function itemProblem(raw: unknown, currentYear: number): string | undefined {
  if (!isRecord(raw)) return 'не объект';
  if (text(raw.title).length < 2) return text(raw.title) ? 'заголовок короче двух знаков' : 'нет заголовка';
  if (typeof raw.country !== 'string' || !countryById[raw.country]) return `нет линии «${String(raw.country)}»`;
  if (raw.kind !== 'event' && raw.kind !== 'person') return 'тип — не событие и не деятель';
  if (!isYear(raw.year) || raw.year < -3_500_000 || raw.year > currentYear) return 'год вне шкалы';
  if (raw.endYear !== undefined && (!isYear(raw.endYear) || raw.endYear < raw.year || raw.endYear > currentYear)) {
    return 'год окончания раньше начала или вне шкалы';
  }
  if (text(raw.summary).length < 2) return 'нет краткого описания';
  return undefined;
}

/** Берёт из файла только известные поля, остальное отбрасывает. */
function normalizeItem(raw: Record<string, unknown>): TimelineItem {
  const summary = text(raw.summary);
  const month = Number.isInteger(raw.month) && (raw.month as number) >= 1 && (raw.month as number) <= 12 ? (raw.month as number) : undefined;
  const day = month && Number.isInteger(raw.day) && (raw.day as number) >= 1 && (raw.day as number) <= 31 ? (raw.day as number) : undefined;
  const importance = raw.importance === 1 || raw.importance === 3 ? raw.importance : 2;
  return {
    id: '',
    country: raw.country as TimelineItem['country'],
    year: raw.year as number,
    ...(month ? { month } : {}),
    ...(day ? { day } : {}),
    ...(isYear(raw.endYear) && raw.endYear !== raw.year ? { endYear: raw.endYear } : {}),
    kind: raw.kind as TimelineItem['kind'],
    title: text(raw.title),
    summary,
    detail: text(raw.detail) || summary,
    ...(raw.kind === 'person' && text(raw.life) ? { life: text(raw.life) } : {}),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '').map((tag) => tag.trim()) : [],
    importance,
    custom: true,
  };
}

function normalizeSources(raw: unknown): SourceLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((source) => ({
    label: text(source.label),
    ...(text(source.url) ? { url: text(source.url) } : {}),
    ...(SOURCE_KINDS.has(source.kind as SourceKind) ? { kind: source.kind as SourceKind } : {}),
  }));
}
