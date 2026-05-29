import { useEffect, useRef, useState } from 'react';
import type { TaskWithRelations } from '@pileo/shared';
import { listChecklistItems } from '../api/checklists.api';
import { listLinks } from '../api/links.api';
import { formatTaskMarkdown } from '../components/task/formatTaskMarkdown';

interface UseCopyTaskMarkdownResult {
  isCopied: boolean;
  copy: () => Promise<void>;
}

/**
 * Pulls a task's checklist + links alongside the in-memory task, formats them
 * as Markdown, and copies to the clipboard. Toggles `isCopied` briefly so the
 * caller can show a confirmation icon.
 */
export function useCopyTaskMarkdown(
  task: TaskWithRelations | null,
  columnName: string | undefined,
): UseCopyTaskMarkdownResult {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    if (!task) return;
    try {
      const [checklist, links] = await Promise.all([
        listChecklistItems(task.id).catch(() => []),
        listLinks(task.id).catch(() => []),
      ]);
      const markdown = formatTaskMarkdown({ task, columnName, checklist, links });
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard can be blocked — caller's button state stays at default
    }
  };

  return { isCopied, copy };
}
