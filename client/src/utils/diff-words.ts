export type DiffPart = { type: 'same' | 'added' | 'removed'; text: string };

const MAX_LCS_CELLS = 200_000;

/**
 * Word-level diff via longest-common-subsequence. Returns adjacent same/added/
 * removed parts merged. Caps the LCS table to avoid pathological O(m*n) blow-up
 * — beyond the cap, we fall back to "whole old replaced by whole new".
 */
export function diffWords(oldStr: string, newStr: string): DiffPart[] {
  const oldTokens = oldStr.split(/(\s+)/);
  const newTokens = newStr.split(/(\s+)/);
  const m = oldTokens.length;
  const n = newTokens.length;

  if (m * n > MAX_LCS_CELLS) {
    return [
      { type: 'removed', text: oldStr },
      { type: 'added', text: newStr },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const parts: DiffPart[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldTokens[i - 1] === newTokens[j - 1]) {
      parts.unshift({ type: 'same', text: oldTokens[i - 1]! });
      i -= 1; j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      parts.unshift({ type: 'removed', text: oldTokens[i - 1]! });
      i -= 1;
    } else {
      parts.unshift({ type: 'added', text: newTokens[j - 1]! });
      j -= 1;
    }
  }
  while (i > 0) { i -= 1; parts.unshift({ type: 'removed', text: oldTokens[i]! }); }
  while (j > 0) { j -= 1; parts.unshift({ type: 'added', text: newTokens[j]! }); }

  const merged: DiffPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}
