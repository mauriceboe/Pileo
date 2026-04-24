import { create } from 'zustand';

interface SelectionState {
  activeColumnId: string | null;
  selectedTaskIds: Set<string>;

  enterMode: (columnId: string) => void;
  exitMode: () => void;
  toggleTask: (taskId: string) => void;
  selectMany: (taskIds: string[]) => void;
  clear: () => void;
  isSelected: (taskId: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  activeColumnId: null,
  selectedTaskIds: new Set(),

  enterMode: (columnId: string): void => {
    set({ activeColumnId: columnId, selectedTaskIds: new Set() });
  },

  exitMode: (): void => {
    set({ activeColumnId: null, selectedTaskIds: new Set() });
  },

  toggleTask: (taskId: string): void => {
    set((state) => {
      const next = new Set(state.selectedTaskIds);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return { selectedTaskIds: next };
    });
  },

  selectMany: (taskIds: string[]): void => {
    set({ selectedTaskIds: new Set(taskIds) });
  },

  clear: (): void => {
    set({ selectedTaskIds: new Set() });
  },

  isSelected: (taskId: string): boolean => get().selectedTaskIds.has(taskId),
}));
