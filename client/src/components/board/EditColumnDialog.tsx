import { useEffect, useState } from 'react';
import type { Column as ColumnType } from '@pileo/shared';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { Toggle } from '../ui/Toggle';
import { COLUMN_ICONS } from '../../constants/column-icons';
import { useBoardStore } from '../../stores/board.store';
import editStyles from './edit-column-dialog.module.css';

interface EditColumnDialogProps {
  open: boolean;
  column: ColumnType;
  onClose: () => void;
}

export function EditColumnDialog({ open, column, onClose }: EditColumnDialogProps) {
  const updateColumn = useBoardStore((s) => s.updateColumn);

  const [name, setName] = useState(column.name);
  const [color, setColor] = useState(column.color);
  const [icon, setIcon] = useState(column.icon ?? '');
  const [isCompleted, setIsCompleted] = useState(column.isCompleted);
  const [isRejected, setIsRejected] = useState(column.isRejected);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local form state when the column changes upstream or the dialog re-opens.
  useEffect(() => {
    if (!open) return;
    setName(column.name);
    setColor(column.color);
    setIcon(column.icon ?? '');
    setIsCompleted(column.isCompleted);
    setIsRejected(column.isRejected);
  }, [open, column]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await updateColumn(column.id, {
        name: trimmed,
        color,
        icon: icon || null,
        isCompleted,
        isRejected,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <div>
            <label className={editStyles.fieldLabel}>Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </section>

        <section className={editStyles.section}>
          <h3 className={editStyles.sectionTitle}>Icon</h3>
          <div className={editStyles.iconGrid}>
            <button
              type="button"
              className={`${editStyles.iconOption} ${!icon ? editStyles.iconSelected : ''}`}
              onClick={() => setIcon('')}
              title="No icon"
            >
              —
            </button>
            {COLUMN_ICONS.map(({ name: iconName, icon: Icon }) => (
              <button
                key={iconName}
                type="button"
                className={`${editStyles.iconOption} ${icon === iconName ? editStyles.iconSelected : ''}`}
                onClick={() => setIcon(iconName)}
                title={iconName}
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
              checked={isCompleted}
              onChange={(value) => {
                setIsCompleted(value);
                if (value) setIsRejected(false);
              }}
              label="Mark as completed"
              description="Tasks moved into this column are marked complete."
              accent="#22C55E"
            />
            <Toggle
              checked={isRejected}
              onChange={(value) => {
                setIsRejected(value);
                if (value) setIsCompleted(false);
              }}
              label="Mark as rejected"
              description="Tasks moved into this column are marked rejected."
              accent="#9CA3AF"
            />
          </div>
        </section>
      </div>

      <div className={editStyles.actions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} loading={isSaving}>Save</Button>
      </div>
    </Dialog>
  );
}
