import { create } from 'zustand';
import type { Column, CreateColumnInput, UpdateColumnInput, Label } from '@pileo/shared';
import type { BoardWithColumns } from '../api/boards.api';
import type { TaskWithRelations, BoardTasks } from '../api/tasks.api';
import * as boardsApi from '../api/boards.api';
import * as tasksApi from '../api/tasks.api';
import * as labelsApi from '../api/labels.api';

interface BoardState {
  board: BoardWithColumns | null;
  tasksByColumn: BoardTasks;
  projectLabels: Label[];
  isLoading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  selectedTask: TaskWithRelations | null;
  isTaskDetailOpen: boolean;

  setBoard: (board: any) => void;
  fetchBoard: (boardId: string) => Promise<void>;
  fetchTasks: (boardId: string) => Promise<void>;
  fetchProjectLabels: (projectId: string) => Promise<void>;
  addColumn: (boardId: string, input: CreateColumnInput) => Promise<void>;
  updateColumn: (columnId: string, input: UpdateColumnInput) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;

  createTask: (columnId: string, title: string) => Promise<string>;
  updateTask: (taskId: string, data: Parameters<typeof tasksApi.updateTask>[1]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, newPosition: number) => Promise<void>;
  moveTaskOptimistic: (
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    newIndex: number,
  ) => void;

  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  refreshTaskDetail: (taskId: string) => Promise<void>;
  updateTaskAssignees: (taskId: string, add: string[], remove: string[]) => Promise<void>;
  updateTaskLabels: (taskId: string, add: string[], remove: string[]) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  tasksByColumn: {},
  projectLabels: [],
  isLoading: false,
  error: null,
  selectedTaskId: null,
  selectedTask: null,
  isTaskDetailOpen: false,

  setBoard: (board: any): void => { set({ board }); },

