import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Column as ColumnType } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { useSelectionStore } from '../../stores/selection.store';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { AddTaskButton } from './AddTaskButton';
import { EditColumnDialog } from './EditColumnDialog';
import styles from './column.module.css';

interface ColumnProps {
  column: ColumnType;
}

export function Column({ column }: ColumnProps) {
  const tasksByColumn = useBoardStore((s) => s.tasksByColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);

  const selectionColumnId = useSelectionStore((s) => s.activeColumnId);
  const selectedTaskIds = useSelectionStore((s) => s.selectedTaskIds);
  const enterMode = useSelectionStore((s) => s.enterMode);
  const exitMode = useSelectionStore((s) => s.exitMode);
  const selectMany = useSelectionStore((s) => s.selectMany);
  const clearSelection = useSelectionStore((s) => s.clear);

  const [isEditing, setIsEditing] = useState(false);

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

  const handleDelete = async () => {
    if (!window.confirm(`Delete column "${column.name}"? Tasks in this column will be lost.`)) {
      return;
    }
    await deleteColumn(column.id);
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) exitMode();
    else enterMode(column.id);
  };

  const handleToggleSelectAll = () => {
    if (!selectionMode) return;
    if (allSelected) clearSelection();
    else selectMany(tasks.map((t) => t.id));
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
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onToggleSelectionMode={handleToggleSelectionMode}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <div className={styles.taskArea} ref={setDroppableRef}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <div className={styles.taskPlaceholder}>No tasks yet</div>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {!selectionMode && <AddTaskButton columnId={column.id} color={column.color} />}

      <EditColumnDialog
        open={isEditing}
        column={column}
        onClose={() => setIsEditing(false)}
      />
    </div>
  );
}
