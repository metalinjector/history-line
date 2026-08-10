import { useEffect, useId, useRef, useState } from 'react';

type Props = {
  code: string;
};

/** Читает текущую тему, чтобы перерисовать диаграмму под неё. */
function useThemeName(): string {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'parchment');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme ?? 'parchment');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Значение CSS-переменной темы в виде готового цвета. */
function token(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  if (!value) return fallback;
  // Цвета стран хранятся как компоненты HSL, остальные токены — как готовые значения.
  return value.startsWith('hsl') || value.startsWith('#') || value.startsWith('rgb')
    ? value
    : `hsl(${value})`;
}

/**
 * Диаграмма Mermaid внутри Markdown.
 *
 * Библиотека тяжёлая, поэтому подгружается динамически и только тогда,
 * когда в статье действительно встретился блок ```mermaid.
 * Палитра берётся из токенов темы, а при её смене диаграмма перерисовывается.
 */
export function MermaidBlock({ code }: Props) {
  const reactId = useId();
  const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const theme = useThemeName();
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const styles = getComputedStyle(document.documentElement);
        const isDark = theme === 'atlas';

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: styles.getPropertyValue('--font-ui') || 'sans-serif',
          themeVariables: {
            background: 'transparent',
            primaryColor: token(styles, '--paper-raised', isDark ? '#171b26' : '#faf4e8'),
            primaryTextColor: token(styles, '--ink-strong', isDark ? '#f5efe2' : '#231710'),
            primaryBorderColor: token(styles, '--accent', '#b06a1c'),
            secondaryColor: token(styles, '--paper-sunken', isDark ? '#0b0e15' : '#e8dcc7'),
            tertiaryColor: token(styles, '--paper', isDark ? '#0d1017' : '#f2e9d9'),
            lineColor: token(styles, '--line-strong', isDark ? '#4a5162' : '#a38f70'),
            textColor: token(styles, '--ink', isDark ? '#e6dfd2' : '#2b1d12'),
            mainBkg: token(styles, '--paper-raised', isDark ? '#171b26' : '#faf4e8'),
            nodeBorder: token(styles, '--accent', '#b06a1c'),
            clusterBkg: token(styles, '--paper-sunken', isDark ? '#0b0e15' : '#e8dcc7'),
            titleColor: token(styles, '--ink-strong', isDark ? '#f5efe2' : '#231710'),
            edgeLabelBackground: token(styles, '--paper', isDark ? '#0d1017' : '#f2e9d9'),
          },
        });

        const { svg: rendered } = await mermaid.render(id, code.trim());
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch {
        // Диаграмма с ошибкой не должна ломать чтение статьи.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      // Mermaid оставляет после себя временные узлы при неудачном разборе.
      document.getElementById(`d${id}`)?.remove();
    };
  }, [code, id, theme]);

  if (failed) {
    return (
      <figure className="mermaid mermaid--failed">
        <pre>
          <code>{code}</code>
        </pre>
        <figcaption>Диаграмму не удалось построить — показан исходный текст.</figcaption>
      </figure>
    );
  }

  if (!svg) return <div className="mermaid mermaid--loading">Строим диаграмму…</div>;

  return (
    <figure
      className="mermaid"
      ref={holderRef}
      // Разметка приходит из mermaid с securityLevel: 'strict', то есть уже очищенной.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
