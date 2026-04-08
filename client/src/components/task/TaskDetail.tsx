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
  Link,
} from 'lucide-react';
import { useBoardStore } from '../../stores/board.store';
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

  const isCompleted = selectedTask?.completedAt !== null && selectedTask?.completedAt !== undefined;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={closeTaskDetail} />
      <div className={styles.panel} ref={panelRef}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.closeButton}
            onClick={closeTaskDetail}
            aria-label="Close task detail"
            type="button"
          >
            <X size={18} />
          </button>

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
