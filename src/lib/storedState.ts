import type { CountryId, CountrySet, LayerPlacement, Orientation, Relation, ThemeName, TimelineItem } from '../types';
import { OWN_COLUMN } from '../types';
import { countryById } from '../data/countries';
import { normalizeGroups, type ColumnGroups } from '../data/columns';
import { MAX_USER_SETS } from '../data/countrySets';
import { layerById, MAX_ACTIVE_LAYERS } from '../data/layers';
import { isOrientation } from './orientation';
import { clampZoom } from './zoom';

/**
 * Проверка того, что лежит в localStorage, перед тем как отдать это интерфейсу.
 *
 * Сохранённое переживает версии сайта, чужие расширения и ручную правку,
 * а интерфейс читает его без оглядки: строка на месте списка или объект
 * с линией, которой нет в каталоге, роняли страницу целиком — и после
 * перезагрузки она падала снова, потому что значение никуда не девалось.
 *
 * Каждая функция получает разобранный JSON и возвращает значение нужной формы
 * либо undefined — тогда берётся значение по умолчанию. Годное значение
 * проходит без изменений: ключи и форма сохранённого — контракт с читателями
 * (docs/CORE.md, раздел 4), и проверка его не меняет, а только не пускает
 * в интерфейс то, что контракту не соответствует.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isCountryId = (value: unknown): value is CountryId => isString(value) && Boolean(countryById[value]);

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

export function storedBoolean(raw: unknown): boolean | undefined {
  return typeof raw === 'boolean' ? raw : undefined;
}

export function storedTheme(raw: unknown): ThemeName | undefined {
  return raw === 'parchment' || raw === 'atlas' ? raw : undefined;
}

export function storedAxis(raw: unknown): Orientation | undefined {
  return isOrientation(raw) ? raw : undefined;
}

export function storedZoom(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isFinite(raw) ? clampZoom(raw) : undefined;
}

/** Линии на шкале: только из каталога и хотя бы одна. */
export function storedCountries(raw: unknown): CountryId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = unique(raw.filter(isCountryId));
  return ids.length > 0 ? ids : undefined;
}

export function storedColumnGroups(raw: unknown): ColumnGroups | undefined {
  if (!Array.isArray(raw)) return undefined;
  return normalizeGroups(raw.filter(Array.isArray).map((group) => group.filter(isCountryId)));
}

export function storedLayerIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return unique(raw.filter((id): id is string => isString(id) && Boolean(layerById[id]))).slice(0, MAX_ACTIVE_LAYERS);
}

export function storedLayerPlacements(raw: unknown): Record<string, LayerPlacement> | undefined {
  if (!isRecord(raw)) return undefined;
  const result: Record<string, LayerPlacement> = {};
  for (const [layerId, placement] of Object.entries(raw)) {
    if (!layerById[layerId]) continue;
    if (placement === OWN_COLUMN || isCountryId(placement)) result[layerId] = placement;
  }
  return result;
}

export function storedNotes(raw: unknown): Record<string, string> | undefined {
  if (!isRecord(raw)) return undefined;
  const entries = Object.entries(raw).filter((entry): entry is [string, string] => isString(entry[1]));
  return entries.length === Object.keys(raw).length ? (raw as Record<string, string>) : Object.fromEntries(entries);
}

/**
 * Свои объекты читателя. Объект остаётся, если его можно поставить на шкалу:
 * есть id, заголовок, тип, год и линия из каталога. Остальные поля не трогаем —
 * необязательных много, и интерфейс их отсутствие переносит.
 */
export function storedItems(raw: unknown): TimelineItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const items: TimelineItem[] = [];
  let changed = false;

  for (const candidate of raw) {
    const valid =
      isRecord(candidate) &&
      isString(candidate.id) &&
      candidate.id !== '' &&
      !seen.has(candidate.id) &&
      isString(candidate.title) &&
      isCountryId(candidate.country) &&
      (candidate.kind === 'event' || candidate.kind === 'person') &&
      Number.isInteger(candidate.year) &&
      candidate.year !== 0;
    if (!valid) {
      changed = true;
      continue;
    }
    seen.add(candidate.id as string);

    const summaryOk = isString(candidate.summary);
    const tagsOk = Array.isArray(candidate.tags) && candidate.tags.every(isString);
    if (summaryOk && tagsOk) {
      items.push(candidate as unknown as TimelineItem);
      continue;
    }
    changed = true;
    items.push({
      ...(candidate as unknown as TimelineItem),
      summary: summaryOk ? (candidate.summary as string) : '',
      tags: Array.isArray(candidate.tags) ? candidate.tags.filter(isString) : [],
    });
  }

  return changed ? items : (raw as TimelineItem[]);
}

const RELATION_KINDS = new Set<unknown>(['influence', 'conflict', 'exchange', 'comparison', 'context']);

export function storedRelations(raw: unknown): Relation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const relations = raw.filter(
    (candidate): candidate is Relation =>
      isRecord(candidate) &&
      isString(candidate.id) &&
      isString(candidate.from) &&
      isString(candidate.to) &&
      isString(candidate.label) &&
      RELATION_KINDS.has(candidate.kind),
  );
  return relations.length === raw.length ? (raw as Relation[]) : relations;
}

export function storedCountrySets(raw: unknown): CountrySet[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sets: CountrySet[] = [];
  for (const candidate of raw) {
    if (!isRecord(candidate) || !isString(candidate.id) || !isString(candidate.label)) continue;
    const countries = storedCountries(candidate.countries);
    if (!countries) continue;
    sets.push({ id: candidate.id, label: candidate.label, countries });
  }
  return sets.slice(-MAX_USER_SETS);
}
