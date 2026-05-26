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
 * Converts the TipTap-generated HTML of a task description into Markdown so the
 * copied output reads cleanly instead of carrying raw <p>/<code>/<b> tags. Walks
 * the parsed DOM and maps the StarterKit node types; unknown tags fall through to
 * their text content.
 */
function htmlToMarkdown(html: string): string {
  if (!html.includes('<')) return html.trim();

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const renderChildren = (node: Node, listDepth: number): string =>
    Array.from(node.childNodes)
      .map((child) => renderNode(child, listDepth))
      .join('');

  const renderNode = (node: Node, listDepth: number): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = renderChildren(el, listDepth);

    switch (tag) {
      case 'p':
        return `${inner}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 's':
      case 'del':
      case 'strike':
        return `~~${inner}~~`;
      case 'code':
        // Inline code only — <pre> handles its own fenced block below.
        return el.closest('pre') ? inner : `\`${inner}\``;
      case 'pre':
        return `\`\`\`\n${el.textContent ?? ''}\n\`\`\`\n\n`;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `${'#'.repeat(Number(tag[1]))} ${inner}\n\n`;
      case 'a': {
        const href = el.getAttribute('href');
        return href ? `[${inner}](${href})` : inner;
      }
      case 'ul':
      case 'ol':
        return `${renderList(el, tag === 'ol', listDepth)}\n`;
      case 'blockquote':
        return `${inner.trim().split('\n').map((l) => `> ${l}`).join('\n')}\n\n`;
      case 'hr':
        return '---\n\n';
      default:
        return inner;
    }
  };

  const renderList = (listEl: HTMLElement, ordered: boolean, depth: number): string => {
    const indent = '  '.repeat(depth);
    let index = 1;
    return Array.from(listEl.children)
      .filter((c) => c.tagName.toLowerCase() === 'li')
      .map((li) => {
        const marker = ordered ? `${index++}.` : '-';
        // Render the item's own inline content, then any nested lists below it.
        const text = Array.from(li.childNodes)
          .filter((c) => !(c.nodeType === Node.ELEMENT_NODE && ['ul', 'ol'].includes((c as HTMLElement).tagName.toLowerCase())))
          .map((c) => renderNode(c, depth))
          .join('')
          .trim();
        const nested = Array.from(li.children)
          .filter((c) => ['ul', 'ol'].includes(c.tagName.toLowerCase()))
          .map((c) => '\n' + renderList(c as HTMLElement, c.tagName.toLowerCase() === 'ol', depth + 1))
          .join('');
        return `${indent}${marker} ${text}${nested}`;
      })
      .join('\n');
  };

  return renderChildren(doc.body, 0)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  const description = task.description ? htmlToMarkdown(task.description) : '';
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
