import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark,
  Bell, Globe, Lightbulb, Shield, Check, CheckCircle,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone,
  Palette, Pencil, Play, Search, Send, Settings, Smile,
  Sparkles, ThumbsUp, TrendingUp, Upload, Users,
} from 'lucide-react';
import type { Column as ColumnType } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { useSelectionStore } from '../../stores/selection.store';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { AddTaskButton } from './AddTaskButton';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { Toggle } from '../ui/Toggle';
import styles from './column.module.css';
import editStyles from './edit-column-dialog.module.css';

const COLUMN_ICONS = [
  { name: 'check', icon: Check },
  { name: 'checkCircle', icon: CheckCircle },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'thumbsUp', icon: ThumbsUp },
  { name: 'smile', icon: Smile },
  { name: 'sparkles', icon: Sparkles },
  { name: 'zap', icon: Zap },
  { name: 'rocket', icon: Rocket },
  { name: 'target', icon: Target },
  { name: 'flag', icon: Flag },
  { name: 'play', icon: Play },
  { name: 'trendingUp', icon: TrendingUp },
  { name: 'inbox', icon: Inbox },
  { name: 'layers', icon: Layers },
  { name: 'clock', icon: Clock },
  { name: 'eye', icon: Eye },
  { name: 'search', icon: Search },
  { name: 'pencil', icon: Pencil },
  { name: 'send', icon: Send },
  { name: 'upload', icon: Upload },
  { name: 'coffee', icon: Coffee },
  { name: 'sun', icon: Sun },
  { name: 'moon', icon: Moon },
  { name: 'cloud', icon: Cloud },
  { name: 'flame', icon: Flame },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'gift', icon: Gift },
  { name: 'award', icon: Award },
  { name: 'bookmark', icon: Bookmark },
  { name: 'bell', icon: Bell },
  { name: 'globe', icon: Globe },
  { name: 'lightbulb', icon: Lightbulb },
  { name: 'shield', icon: Shield },
  { name: 'mail', icon: Mail },
  { name: 'map', icon: Map },
  { name: 'megaphone', icon: Megaphone },
  { name: 'palette', icon: Palette },
  { name: 'users', icon: Users },
  { name: 'home', icon: Home },
  { name: 'settings', icon: Settings },
];

interface ColumnProps {
  column: ColumnType;
}

export function Column({ column }: ColumnProps) {
  const { updateColumn, deleteColumn, tasksByColumn } = useBoardStore();
  const {
    activeColumnId: selectionColumnId,
    selectedTaskIds,
    enterMode,
    exitMode,
    selectMany,
    clear: clearSelection,
  } = useSelectionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editColor, setEditColor] = useState(column.color);
  const [editIcon, setEditIcon] = useState(column.icon ?? '');
  const [editIsCompleted, setEditIsCompleted] = useState(column.isCompleted);
  const [editIsRejected, setEditIsRejected] = useState(column.isRejected);
  const [isSaving, setIsSaving] = useState(false);

  const tasks = tasksByColumn[column.id] ?? [];
  const taskIds = tasks.map((task) => task.id);

  const selectionMode = selectionColumnId === column.id;
  const selectedCount = selectionMode
    ? tasks.filter((t) => selectedTaskIds.has(t.id)).length
    : 0;
  const allSelected = selectionMode && tasks.length > 0 && selectedCount === tasks.length;

  const {
    attributes: sortAttributes,
    listeners: sortListeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.35 : 1,
  };

  const handleEdit = () => {
    setEditName(column.name);
    setEditColor(column.color);
    setEditIcon(column.icon ?? '');
    setEditIsCompleted(column.isCompleted);
    setEditIsRejected(column.isRejected);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete column "${column.name}"? Tasks in this column will be lost.`)) {
      return;
    }
    await deleteColumn(column.id);
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      exitMode();
    } else {
      enterMode(column.id);
    }
  };

  const handleToggleSelectAll = () => {
    if (!selectionMode) return;
    if (allSelected) {
      clearSelection();
    } else {
      selectMany(tasks.map((t) => t.id));
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateColumn(column.id, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon || null,
        isCompleted: editIsCompleted,
        isRejected: editIsRejected,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      className={`${styles.column} ${selectionMode ? styles.columnSelecting : ''}`}
      {...sortAttributes}
    >
      <ColumnHeader
        name={column.name}
        color={column.color}
        icon={column.icon}
        taskCount={tasks.length}
        selectionMode={selectionMode}
        selectedCount={selectedCount}
        allSelected={allSelected}
        dragListeners={sortListeners}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleSelectionMode={handleToggleSelectionMode}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <div className={styles.taskArea} ref={setDroppableRef}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <div className={styles.taskPlaceholder}>
              No tasks yet
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isCompleted={column.isCompleted}
            />
          ))}
        </SortableContext>
      </div>

      {!selectionMode && <AddTaskButton columnId={column.id} color={column.color} />}

      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title={
          <span className={editStyles.dialogTitle}>
            <span className={editStyles.dialogTitleName}>{column.name}</span>
            <span className={editStyles.dialogTitleBadge}>Column Settings</span>
          </span>
        }
        ariaLabel={`${column.name} — Column Settings`}
        size="xl"
      >
        <div className={editStyles.grid}>
          <section className={editStyles.section}>
            <h3 className={editStyles.sectionTitle}>Basics</h3>
            <Input
              label="Column Name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              autoFocus
            />
            <div>
              <label className={editStyles.fieldLabel}>Color</label>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
          </section>

          <section className={editStyles.section}>
            <h3 className={editStyles.sectionTitle}>Icon</h3>
            <div className={editStyles.iconGrid}>
              <button
                type="button"
                className={`${editStyles.iconOption} ${!editIcon ? editStyles.iconSelected : ''}`}
                onClick={() => setEditIcon('')}
                title="No icon"
              >
                —
              </button>
              {COLUMN_ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={`${editStyles.iconOption} ${editIcon === name ? editStyles.iconSelected : ''}`}
                  onClick={() => setEditIcon(name)}
                  title={name}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </section>

          <section className={editStyles.section}>
            <h3 className={editStyles.sectionTitle}>Behavior</h3>
            <p className={editStyles.sectionHint}>
              Automatic status when a task is moved into this column.
            </p>
            <div className={editStyles.toggleGroup}>
              <Toggle
                checked={editIsCompleted}
                onChange={(value) => {
                  setEditIsCompleted(value);
                  if (value) setEditIsRejected(false);
                }}
                label="Mark as completed"
                description="Tasks moved into this column are marked complete."
                accent="#22C55E"
              />
              <Toggle
                checked={editIsRejected}
                onChange={(value) => {
                  setEditIsRejected(value);
                  if (value) setEditIsCompleted(false);
                }}
                label="Mark as rejected"
                description="Tasks moved into this column are marked rejected."
                accent="#9CA3AF"
              />
            </div>
          </section>
        </div>

        <div className={editStyles.actions}>
          <Button variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} loading={isSaving}>
            Save
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
