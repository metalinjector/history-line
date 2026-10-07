import type { TimelineItem } from '../../types';
import items from './reference.json';

/**
 * События из печатного справочника 2025 года, которых нет в авторской базе.
 *
 * Файл reference.json генерирует scripts/import_history_reference.py.
 * Данные лежат в JSON, а не в коде: сборщик отдаёт крупный JSON через
 * JSON.parse, а его браузер разбирает быстрее, чем такой же литерал в JS.
 * Тип описан в reference.d.json.ts; форму данных проверяет dataIntegrity.test.ts.
 */
export const referenceItems: TimelineItem[] = items;
