import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgInput: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  placeholderText: string;
  filterBtnBg: string;
  filterBtnText: string;
  chipActiveBg: string;
  roleBadgeBg: string;
  roleBadgeAdminBg: string;
}

const dark: ThemeColors = {
  bg: '#0d0d0d',
  bgCard: '#141414',
  bgInput: '#141414',
  border: '#1e1e1e',
  borderLight: '#222',
  text: '#ffffff',
  textSecondary: '#555555',
  textMuted: '#444444',
  accent: '#e53935',
  placeholderText: '#444444',
  filterBtnBg: '#1a1a1a',
  filterBtnText: '#aaaaaa',
  chipActiveBg: '#1a0000',
  roleBadgeBg: '#1e2e1e',
  roleBadgeAdminBg: '#2e1e1e',
};

const light: ThemeColors = {
  bg: '#f2f2f7',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  border: '#e0e0e0',
  borderLight: '#cccccc',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#999999',
  accent: '#e53935',
  placeholderText: '#aaaaaa',
  filterBtnBg: '#e8e8ed',
  filterBtnText: '#555555',
  chipActiveBg: '#ffebee',
  roleBadgeBg: '#e8f5e9',
  roleBadgeAdminBg: '#ffebee',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: dark,
  toggle: () => {},
});

const THEME_KEY = 'app_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then(val => {
      if (val === 'light') setIsDark(false);
    });
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    SecureStore.setItemAsync(THEME_KEY, next ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? dark : light, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
