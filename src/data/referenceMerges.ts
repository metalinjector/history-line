/**
 * Записи справочника, которые повторяют авторскую карточку.
 *
 * Справочник импортирован целиком, и часть его записей описывает события,
 * у которых в базе уже есть выверенная карточка: на шкале получались два
 * объекта об одном и том же, причём в записи справочника — опечатки
 * распознавания. Такая запись снимается со шкалы и сливается с карточкой:
 * её id остаётся рабочим (⚠ КОНТРАКТ — docs/CORE.md, раздел 4) — старые ссылки,
 * заметки и связи читателей переходят на карточку через `canonicalItemId`.
 *
 * Файл без импортов: его читает и скрипт импорта справочника, чтобы
 * не возвращать слитые записи при перегенерации.
 */
export const referenceMerges: Record<string, string> = {
  'ref-p030-obrazovanie-drevnerusskogo-gosudarstva': 'ru-oleg-882',
  'ref-p034-vozniknovenie-angliyskogo-parlamenta': 'gb-parliament-1265',
  'ref-p035-pravlenie-v-kieve-knyazya-yaroslava-mudrog': 'ru-yaroslav-1019',
  'ref-p046-nachalo-reformacii-v-germanii': 'de-luther-1517',
  'ref-p053-nachalo-knigopechataniya-v-rossii': 'ru-fedorov-1564',
  'ref-p064-provozglashenie-germanskoy-imperii': 'de-empire-1871',
  'ref-p067-otechestvennaya-voyna-v-rossii': 'ru-1812',
  'ref-p083-naznachenie-a-gitlera-reyhskanclerom-germa': 'de-1933',
  'ref-p103-germanskaya-demokraticheskaya-respublika-g': 'de-two-states-1949',
  'ref-p103-obrazovanie-federativnoy-respubliki-german': 'de-two-states-1949',
  'ref-p105-mayskie-sobytiya-vo-francii': 'fr-1968',
  'ref-p108-pervyy-v-istorii-polet-cheloveka-v-kosmos': 'ru-gagarin-1961',
  'ref-p111-predostavlenie-nezavisimosti-britanskoy-in': 'gb-india-1947',
};

/** id, под которым объект живёт на шкале сейчас: слитая запись → её карточка. */
export function canonicalItemId(id: string): string;
export function canonicalItemId(id: string | undefined): string | undefined;
export function canonicalItemId(id: string | undefined): string | undefined {
  return id === undefined ? undefined : (referenceMerges[id] ?? id);
}

/**
 * Заметки читателя под слитыми id переносятся на карточку. Если у карточки
 * уже есть своя заметка, тексты склеиваются — ничего не теряется.
 * Возвращает тот же объект, если переносить нечего.
 */
export function migrateMergedNotes(notes: Record<string, string>): Record<string, string> {
  if (!Object.keys(notes).some((id) => id in referenceMerges)) return notes;
  const next: Record<string, string> = {};
  // Сначала заметки под действующими id, затем перенесённые — дописываются в конец.
  const entries = Object.entries(notes).sort(([a], [b]) => Number(a in referenceMerges) - Number(b in referenceMerges));
  for (const [id, note] of entries) {
    const target = canonicalItemId(id);
    next[target] = next[target] ? `${next[target]}\n\n${note}` : note;
  }
  return next;
}

/** Связи читателя, которые вели к слитой записи, ведут к её карточке. */
export function migrateMergedRelations<T extends { from: string; to: string }>(relations: T[]): T[] {
  if (!relations.some((relation) => relation.from in referenceMerges || relation.to in referenceMerges)) return relations;
  return relations.map((relation) => ({ ...relation, from: canonicalItemId(relation.from), to: canonicalItemId(relation.to) }));
}
