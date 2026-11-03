import { type ThemeName, themes } from "@forest/design-tokens";

// Where the front keeps the chosen theme; no entry means "follow the system".
export const THEME_STORAGE_KEY = "forest-theme";

export const themeNames = Object.keys(themes) as ThemeName[];

// Runs in <head> before the first paint, so a reload never flashes the other theme.
export const applyStoredTheme = `try {
  var theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (${JSON.stringify(themeNames)}.indexOf(theme) !== -1) document.documentElement.dataset.theme = theme;
} catch (error) {}`;
