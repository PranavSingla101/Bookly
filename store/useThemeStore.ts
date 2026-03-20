import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
        }
      },
      setTheme: (theme: Theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
