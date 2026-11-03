import { themes } from '@forest/design-tokens';
import { describe, expect, test } from 'vitest';
import { initialTheme, themeGlobalType, withTheme } from './storybook-theme.tsx';

describe('Storybook theme control', () => {
  test('lists every design-token theme, so a new theme appears with no Storybook change', () => {
    expect(themeGlobalType.toolbar.items.map((item) => item.value)).toEqual(Object.keys(themes));
  });

  test('starts on a theme the tokens define', () => {
    expect(Object.keys(themes)).toContain(initialTheme);
  });

  test('applies the chosen theme to the document root', () => {
    const Story = () => null;
    withTheme(Story, { globals: { theme: 'dark' } } as never);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
