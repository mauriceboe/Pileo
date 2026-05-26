import type { ChecklistItem } from '@pileo/shared';
import type { TaskWithRelations } from '../../api/tasks.api';
import type { TaskLink } from '../../api/links.api';

interface FormatTaskInput {
  task: TaskWithRelations;
  columnName?: string | null;
  checklist?: ChecklistItem[];
  links?: TaskLink[];
}

/**
 * Renders a task as a structured Markdown document for copying out of Pileo —
 * title, description, checklist and links, in that order. Sections with no
 * content are skipped so the output stays clean for sparse cards.
 */
export function formatTaskMarkdown({ task, columnName, checklist = [], links = [] }: FormatTaskInput): string {
  const blocks: string[] = [];

  blocks.push(`# ${task.title.trim()}`);

  // A compact metadata line — only the fields that are actually set.
  const meta: string[] = [];
  if (columnName) meta.push(`**Status:** ${columnName}`);
  if (task.priority && task.priority !== 'none') meta.push(`**Priority:** ${task.priority}`);
  if (task.dueDate) meta.push(`**Due:** ${task.dueDate.slice(0, 10)}`);
  if (task.labels.length > 0) meta.push(`**Labels:** ${task.labels.map((l) => l.name).join(', ')}`);
  if (meta.length > 0) blocks.push(meta.join('  \n'));

  const description = task.description?.trim();
  if (description) {
    blocks.push(`## Description\n\n${description}`);
  }

  if (checklist.length > 0) {
    const items = [...checklist]
      .sort((a, b) => a.position - b.position)
      .map((item) => `- [${item.isCompleted ? 'x' : ' '}] ${item.title}`)
      .join('\n');
    blocks.push(`## Checklist\n\n${items}`);
  }

  if (links.length > 0) {
    const items = links.map((link) => `- ${link.url}`).join('\n');
    blocks.push(`## Links\n\n${items}`);
  }

  return blocks.join('\n\n') + '\n';
}
