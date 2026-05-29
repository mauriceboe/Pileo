import DOMPurify from 'isomorphic-dompurify';

// Same tag allow-list as the client's full sanitiser — the StarterKit subset
// plus links. ALLOWED_ATTR is restricted to safe link attributes; all event
// handlers, style attributes, and `javascript:` URLs are dropped by DOMPurify.
const ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins',
  'mark', 'code', 'sub', 'sup', 'br', 'span',
  'p', 'div', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'hr', 'a',
];

const ALLOWED_ATTR = ['href', 'rel', 'target'];

/**
 * Sanitise rich-text HTML on the way into the database.
 *
 * Defence in depth: even though TipTap on the client only emits a known-safe
 * subset of HTML, an attacker can call the API directly. Sanitising on save
 * means the DB never holds a malicious payload — every subsequent reader
 * (including the Markdown export, the activity feed preview, the share view)
 * is starting from clean input.
 */
export function sanitizeRichText(html: string | null | undefined): string | null {
  if (html === null || html === undefined) return null;
  if (html === '') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
