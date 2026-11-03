// The Storybook theme control: one toolbar item per @forest/design-tokens theme, applied through `data-theme`.
import { type ThemeName, themes } from '@forest/design-tokens';
import type { Decorator } from '@storybook/react-vite';

export const initialTheme: ThemeName = 'light';

export const themeGlobalType = {
  description: 'Forest theme',
  toolbar: {
    title: 'Theme',
    icon: 'paintbrush',
    items: (Object.keys(themes) as ThemeName[]).map((theme) => ({ value: theme, title: theme })),
    dynamicTitle: true,
  },
};

// Sets the chosen theme on the document root, as the front does, so every story recolors at once.
export const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = (context.globals.theme as ThemeName | undefined) ?? initialTheme;
  return <Story />;
};
