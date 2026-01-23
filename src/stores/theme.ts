import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tauriCmd } from '../utils/tauri';

// Theme configuration
export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: 'orange',
    name: '活力橙 (默认)',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      secondary: '#fb923c',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'blue',
    name: '商务蓝',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      secondary: '#60a5fa',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'green',
    name: '清新绿',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      secondary: '#4ade80',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'purple',
    name: '神秘紫',
    colors: {
      primary: '#a855f7',
      primaryHover: '#9333ea',
      secondary: '#c084fc',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'dark',
    name: '深色模式',
    colors: {
      primary: '#f97316',
      primaryHover: '#fb923c',
      secondary: '#fb923c',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
];

export const useThemeStore = defineStore('theme', () => {
  // Load saved theme from database
  const currentThemeId = ref('orange');

  // Load theme from database on init
  const loadThemeFromDB = async () => {
    try {
      const savedThemeId = await tauriCmd('kv_get', { key: 'app_theme' });
      if (savedThemeId && typeof savedThemeId === 'string') {
        currentThemeId.value = savedThemeId;
      }
    } catch (error) {
      console.warn('Failed to load theme from database:', error);
      // Fallback to default theme
    }
  };
  
  const currentTheme = computed(() => {
    return themes.find(t => t.id === currentThemeId.value) || themes[0];
  });

  // Apply theme CSS variables
  const applyTheme = () => {
    const theme = currentTheme.value;
    const root = document.documentElement;

    // Set CSS variables
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-primary-hover', theme.colors.primaryHover);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);

    // Save to database
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'app_theme', value: currentThemeId.value });
      } catch (error) {
        console.error('Failed to save theme to database:', error);
      }
    })();

    // Update body class for dark mode
    if (currentThemeId.value === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  // Change theme
  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      currentThemeId.value = themeId;
      applyTheme();
    }
  };

  // Initialize theme on load
  const init = async () => {
    await loadThemeFromDB();
    applyTheme();
  };

  // Auto-initialize
  init();

  return {
    themes,
    currentThemeId,
    currentTheme,
    setTheme,
    applyTheme,
    init,
  };
});
