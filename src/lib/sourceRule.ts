/**
 * ⚠ КАРКАС — docs/CORE.md, раздел 3. Без импортов: модуль загружает конфиг
 * Vite (src/contracts.test.ts это проверяет).
 *
 * Единый контракт верификации для фактов и причинных связей: не меньше двух
 * источников с внятной подписью, и хотя бы один из них не энциклопедия.
 *
 * Модуль намеренно ни от чего не зависит: правилом пользуется и плагин сборки
 * (plugins/markdownContent.ts), который собирает сводку редакционной базы.
 */
export function hasVerifiedSources(sources?: readonly { label: string; kind?: string }[]): boolean {
  return Boolean(
    sources &&
      sources.length >= 2 &&
      sources.every((source) => source.label.trim().length > 1) &&
      sources.some((source) => source.kind !== 'encyclopedia'),
  );
}
