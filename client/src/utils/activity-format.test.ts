import { describe, it, expect } from 'vitest';
import { truncate, stripHtmlText, formatDateOrNull } from './activity-format';

describe('truncate', () => {
  it('returns the original string if under the limit', () => {
    expect(truncate('short', 60)).toBe('short');
  });

  it('collapses runs of whitespace', () => {
    expect(truncate('a    b\n\nc', 60)).toBe('a b c');
  });

  it('appends ellipsis when too long', () => {
    const long = 'x'.repeat(120);
    const result = truncate(long, 60);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(60);
  });

  it('uses default max of 60 when not specified', () => {
    const long = 'y'.repeat(120);
    expect(truncate(long).length).toBe(60);
  });
});

describe('stripHtmlText', () => {
  it('strips simple tags', () => {
    expect(stripHtmlText('<p>hello</p>')).toBe('hello');
    expect(stripHtmlText('<strong>x</strong>')).toBe('x');
  });

  it('preserves line breaks from block boundaries', () => {
    expect(stripHtmlText('<p>a</p><p>b</p>')).toMatch(/a\s*\n+\s*b/);
  });

  it('converts <br> to newline', () => {
    expect(stripHtmlText('a<br>b')).toBe('a\nb');
    expect(stripHtmlText('a<br />b')).toBe('a\nb');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtmlText('a&amp;b')).toBe('a&b');
    expect(stripHtmlText('&lt;tag&gt;')).toBe('<tag>');
    expect(stripHtmlText('a&nbsp;b')).toBe('a b');
    expect(stripHtmlText('he said &quot;hi&quot;')).toBe('he said "hi"');
  });
});

describe('formatDateOrNull', () => {
  it('returns null for null / undefined / empty', () => {
    expect(formatDateOrNull(null)).toBeNull();
    expect(formatDateOrNull(undefined)).toBeNull();
    expect(formatDateOrNull('')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(formatDateOrNull('not a date')).toBeNull();
  });

  it('formats valid ISO strings', () => {
    const result = formatDateOrNull('2026-05-29T12:00:00Z');
    expect(result).not.toBeNull();
    expect(result).toMatch(/2026/);
  });
});
