import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { type ThemePreference, ThemeProvider } from '../ThemeProvider.tsx';

// Renders `ui` inside the theme provider, as an app does.
export function renderThemed(ui: ReactElement, preference: ThemePreference = 'system') {
  return render(<ThemeProvider initialPreference={preference}>{ui}</ThemeProvider>);
}
