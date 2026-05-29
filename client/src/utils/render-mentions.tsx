import type { ReactNode } from 'react';

// Splits text into runs, wrapping `@handle` tokens in a styled span.
// Used for rendering inline @ mentions in comments and descriptions.
export function renderMentions(text: string, mentionClassName: string): ReactNode {
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className={mentionClassName}>{part}</span>
      : part,
  );
}
