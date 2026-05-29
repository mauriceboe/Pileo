import DOMPurify from 'dompurify';

// Allow only the basic prose marks TipTap StarterKit emits.
// Block tags are still permitted because they appear in saved descriptions —
// we collapse them to inline whitespace for the card preview separately.
const INLINE_ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins',
  'mark', 'code', 'sub', 'sup', 'br', 'span',
];

const FULL_ALLOWED_TAGS = [
  ...INLINE_ALLOWED_TAGS,
  'p', 'div', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'hr', 'a',
];

const ALLOWED_ATTR = ['href', 'rel', 'target'];

/**
 * Strict inline sanitiser used for task-card description previews.
 * Block tags are collapsed to whitespace, all other tags + attributes are
 * stripped. DOMPurify provides the actual security boundary; the surrounding
 * whitespace normalisation is layout-only.
 */
// Inject whitespace at block boundaries before DOMPurify drops the tag, so
// "<p>a</p><p>b</p>" becomes "a b" rather than "ab" after KEEP_CONTENT.
const BLOCK_CLOSE_RE = /<\/(p|div|li|ul|ol|h[1-6]|blockquote|pre|tr|td|th)>/gi;

export function sanitizePreviewHtml(html: string): string {
  if (!html) return '';
  const withSpaces = html.replace(BLOCK_CLOSE_RE, '$& ');
  const inlineOnly = DOMPurify.sanitize(withSpaces, {
    ALLOWED_TAGS: INLINE_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return inlineOnly.replace(/\s+/g, ' ').trim();
}

/**
 * Full sanitiser for the rich-text body shown in TaskDescription / Markdown
 * export. Preserves the StarterKit set of tags but still drops scripts, event
 * handlers, javascript: URLs, etc.
 */
export function sanitizeRichTextHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: FULL_ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
