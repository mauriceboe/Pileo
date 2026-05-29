import { useState, useEffect, useCallback, useRef, useMemo, type KeyboardEvent } from 'react';
import {
  X, Trash2, Calendar, Tag, Users, Flag, MessageSquare, CheckSquare,
  Paperclip, Clock, AlignLeft, CheckCircle2, XCircle as XCircle2, Link,
  Copy, Check,
} from 'lucide-react';
import { useBoardStore } from '../../stores/board.store';
import { useCopyTaskMarkdown } from '../../hooks/useCopyTaskMarkdown';
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
import { TaskSection, TaskSidebarSection } from './TaskSection';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import styles from './task-detail.module.css';

export function TaskDetail() {
  const board = useBoardStore((s) => s.board);
  const selectedTask = useBoardStore((s) => s.selectedTask);
  const selectedTaskId = useBoardStore((s) => s.selectedTaskId);
  const closeTaskDetail = useBoardStore((s) => s.closeTaskDetail);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const [title, setTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const column = useMemo(() => {
    if (!selectedTask || !board) return null;
    return board.columns.find((col) => col.id === selectedTask.columnId) ?? null;
  }, [selectedTask, board]);

  const { isCopied, copy } = useCopyTaskMarkdown(selectedTask, column?.name);

  useEffect(() => {
    if (selectedTask) setTitle(selectedTask.title);
  }, [selectedTask]);

  const handleKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    if (event.key === 'Escape') closeTaskDetail();
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

  const handleTitleKeyDown = (event: KeyboardEvent) => {
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

  const isCompleted = !!selectedTask?.completedAt;
  const isRejected = !!selectedTask?.rejectedAt;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={closeTaskDetail} />
      <div className={styles.panel}>
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
                <span className={styles.columnDot} style={{ backgroundColor: column.color }} />
                {column.name}
              </div>
            )}
          </div>

          <button
            className={`${styles.copyButton} ${isCopied ? styles.copyButtonDone : ''}`}
            onClick={copy}
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
          <div className={styles.loading}><LoadingSpinner /></div>
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.mainContent}>
                <TaskSection icon={<AlignLeft size={15} />} title="Description">
                  <TaskDescription taskId={selectedTask.id} description={selectedTask.description} />
                </TaskSection>
                <TaskSection icon={<CheckSquare size={15} />} title="Checklist">
                  <TaskChecklist taskId={selectedTask.id} />
                </TaskSection>
                <TaskSection icon={<Paperclip size={15} />} title="Attachments">
                  <TaskAttachments taskId={selectedTask.id} />
                </TaskSection>
                <TaskSection icon={<Link size={15} />} title="Links">
                  <TaskLinks taskId={selectedTask.id} />
                </TaskSection>
              </div>

              <div className={styles.secondaryContent}>
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
                <TaskSection icon={<MessageSquare size={15} />} title="Comments">
                  <TaskComments taskId={selectedTask.id} />
                </TaskSection>
                <TaskSection icon={<Clock size={15} />} title="Activity">
                  <TaskActivity taskId={selectedTask.id} />
                </TaskSection>
              </div>

              <div className={styles.sidebar}>
                <TaskSidebarSection icon={<Users size={13} />} label="Assignees">
                  <TaskAssignees taskId={selectedTask.id} assignees={selectedTask.assignees} />
                </TaskSidebarSection>
                <TaskSidebarSection icon={<Calendar size={13} />} label="Due Date">
                  <TaskDueDate
                    taskId={selectedTask.id}
                    dueDate={selectedTask.dueDate}
                    isCompleted={isCompleted}
                    isRejected={isRejected}
                  />
                </TaskSidebarSection>
                <TaskSidebarSection icon={<Flag size={13} />} label="Priority">
                  <TaskPriority taskId={selectedTask.id} priority={selectedTask.priority} />
                </TaskSidebarSection>
                <TaskSidebarSection icon={<Tag size={13} />} label="Labels">
                  <TaskLabels taskId={selectedTask.id} labels={selectedTask.labels} />
                </TaskSidebarSection>

                <button
                  type="button"
                  className={`${styles.completeButton} ${isCompleted ? styles.completedButton : ''}`}
                  onClick={() => updateTask(selectedTask.id, {
                    completedAt: isCompleted ? null : new Date(),
                  })}
                >
                  <CheckCircle2 size={16} />
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>

                <button
                  type="button"
                  className={`${styles.rejectButton} ${isRejected ? styles.rejectedButton : ''}`}
                  onClick={() => updateTask(selectedTask.id, {
                    rejectedAt: isRejected ? null : new Date(),
                  })}
                >
                  <XCircle2 size={16} />
                  {isRejected ? 'Rejected' : 'Reject'}
                </button>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerMeta}>
                <span className={styles.footerMetaIcon}><Clock size={12} /></span>
                Created {new Date(selectedTask.createdAt).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
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
