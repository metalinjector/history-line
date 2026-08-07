import { Fragment, useMemo } from 'react';

type Props = {
  text: string;
  query: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Подсвечивает вхождения поискового запроса в тексте карточки. */
export function Highlight({ text, query }: Props) {
  const parts = useMemo(() => {
    const words = query.trim().split(/\s+/).filter((word) => word.length > 1);
    if (words.length === 0) return null;
    const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(pattern);
  }, [text, query]);

  if (!parts) return <>{text}</>;

  const lowered = query.toLowerCase();
  return (
    <>
      {parts.map((part, index) =>
        part && lowered.includes(part.toLowerCase()) && part.trim().length > 1 ? (
          <mark className="hl" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}
