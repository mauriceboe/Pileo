import type { ReactNode } from 'react';
import {
  ArrowRight, AlignLeft, CheckCircle2, XCircle, UserPlus, UserMinus,
  MessageSquare, Paperclip, Link as LinkIcon, CheckSquare, Square, Edit3,
  Hash, Calendar,
} from 'lucide-react';
import { truncate, stripHtmlText, formatDateOrNull } from '../../utils/activity-format';
import { ColumnBadge, LabelBadge, PriorityBadge, MetaBadge } from './ActivityBadges';
import styles from './task-activity.module.css';

interface Change<T = unknown> {
  oldValue: T;
  newValue: T;
}

export interface DescribedAction {
  text: ReactNode | null;
  preview?: { label: string; content: string; icon?: ReactNode };
  diff?: { oldText: string; newText: string; icon?: ReactNode };
}

function joinParts(parts: ReactNode[]): ReactNode {
  if (parts.length === 0) return null;
  return parts.map((p, i) => (
    <span key={i} className={styles.part}>{i > 0 ? ' · ' : ''}{p}</span>
  ));
}

function describeTaskUpdated(parsed: Record<string, unknown>): DescribedAction {
  const parts: ReactNode[] = [];
  let diff: DescribedAction['diff'];

  if (parsed.title) {
    const change = parsed.title as Change<string>;
    parts.push(<>renamed to <strong className={styles.strongValue}>{truncate(change.newValue ?? '', 60)}</strong></>);
  }
  if (parsed.description) {
    const change = parsed.description as Change<string>;
    const oldText = stripHtmlText(change.oldValue ?? '');
    const newText = stripHtmlText(change.newValue ?? '');
    if (newText || oldText) {
      parts.push(<>updated the description</>);
      diff = { oldText, newText, icon: <AlignLeft size={12} /> };
    } else {
      parts.push(<>cleared the description</>);
    }
  }
  if (parsed.priority) {
    const change = parsed.priority as Change<string>;
    parts.push(<>set priority <PriorityBadge value={change.oldValue ?? 'none'} /> <ArrowRight size={12} className={styles.inlineArrow} /> <PriorityBadge value={change.newValue ?? 'none'} /></>);
  }
  if (parsed.dueDate) {
    const change = parsed.dueDate as Change<string | null>;
    const newDate = formatDateOrNull(change.newValue);
    const oldDate = formatDateOrNull(change.oldValue);
    if (newDate && oldDate) {
      parts.push(<>due date <MetaBadge icon={<Calendar size={11} />} label={oldDate} /> <ArrowRight size={12} className={styles.inlineArrow} /> <MetaBadge icon={<Calendar size={11} />} label={newDate} /></>);
    } else if (newDate) {
      parts.push(<>set due date to <MetaBadge icon={<Calendar size={11} />} label={newDate} /></>);
    } else {
      parts.push(<>removed the due date</>);
    }
  }
  if (parsed.completedAt) {
    const change = parsed.completedAt as Change<string | null>;
    parts.push(change.newValue
      ? <>marked as <MetaBadge icon={<CheckCircle2 size={11} />} label="completed" tone="success" /></>
      : <>unmarked <MetaBadge icon={<CheckCircle2 size={11} />} label="completed" /></>);
  }
  if (parsed.rejectedAt) {
    const change = parsed.rejectedAt as Change<string | null>;
    parts.push(change.newValue
      ? <>marked as <MetaBadge icon={<XCircle size={11} />} label="rejected" tone="danger" /></>
      : <>unmarked <MetaBadge icon={<XCircle size={11} />} label="rejected" /></>);
  }

  if (parts.length === 0) return { text: <>updated this task</> };
  return { text: joinParts(parts), diff };
}

function describeTaskMoved(parsed: Record<string, unknown>): DescribedAction {
  if (parsed.oldColumn && parsed.newColumn) {
    return {
      text: (
        <>
          moved{' '}
          <ColumnBadge name={String(parsed.oldColumn)} color={parsed.oldColumnColor as string | undefined} icon={parsed.oldColumnIcon as string | undefined} />
          <ArrowRight size={12} className={styles.inlineArrow} />
          <ColumnBadge name={String(parsed.newColumn)} color={parsed.newColumnColor as string | undefined} icon={parsed.newColumnIcon as string | undefined} />
        </>
      ),
    };
  }
  if (parsed.column && parsed.oldPosition !== undefined && parsed.newPosition !== undefined) {
    return {
      text: (
        <>
          reordered in{' '}
          <ColumnBadge name={String(parsed.column)} color={parsed.columnColor as string | undefined} icon={parsed.columnIcon as string | undefined} />
          {' '}#{Number(parsed.oldPosition) + 1} → #{Number(parsed.newPosition) + 1}
        </>
      ),
    };
  }
  return { text: <>reordered this task</> };
}

