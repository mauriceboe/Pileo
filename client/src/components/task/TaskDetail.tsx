import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X,
  Trash2,
  Calendar,
  Tag,
  Users,
  Flag,
  MessageSquare,
  CheckSquare,
  Paperclip,
  Clock,
  AlignLeft,
  CheckCircle2,
  XCircle as XCircle2,
  Link,
  Copy,
  Check,
} from 'lucide-react';
import { useBoardStore } from '../../stores/board.store';
import { listChecklistItems } from '../../api/checklists.api';
import { listLinks } from '../../api/links.api';
import { formatTaskMarkdown } from './formatTaskMarkdown';
import { TaskDescription } from './TaskDescription';
import { TaskDueDate } from './TaskDueDate';
import { TaskLabels } from './TaskLabels';
import { TaskAssignees } from './TaskAssignees';
import { TaskPriority } from './TaskPriority';
import { TaskComments } from './TaskComments';
import { TaskChecklist } from './TaskChecklist';
import { TaskAttachments } from './TaskAttachments';
import { TaskLinks } from './TaskLinks';
import { TaskActivity } from './TaskActivity';
import { TaskCustomFields } from './TaskCustomFields';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import styles from './task-detail.module.css';

export function TaskDetail() {
  const {
    board,
    selectedTask,
    selectedTaskId,
    closeTaskDetail,
    updateTask,
    deleteTask,
  } = useBoardStore();

  const [title, setTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Find which column this task belongs to
  const column = useMemo(() => {
    if (!selectedTask || !board) return null;
    return board.columns.find((col) => col.id === selectedTask.columnId) ?? null;
  }, [selectedTask, board]);

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
    }
  }, [selectedTask]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeTaskDetail();
    }
  }, [closeTaskDetail]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (!trimmed || !selectedTaskId || trimmed === selectedTask?.title) return;
    await updateTask(selectedTaskId, { title: trimmed });
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleInputRef.current?.blur();
    }
  };

  const handleDelete = async () => {
    if (!selectedTaskId) return;
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await deleteTask(selectedTaskId);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
  }, []);

  const handleCopyMarkdown = async () => {
    if (!selectedTask) return;
    try {
      // Checklist items and links live behind their own endpoints, so pull them
      // alongside the already-loaded task before rendering the Markdown.
      const [checklist, links] = await Promise.all([
        listChecklistItems(selectedTask.id).catch(() => []),
        listLinks(selectedTask.id).catch(() => []),
      ]);
      const markdown = formatTaskMarkdown({
        task: selectedTask,
        columnName: column?.name,
        checklist,
        links,
      });
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / denied permission) — leave
      // the button state untouched so the user notices nothing happened.
    }
  };

  const isCompleted = selectedTask?.completedAt !== null && selectedTask?.completedAt !== undefined;
  const isRejected = (selectedTask as any)?.rejectedAt !== null && (selectedTask as any)?.rejectedAt !== undefined;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={closeTaskDetail} />
      <div className={styles.panel} ref={panelRef}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <input
              ref={titleInputRef}
              className={styles.titleInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Task title"
              disabled={!selectedTask}
            />

            {column && (
              <div className={styles.columnIndicator}>
                <span
                  className={styles.columnDot}
                  style={{ backgroundColor: column.color }}
                />
                {column.name}
              </div>
            )}
          </div>

          <button
            className={`${styles.copyButton} ${isCopied ? styles.copyButtonDone : ''}`}
            onClick={handleCopyMarkdown}
            aria-label="Copy task as Markdown"
            title={isCopied ? 'Copied!' : 'Copy task as Markdown'}
            type="button"
            disabled={!selectedTask}
          >
            {isCopied ? <Check size={17} /> : <Copy size={17} />}
          </button>

          <button
            className={styles.closeButton}
            onClick={closeTaskDetail}
            aria-label="Close task detail"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.headerDivider} />

        {!selectedTask ? (
          <div className={styles.loading}>
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Body: main + sidebar */}
            <div className={styles.body}>
              <div className={styles.mainContent}>
                {/* Description */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <AlignLeft size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Description</h4>
                  </div>
                  <TaskDescription
                    taskId={selectedTask.id}
                    description={selectedTask.description}
                  />
                </div>

                {/* Checklist */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <CheckSquare size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Checklist</h4>
                  </div>
                  <TaskChecklist taskId={selectedTask.id} />
                </div>

                {/* Attachments */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <Paperclip size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Attachments</h4>
                  </div>
                  <TaskAttachments taskId={selectedTask.id} />
                </div>

                {/* Links */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <Link size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Links</h4>
                  </div>
                  <TaskLinks taskId={selectedTask.id} />
                </div>
              </div>

              {/* Middle column */}
              <div className={styles.secondaryContent}>
                {/* Custom Fields — only rendered if project has enabled fields */}
                {board && (
                  <TaskCustomFields
                    taskId={selectedTask.id}
                    projectId={board.projectId}
                    sectionClassName={styles.section}
                    headerClassName={styles.sectionHeader}
                    headerIconClassName={styles.sectionIcon}
                    headerTitleClassName={styles.sectionTitle}
                  />
                )}

                {/* Comments */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <MessageSquare size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Comments</h4>
                  </div>
                  <TaskComments taskId={selectedTask.id} />
                </div>

                {/* Activity */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>
                      <Clock size={15} />
                    </span>
                    <h4 className={styles.sectionTitle}>Activity</h4>
                  </div>
                  <TaskActivity taskId={selectedTask.id} />
                </div>
              </div>

              {/* Sidebar */}
              <div className={styles.sidebar}>
                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarLabelRow}>
                    <span className={styles.sidebarIcon}><Users size={13} /></span>
                    <span className={styles.sidebarLabel}>Assignees</span>
                  </div>
                  <TaskAssignees
                    taskId={selectedTask.id}
                    assignees={selectedTask.assignees}
                  />
                </div>

                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarLabelRow}>
                    <span className={styles.sidebarIcon}><Calendar size={13} /></span>
                    <span className={styles.sidebarLabel}>Due Date</span>
                  </div>
                  <TaskDueDate
                    taskId={selectedTask.id}
                    dueDate={selectedTask.dueDate}
                    isCompleted={!!selectedTask.completedAt}
                    isRejected={!!selectedTask.rejectedAt}
                  />
                </div>

                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarLabelRow}>
                    <span className={styles.sidebarIcon}><Flag size={13} /></span>
                    <span className={styles.sidebarLabel}>Priority</span>
                  </div>
                  <TaskPriority
                    taskId={selectedTask.id}
                    priority={selectedTask.priority}
                  />
                </div>

                <div className={styles.sidebarSection}>
                  <div className={styles.sidebarLabelRow}>
                    <span className={styles.sidebarIcon}><Tag size={13} /></span>
                    <span className={styles.sidebarLabel}>Labels</span>
                  </div>
                  <TaskLabels
                    taskId={selectedTask.id}
                    labels={selectedTask.labels}
                  />
                </div>

                {/* Complete / Uncomplete toggle */}
                <button
                  type="button"
                  className={`${styles.completeButton} ${isCompleted ? styles.completedButton : ''}`}
                  onClick={() => {
                    if (isCompleted) {
                      updateTask(selectedTask.id, { completedAt: null } as any);
                    } else {
                      updateTask(selectedTask.id, { completedAt: new Date() } as any);
                    }
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>

                <button
                  type="button"
                  className={`${styles.rejectButton} ${isRejected ? styles.rejectedButton : ''}`}
                  onClick={() => {
                    if (isRejected) {
                      updateTask(selectedTask.id, { rejectedAt: null } as any);
                    } else {
                      updateTask(selectedTask.id, { rejectedAt: new Date() } as any);
                    }
                  }}
                >
                  <XCircle2 size={16} />
                  {isRejected ? 'Rejected' : 'Reject'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.footerMeta}>
                <span className={styles.footerMetaIcon}><Clock size={12} /></span>
                Created {new Date(selectedTask.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                disabled={isDeleting}
                type="button"
              >
                <Trash2 size={13} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