  fetchBoard: async (boardId: string): Promise<void> => {
    set({ isLoading: true, error: null, tasksByColumn: {} });
    try {
      const board = await boardsApi.getBoard(boardId);
      set({ board, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load board';
      set({ error: message, isLoading: false });
    }
  },

  fetchTasks: async (boardId: string): Promise<void> => {
    try {
      const tasksByColumn = await tasksApi.listTasks(boardId);
      set({ tasksByColumn });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      set({ error: message });
    }
  },

  fetchProjectLabels: async (projectId: string): Promise<void> => {
    try {
      const projectLabels = await labelsApi.listLabels(projectId);
      set({ projectLabels });
    } catch {
      // Non-critical, labels can load later
    }
  },

  addColumn: async (boardId: string, input: CreateColumnInput): Promise<void> => {
    const column = await boardsApi.createColumn(boardId, input);
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          columns: [...state.board.columns, column],
        },
        tasksByColumn: { ...state.tasksByColumn, [column.id]: [] },
      };
    });
  },

  updateColumn: async (columnId: string, input: UpdateColumnInput): Promise<void> => {
    const updated = await boardsApi.updateColumn(columnId, input);
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board,
          columns: state.board.columns.map((column) =>
            column.id === columnId ? updated : column,
          ),
        },
      };
    });
  },

  deleteColumn: async (columnId: string): Promise<void> => {
    await boardsApi.deleteColumn(columnId);
    set((state) => {
      if (!state.board) return state;
      const { [columnId]: _removed, ...remainingTasks } = state.tasksByColumn;
      return {
        board: {
          ...state.board,
          columns: state.board.columns.filter((column) => column.id !== columnId),
        },
        tasksByColumn: remainingTasks,
      };
    });
  },

  reorderColumns: async (boardId: string, columnIds: string[]): Promise<void> => {
    set((state) => {
      if (!state.board) return state;
      const columnMap = new Map(
        state.board.columns.map((column) => [column.id, column]),
      );
      const reordered = columnIds
        .map((id) => columnMap.get(id))
        .filter((column): column is Column => column !== undefined);
      return {
        board: {
          ...state.board,
          columns: reordered,
        },
      };
    });

    try {
      await boardsApi.reorderColumns(boardId, { columnIds });
    } catch {
      const board = await boardsApi.getBoard(boardId);
      set({ board });
    }
  },

  createTask: async (columnId: string, title: string): Promise<string> => {
    const task = await tasksApi.createTask(columnId, { title, priority: 'none' });
    set((state) => {
      const columnTasks = state.tasksByColumn[columnId] ?? [];
      return {
        tasksByColumn: {
          ...state.tasksByColumn,
          [columnId]: [...columnTasks, task],
        },
      };
    });
    return task.id;
  },

  updateTask: async (taskId, data): Promise<void> => {
    const updated = await tasksApi.updateTask(taskId, data);
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      for (const columnId of Object.keys(newTasksByColumn)) {
        const tasks = newTasksByColumn[columnId];
        if (!tasks) continue;
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[index] = updated;
          newTasksByColumn[columnId] = updatedTasks;
          break;
        }
      }
      return {
        tasksByColumn: newTasksByColumn,
        selectedTask: state.selectedTask?.id === taskId ? updated : state.selectedTask,
      };
    });
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await tasksApi.deleteTask(taskId);
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      for (const columnId of Object.keys(newTasksByColumn)) {
        const tasks = newTasksByColumn[columnId];
        if (!tasks) continue;
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index !== -1) {
          newTasksByColumn[columnId] = tasks.filter((task) => task.id !== taskId);
          break;
        }
      }
      return {
        tasksByColumn: newTasksByColumn,
        isTaskDetailOpen: state.selectedTaskId === taskId ? false : state.isTaskDetailOpen,
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
        selectedTask: state.selectedTaskId === taskId ? null : state.selectedTask,
      };
    });
  },

  moveTaskOptimistic: (
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    newIndex: number,
  ): void => {
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      const sourceTasks = [...(newTasksByColumn[fromColumnId] ?? [])];
      const taskIndex = sourceTasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) return state;

      const [movedTask] = sourceTasks.splice(taskIndex, 1);
      if (!movedTask) return state;

      if (fromColumnId === toColumnId) {
        sourceTasks.splice(newIndex, 0, { ...movedTask, columnId: toColumnId });
        newTasksByColumn[fromColumnId] = sourceTasks;
      } else {
        const destinationTasks = [...(newTasksByColumn[toColumnId] ?? [])];
        destinationTasks.splice(newIndex, 0, { ...movedTask, columnId: toColumnId });
        newTasksByColumn[fromColumnId] = sourceTasks;
        newTasksByColumn[toColumnId] = destinationTasks;
      }

      return { tasksByColumn: newTasksByColumn };
    });
  },

  moveTask: async (taskId: string, toColumnId: string, newPosition: number): Promise<void> => {
    try {
      await tasksApi.moveTask(taskId, { columnId: toColumnId, position: newPosition });
      // Re-fetch to get updated completedAt from server (column rules)
      const { board } = get();
      if (board) {
        const tasksByColumn = await tasksApi.listTasks(board.id);
        set({ tasksByColumn });
      }
    } catch {
      // Rollback by re-fetching tasks
      const { board } = get();
      if (board) {
        const tasksByColumn = await tasksApi.listTasks(board.id);
        set({ tasksByColumn });
      }
    }
  },

  openTaskDetail: (taskId: string): void => {
    set({ selectedTaskId: taskId, isTaskDetailOpen: true, selectedTask: null });
    // Broadcast focus to other users
    import('./websocket.store').then(({ useWebSocketStore }) => {
      const ws = useWebSocketStore.getState().wsInstance;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'presence:task:focus', payload: { taskId } }));
      }
    });
    // Fetch the full task detail
    tasksApi.getTask(taskId).then((task) => {
      set((state) => {
        if (state.selectedTaskId !== taskId) return state;
        return { selectedTask: task };
      });
    });
  },

  closeTaskDetail: (): void => {
    const { selectedTask, selectedTaskId } = get();

    // Auto-delete empty tasks (created via + button with default "Untitled" title)
    if (selectedTask && selectedTaskId) {
      const title = (selectedTask.title ?? '').trim();
      const desc = (selectedTask.description ?? '').trim();
      const isEmpty = (title === '' || title === 'Untitled')
        && desc === ''
        && (selectedTask.assignees?.length ?? 0) === 0
        && (selectedTask.labels?.length ?? 0) === 0
        && (selectedTask.commentCount ?? 0) === 0
        && (selectedTask.checklistTotal ?? 0) === 0
        && (selectedTask.attachmentCount ?? 0) === 0;

      if (isEmpty) {
        // Delete silently in background
        get().deleteTask(selectedTaskId);
      }
    }

    set({ isTaskDetailOpen: false, selectedTaskId: null, selectedTask: null });
    // Broadcast unfocus
    import('./websocket.store').then(({ useWebSocketStore }) => {
      const ws = useWebSocketStore.getState().wsInstance;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'presence:task:focus', payload: { taskId: null } }));
      }
    });
  },

  refreshTaskDetail: async (taskId: string): Promise<void> => {
    const task = await tasksApi.getTask(taskId);
    set((state) => {
      if (state.selectedTaskId !== taskId) return state;

      // Also update in tasksByColumn
      const newTasksByColumn = { ...state.tasksByColumn };
      for (const columnId of Object.keys(newTasksByColumn)) {
        const tasks = newTasksByColumn[columnId];
        if (!tasks) continue;
        const index = tasks.findIndex((t) => t.id === taskId);
        if (index !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[index] = task;
          newTasksByColumn[columnId] = updatedTasks;
          break;
        }
      }

      return { selectedTask: task, tasksByColumn: newTasksByColumn };
    });
  },

  updateTaskAssignees: async (taskId: string, add: string[], remove: string[]): Promise<void> => {
    const updated = await tasksApi.updateAssignees(taskId, { add, remove });
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      for (const columnId of Object.keys(newTasksByColumn)) {
        const tasks = newTasksByColumn[columnId];
        if (!tasks) continue;
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[index] = updated;
          newTasksByColumn[columnId] = updatedTasks;
          break;
        }
      }
      return {
        tasksByColumn: newTasksByColumn,
        selectedTask: state.selectedTask?.id === taskId ? updated : state.selectedTask,
      };
    });
  },

  updateTaskLabels: async (taskId: string, add: string[], remove: string[]): Promise<void> => {
    const updated = await tasksApi.updateLabels(taskId, { add, remove });
    set((state) => {
      const newTasksByColumn = { ...state.tasksByColumn };
      for (const columnId of Object.keys(newTasksByColumn)) {
        const tasks = newTasksByColumn[columnId];
        if (!tasks) continue;
        const index = tasks.findIndex((task) => task.id === taskId);
        if (index !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[index] = updated;
          newTasksByColumn[columnId] = updatedTasks;
          break;
        }
      }
      return {
        tasksByColumn: newTasksByColumn,
        selectedTask: state.selectedTask?.id === taskId ? updated : state.selectedTask,
      };
    });
  },
}));
