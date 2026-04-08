import { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import type { Label } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { useProjectStore } from '../../stores/project.store';
import * as labelsApi from '../../api/labels.api';
import { Badge } from '../ui/Badge';
import styles from './task-labels.module.css';

const LABEL_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4',
  '#84CC16', '#10B981', '#D946EF', '#F43F5E', '#0EA5E9',
  '#78716C', '#64748B', '#1E293B',
];

interface TaskLabelsProps {
  taskId: string;
  labels: Label[];
}

export function TaskLabels({ taskId, labels }: TaskLabelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[5]!);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { projectLabels, updateTaskLabels, fetchProjectLabels } = useBoardStore();
  const selectedProject = useProjectStore((state) => state.selectedProject);

  const activeIds = new Set(labels.map((l) => (l as any).labelId ?? l.id));

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

  const handleToggleLabel = async (labelId: string) => {
    if (activeIds.has(labelId)) {
      await updateTaskLabels(taskId, [], [labelId]);
    } else {
      await updateTaskLabels(taskId, [labelId], []);
    }
  };

  const handleDeleteLabel = async (labelId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('Delete this label from the project?')) return;
    try {
      await labelsApi.deleteLabel(labelId);
      if (selectedProject) await fetchProjectLabels(selectedProject.id);
    } catch { /* handled */ }
  };

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name || !selectedProject) return;
    setIsCreating(true);
    try {
      const label = await labelsApi.createLabel(selectedProject.id, { name, color: newLabelColor });
      await fetchProjectLabels(selectedProject.id);
      await updateTaskLabels(taskId, [label.id], []);
      setNewLabelName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      {labels.length > 0 && (
        <div className={styles.labels}>
          {labels.map((label) => (
            <span key={(label as any).labelId ?? label.id} className={styles.labelChip}>
              <Badge color={label.color}>{label.name}</Badge>
              <button
                type="button"
                className={styles.removeChip}
                onClick={() => handleToggleLabel((label as any).labelId ?? label.id)}
                aria-label={`Remove ${label.name}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button type="button" className={styles.addButton} onClick={() => setIsOpen(!isOpen)}>
        <Plus size={12} />
        Add
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {projectLabels.length === 0 && (
            <p className={styles.emptyMessage}>No labels yet — create one below</p>
          )}

          {projectLabels.map((label) => (
            <div key={label.id} className={styles.labelOption}>
              <button
                type="button"
                className={styles.labelOptionButton}
                onClick={() => handleToggleLabel(label.id)}
              >
                <span className={styles.labelDot} style={{ backgroundColor: label.color }} />
                <span className={styles.labelName}>{label.name}</span>
                {activeIds.has(label.id) && <Check size={14} className={styles.checkMark} />}
              </button>
              <button
                type="button"
                className={styles.deleteLabelButton}
                onClick={(e) => handleDeleteLabel(label.id, e)}
                aria-label={`Delete ${label.name}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <div className={styles.divider} />

          <div className={styles.createSection}>
            <p className={styles.createTitle}>Create new label</p>
            <input
              className={styles.createInput}
              type="text"
              placeholder="Label name..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLabel(); } }}
              disabled={isCreating}
            />
            <div className={styles.colorGrid}>
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorSwatch} ${newLabelColor === color ? styles.colorSwatchSelected : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewLabelColor(color)}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.createButton}
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
