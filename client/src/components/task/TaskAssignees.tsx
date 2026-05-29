import { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import type { TaskAssigneeView } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { useProjectStore } from '../../stores/project.store';
import { Avatar } from '../ui/Avatar';
import styles from './task-assignees.module.css';

interface TaskAssigneesProps {
  taskId: string;
  assignees: TaskAssigneeView[];
}

export function TaskAssignees({ taskId, assignees }: TaskAssigneesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateTaskAssignees = useBoardStore((state) => state.updateTaskAssignees);
  const projectMembers = useProjectStore((state) => state.members);

  const assignedIds = new Set(assignees.map((assignee) => assignee.userId));

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleMember = async (userId: string) => {
    if (assignedIds.has(userId)) {
      await updateTaskAssignees(taskId, [], [userId]);
    } else {
      await updateTaskAssignees(taskId, [userId], []);
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      {assignees.length > 0 && (
        <div className={styles.assignees}>
          {assignees.map((assignee) => (
            <div key={assignee.userId} className={styles.assigneeChip}>
              <Avatar name={assignee.displayName} src={assignee.avatarPath} size="sm" />
              <span>{assignee.displayName}</span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleToggleMember(assignee.userId)}
              >
                <X size={10} />
              </button>

            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.addButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus size={12} />
        Add
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {projectMembers.length === 0 && (
            <p className={styles.emptyMessage}>No project members</p>
          )}

          {projectMembers.map((member) => (
            <button
              key={member.userId}
              type="button"
              className={styles.memberOption}
              onClick={() => handleToggleMember(member.userId)}
            >
              <Avatar name={member.user?.displayName ?? 'User'} size="sm" />
              <span className={styles.memberName}>
                {member.user?.displayName ?? 'User'}
              </span>
              {assignedIds.has(member.userId) && (
                <Check size={14} className={styles.checkMark} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
