import { describe, it, expect } from 'vitest';
import { diffWords } from './diff-words';

describe('diffWords', () => {
  it('returns a single same-part for identical strings', () => {
    const parts = diffWords('hello world', 'hello world');
    expect(parts).toEqual([{ type: 'same', text: 'hello world' }]);
  });

  it('marks an added word', () => {
    const parts = diffWords('hello', 'hello world');
    expect(parts.find((p) => p.type === 'added')?.text).toBe(' world');
    expect(parts.some((p) => p.type === 'removed')).toBe(false);
  });

  it('marks a removed word', () => {
    const parts = diffWords('hello world', 'hello');
    expect(parts.find((p) => p.type === 'removed')?.text).toBe(' world');
    expect(parts.some((p) => p.type === 'added')).toBe(false);
  });

  it('handles a full replacement', () => {
    const parts = diffWords('alpha', 'beta');
    expect(parts).toHaveLength(2);
    expect(parts.find((p) => p.type === 'removed')?.text).toBe('alpha');
    expect(parts.find((p) => p.type === 'added')?.text).toBe('beta');
  });

  it('keeps shared prefixes and suffixes intact', () => {
    // "the" and "fox" are common — they must appear unmerged in the output.
    const parts = diffWords('the quick brown fox', 'the lazy slow fox');
    const sameRuns = parts.filter((p) => p.type === 'same').map((p) => p.text).join('');
    expect(sameRuns).toContain('the');
    expect(sameRuns).toContain('fox');
  });

  it('never has two adjacent parts of the same type after merging', () => {
    const parts = diffWords('one two three four', 'one TWO three FOUR');
    for (let i = 1; i < parts.length; i += 1) {
      expect(parts[i]!.type).not.toBe(parts[i - 1]!.type);
    }
  });

  it('falls back to full-replacement on pathological input', () => {
    // m*n > 200_000 triggers the LCS fallback path
    const oldStr = 'x '.repeat(1500).trim();
    const newStr = 'y '.repeat(1500).trim();
    const parts = diffWords(oldStr, newStr);
    expect(parts).toEqual([
      { type: 'removed', text: oldStr },
      { type: 'added', text: newStr },
    ]);
  });
});
