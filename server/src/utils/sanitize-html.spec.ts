import { describe, it, expect } from 'vitest';
import { sanitizeRichText } from './sanitize-html.js';

describe('sanitizeRichText', () => {
  it('passes null and undefined through unchanged', () => {
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeNull();
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeRichText('')).toBe('');
  });

  it('keeps the StarterKit prose tags', () => {
    const html = '<p>hello <strong>world</strong></p><ul><li>one</li></ul>';
    const clean = sanitizeRichText(html);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<strong>world</strong>');
    expect(clean).toContain('<li>one</li>');
  });

  it('strips scripts and inline handlers (defence in depth)', () => {
    const dirty = '<p onclick="alert(1)">hi</p><script>steal()</script>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('steal()');
  });

  it('removes javascript: hrefs', () => {
    const clean = sanitizeRichText('<a href="javascript:alert(1)">x</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('strips iframe, object, embed entirely', () => {
    expect(sanitizeRichText('<iframe src="evil"></iframe>')).toBe('');
    expect(sanitizeRichText('<object data="evil"></object>')).toBe('');
    expect(sanitizeRichText('<embed src="evil" />')).toBe('');
  });

  it('drops data: URLs', () => {
    const clean = sanitizeRichText('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(clean).not.toContain('data:text/html');
  });

  it('drops style attributes (CSS-injection surface)', () => {
    const clean = sanitizeRichText('<p style="background:url(javascript:alert(1))">x</p>');
    expect(clean).not.toContain('style=');
    expect(clean).not.toContain('javascript:');
  });
});