function describeAssignees(parsed: Record<string, unknown>): DescribedAction {
  const added = (parsed.addedNames as string[] | undefined) ?? [];
  const removed = (parsed.removedNames as string[] | undefined) ?? [];
  const parts: ReactNode[] = [];
  if (added.length > 0) {
    parts.push(
      <>
        assigned{' '}
        {added.map((n, i) => (
          <span key={`a-${i}`}>
            <MetaBadge icon={<UserPlus size={11} />} label={`@${n}`} tone="success" />
            {i < added.length - 1 ? ' ' : ''}
          </span>
        ))}
      </>,
    );
  }
  if (removed.length > 0) {
    parts.push(
      <>
        unassigned{' '}
        {removed.map((n, i) => (
          <span key={`r-${i}`}>
            <MetaBadge icon={<UserMinus size={11} />} label={`@${n}`} />
            {i < removed.length - 1 ? ' ' : ''}
          </span>
        ))}
      </>,
    );
  }
  return { text: parts.length > 0 ? joinParts(parts) : <>updated assignees</> };
}

function describeLabels(parsed: Record<string, unknown>): DescribedAction {
  const added = (parsed.addedLabels as Array<{ name: string; color: string }> | undefined) ?? [];
  const removed = (parsed.removedLabels as Array<{ name: string; color: string }> | undefined) ?? [];
  const parts: ReactNode[] = [];
  if (added.length > 0) {
    parts.push(
      <>
        added{' '}
        {added.map((l, i) => (
          <span key={`la-${i}`}>
            <LabelBadge name={l.name} color={l.color} />
            {i < added.length - 1 ? ' ' : ''}
          </span>
        ))}
      </>,
    );
  }
  if (removed.length > 0) {
    parts.push(
      <>
        removed{' '}
        {removed.map((l, i) => (
          <span key={`lr-${i}`}>
            <LabelBadge name={l.name} color={l.color} />
            {i < removed.length - 1 ? ' ' : ''}
          </span>
        ))}
      </>,
    );
  }
  return { text: parts.length > 0 ? joinParts(parts) : <>updated labels</> };
}

export function describeActivity(action: string, details: string | null): DescribedAction {
  const parsed = details ? JSON.parse(details) as Record<string, unknown> : null;

  switch (action) {
    case 'task.created': return { text: <>created this task</> };
    case 'task.updated': return parsed ? describeTaskUpdated(parsed) : { text: <>updated this task</> };
    case 'task.moved': return parsed ? describeTaskMoved(parsed) : { text: <>moved this task</> };

    case 'task.bulk_moved': {
      const count = Number(parsed?.count ?? 0);
      return { text: <>moved <strong>{count}</strong> task{count === 1 ? '' : 's'} into this column</> };
    }

    case 'task.deleted':
      return {
        text: parsed?.title
          ? <>deleted <strong className={styles.strongValue}>{truncate(String(parsed.title), 50)}</strong></>
          : <>deleted a task</>,
      };

    case 'task.assignees.updated': return parsed ? describeAssignees(parsed) : { text: <>updated assignees</> };
    case 'task.labels.updated': return parsed ? describeLabels(parsed) : { text: <>updated labels</> };

    case 'comment.created': {
      const content = parsed?.content ?? parsed?.preview ?? parsed?.body;
      if (content) {
        return {
          text: null,
          preview: { label: 'Comment', content: stripHtmlText(String(content)), icon: <MessageSquare size={12} /> },
        };
      }
      return { text: <>added a comment</> };
    }
    case 'comment.updated': return { text: <>edited a comment</> };
    case 'comment.deleted': return { text: <>deleted a comment</> };

    case 'attachment.uploaded':
      return {
        text: parsed?.fileName
          ? <>uploaded <MetaBadge icon={<Paperclip size={11} />} label={truncate(String(parsed.fileName), 40)} /></>
          : <>uploaded a file</>,
      };
    case 'attachment.deleted':
      return {
        text: parsed?.fileName
          ? <>removed <MetaBadge icon={<Paperclip size={11} />} label={truncate(String(parsed.fileName), 40)} /></>
          : <>removed a file</>,
      };

    case 'link.created':
      return {
        text: parsed?.url
          ? <>added link <MetaBadge icon={<LinkIcon size={11} />} label={truncate(String(parsed.url), 50)} /></>
          : <>added a link</>,
      };
    case 'link.deleted': return { text: <>removed a link</> };

    case 'checklist.created':
      return {
        text: parsed?.title
          ? <>added item <MetaBadge icon={<Square size={11} />} label={truncate(String(parsed.title), 40)} /></>
          : <>added a checklist item</>,
      };
    case 'checklist.updated':
      if (parsed?.isCompleted !== undefined) {
        return {
          text: parsed.isCompleted
            ? <><CheckSquare size={12} className={styles.inlineIcon} /> completed a checklist item</>
            : <><Square size={12} className={styles.inlineIcon} /> unchecked a checklist item</>,
        };
      }
      return { text: <><Edit3 size={12} className={styles.inlineIcon} /> edited a checklist item</> };
    case 'checklist.deleted': return { text: <>removed a checklist item</> };

    default:
      return { text: <><Hash size={12} className={styles.inlineIcon} /> {action.replace(/\./g, ' ')}</> };
  }
}
