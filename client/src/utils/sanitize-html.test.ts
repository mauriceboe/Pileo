import { describe, it, expect } from 'vitest';
import { sanitizePreviewHtml, sanitizeRichTextHtml } from './sanitize-html';

describe('sanitizePreviewHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizePreviewHtml('')).toBe('');
  });

  it('preserves allowed inline tags', () => {
    expect(sanitizePreviewHtml('hello <strong>world</strong>')).toBe('hello <strong>world</strong>');
    expect(sanitizePreviewHtml('a <em>b</em> c')).toBe('a <em>b</em> c');
  });

  it('strips scripts entirely', () => {
    const dirty = 'safe <script>alert(1)</script> text';
    const clean = sanitizePreviewHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('</script>');
  });

  it('strips img tags (XSS / token-leaking surface)', () => {
    const clean = sanitizePreviewHtml('<img src="x" onerror="alert(1)" />');
    expect(clean).toBe('');
  });

  it('collapses block tags to whitespace', () => {
    const dirty = '<p>first</p><p>second</p>';
    const clean = sanitizePreviewHtml(dirty);
    expect(clean).toBe('first second');
  });

  it('drops list tags entirely', () => {
    const dirty = '<ul><li>one</li><li>two</li></ul>';
    const clean = sanitizePreviewHtml(dirty);
    expect(clean).toBe('one two');
  });

  it('collapses internal whitespace', () => {
    expect(sanitizePreviewHtml('  hello   \n\n world  ')).toBe('hello world');
  });

  it('strips javascript: URLs from any href', () => {
    const clean = sanitizePreviewHtml('<a href="javascript:alert(1)">click</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('strips iframe + object + embed (CSP-bypass surfaces)', () => {
    expect(sanitizePreviewHtml('<iframe src="evil"></iframe>')).toBe('');
    expect(sanitizePreviewHtml('<object data="evil"></object>')).toBe('');
    expect(sanitizePreviewHtml('<embed src="evil" />')).toBe('');
  });

  it('strips on* event handlers from preserved tags', () => {
    const clean = sanitizePreviewHtml('<span onclick="alert(1)">hi</span>');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('hi');
  });

  it('strips style attribute (CSS-injection surface)', () => {
    const clean = sanitizePreviewHtml('<span style="background:url(javascript:alert(1))">x</span>');
    expect(clean).not.toContain('style=');
    expect(clean).not.toContain('javascript:');
  });
});

describe('sanitizeRichTextHtml', () => {
  it('keeps full prose structure intact', () => {
    const html = '<p>hello <strong>world</strong></p><ul><li>one</li></ul>';
    const clean = sanitizeRichTextHtml(html);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<strong>world</strong>');
    expect(clean).toContain('<li>one</li>');
  });

  it('still strips scripts and event handlers', () => {
    const dirty = '<p onclick="alert(1)">hi</p><script>steal()</script>';
    const clean = sanitizeRichTextHtml(dirty);
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('steal()');
  });

  it('strips disallowed tags but keeps their text content', () => {
    const clean = sanitizeRichTextHtml('<p>before<custom-tag>middle</custom-tag>after</p>');
    expect(clean).toContain('before');
    expect(clean).toContain('after');
    expect(clean).not.toContain('<custom-tag');
  });

  it('drops javascript: URLs in href', () => {
    const clean = sanitizeRichTextHtml('<a href="javascript:alert(1)">x</a>');
    expect(clean).not.toContain('javascript:');
  });

  it('drops data: URLs in href', () => {
    const clean = sanitizeRichTextHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(clean).not.toContain('data:text/html');
  });
});
