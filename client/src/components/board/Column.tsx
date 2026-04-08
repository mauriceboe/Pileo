import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
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
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { AddTaskButton } from './AddTaskButton';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editColor, setEditColor] = useState(column.color);
  const [editIcon, setEditIcon] = useState(column.icon ?? '');
  const [editIsCompleted, setEditIsCompleted] = useState(column.isCompleted);
  const [isSaving, setIsSaving] = useState(false);

  const tasks = tasksByColumn[column.id] ?? [];
  const taskIds = tasks.map((task) => task.id);

  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const handleEdit = () => {
    setEditName(column.name);
    setEditColor(column.color);
    setEditIcon(column.icon ?? '');
    setEditIsCompleted(column.isCompleted);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete column "${column.name}"? Tasks in this column will be lost.`)) {
      return;
    }
    await deleteColumn(column.id);
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
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.column}>
      <ColumnHeader
        name={column.name}
        color={column.color}
        icon={column.icon}
        taskCount={tasks.length}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <div className={styles.taskArea} ref={setNodeRef}>
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

      <AddTaskButton columnId={column.id} color={column.color} />

      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Column"
      >
        <div className={editStyles.form}>
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
          <div>
            <label className={editStyles.fieldLabel}>Icon (optional)</label>
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
          </div>
          <label className={editStyles.toggleRow}>
            <input
              type="checkbox"
              checked={editIsCompleted}
              onChange={(event) => setEditIsCompleted(event.target.checked)}
              className={editStyles.toggleCheckbox}
            />
            <span className={editStyles.toggleLabel}>
              Mark tasks as completed when moved here
            </span>
          </label>
          <div className={editStyles.actions}>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={isSaving}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
