import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, GripVertical, Check } from 'lucide-react';
import type { ChecklistItem } from '@pileo/shared';
import * as checklistsApi from '../../api/checklists.api';
import styles from './task-checklist.module.css';

interface TaskChecklistProps {
  taskId: string;
}

export function TaskChecklist({ taskId }: TaskChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await checklistsApi.listChecklistItems(taskId);
      setItems(data);
    } catch {
      // Non-critical
    }
  }, [taskId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (isAdding && addInputRef.current) addInputRef.current.focus(); }, [isAdding]);
  useEffect(() => { if (editingId && editInputRef.current) editInputRef.current.focus(); }, [editingId]);

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      const item = await checklistsApi.createChecklistItem(taskId, { title: trimmed });
      setItems((prev) => [...prev, item]);
      setNewTitle('');
      addInputRef.current?.focus();
    } catch { /* handled */ }
  };

  const handleToggle = async (item: ChecklistItem) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i));
    try {
      const updated = await checklistsApi.updateChecklistItem(item.id, { isCompleted: !item.isCompleted });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isCompleted: item.isCompleted } : i));
    }
  };

  const handleEditSubmit = async (itemId: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) { setEditingId(null); return; }
    try {
      const updated = await checklistsApi.updateChecklistItem(itemId, { title: trimmed });
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch { /* handled */ }
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try { await checklistsApi.deleteChecklistItem(itemId); } catch { fetchItems(); }
  };

  const handleDragStart = (index: number) => { setDragIndex(index); };
  const handleDragOver = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    if (moved) { reordered.splice(targetIndex, 0, moved); setItems(reordered); setDragIndex(targetIndex); }
  };
  const handleDragEnd = async () => {
    if (dragIndex === null) return;
    setDragIndex(null);
    try { await checklistsApi.reorderChecklistItems(taskId, { itemIds: items.map((i) => i.id) }); } catch { fetchItems(); }
  };

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className={styles.container}>
      {totalCount > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={`${styles.progressText} ${allDone ? styles.progressDone : ''}`}>
              {completedCount}/{totalCount} completed
            </span>
            <span className={styles.progressPercent}>{Math.round(progressPercent)}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${allDone ? styles.progressFillDone : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className={styles.itemList}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.item} ${item.isCompleted ? styles.itemCompleted : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className={styles.dragHandle}>
              <GripVertical size={12} />
            </span>

            {/* Custom rounded checkbox */}
            <button
              type="button"
              className={`${styles.checkbox} ${item.isCompleted ? styles.checkboxChecked : ''}`}
              onClick={() => handleToggle(item)}
              aria-label={item.isCompleted ? 'Uncheck' : 'Check'}
            >
              {item.isCompleted && <Check size={12} strokeWidth={3} />}
            </button>

            {editingId === item.id ? (
              <input
                ref={editInputRef}
                className={styles.editInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleEditSubmit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleEditSubmit(item.id); }
                  if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
                }}
              />
            ) : (
              <span
                className={styles.itemTitle}
                onDoubleClick={() => { setEditingId(item.id); setEditTitle(item.title); }}
              >
                {item.title}
              </span>
            )}

            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => handleDelete(item.id)}
              aria-label="Delete"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form className={styles.addForm} onSubmit={handleAddItem}>
          <input
            ref={addInputRef}
            className={styles.addInput}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add an item..."
            onBlur={() => { if (!newTitle.trim()) setIsAdding(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setIsAdding(false); setNewTitle(''); } }}
          />
        </form>
      ) : (
        <button type="button" className={styles.addButton} onClick={() => setIsAdding(true)}>
          <Plus size={14} />
          Add item
        </button>
      )}
    </div>
  );
}
