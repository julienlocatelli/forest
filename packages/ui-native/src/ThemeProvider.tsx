import { type Colors, type ThemeName, themes } from '@forest/design-tokens';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

// `system` follows the phone's light or dark setting; a theme name overrides it.
export type ThemePreference = 'system' | ThemeName;

export interface Theme {
  // The theme in use, after resolving `system`.
  name: ThemeName;
  colors: Colors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  initialPreference?: ThemePreference;
}

export function ThemeProvider({ children, initialPreference = 'system' }: ThemeProviderProps) {
  // Re-renders when the phone setting changes, so every component recolors without a restart.
  const scheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const name: ThemeName = preference === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preference;
  const theme = useMemo(() => ({ name, colors: themes[name], preference, setPreference }), [name, preference]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme needs a theme: Wrap the app in <ThemeProvider>.');
  return theme;
}
