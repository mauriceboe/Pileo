import { create } from 'zustand';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'pileo-theme';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

interface UiState {
  sidebarCollapsed: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
}

// Apply stored theme immediately on load
const initialTheme = getStoredTheme();
applyTheme(initialTheme);

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  theme: initialTheme,

  toggleSidebar: (): void => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setTheme: (theme: Theme): void => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable
    }
    set({ theme });
  },
}));
