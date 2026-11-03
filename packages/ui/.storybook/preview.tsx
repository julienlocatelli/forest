import { themeStylesheet } from '@forest/design-tokens';
import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';
import { initialTheme, themeGlobalType, withTheme } from '../src/storybook-theme.tsx';

// The token stylesheet holds every theme, so the toolbar switches theme without a rebuild.
const style = document.createElement('style');
style.textContent = `${themeStylesheet()}\nbody { background-color: var(--color-background); color: var(--color-text); }`;
document.head.append(style);

const preview: Preview = {
  globalTypes: { theme: themeGlobalType },
  initialGlobals: { theme: initialTheme },
  decorators: [withTheme],
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
