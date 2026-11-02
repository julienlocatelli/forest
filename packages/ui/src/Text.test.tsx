import { themes, typography } from '@forest/design-tokens';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { Heading, Text } from './Text.tsx';
import { hex, loadStyles, useTheme, violations } from './test/theme.ts';

beforeAll(loadStyles);

describe('Text', () => {
  test('renders body text in a paragraph by default', () => {
    render(<Text>Hello</Text>);
    const text = screen.getByText('Hello');
    expect(text.tagName).toBe('P');
    expect(getComputedStyle(text).fontSize).toBe(`${typography.body.fontSize}px`);
    expect(hex(getComputedStyle(text).color)).toBe(themes.light.text);
  });

  test.each(['body', 'label', 'caption'] as const)('the %s variant uses its type scale', (variant) => {
    render(<Text variant={variant}>Line</Text>);
    const style = getComputedStyle(screen.getByText('Line'));
    expect(style.fontSize).toBe(`${typography[variant].fontSize}px`);
    expect(style.lineHeight).toBe(`${typography[variant].lineHeight}px`);
  });

  test('the muted tone uses the secondary text color, inline when asked', () => {
    render(<Text tone="muted" as="span">Note</Text>);
    const text = screen.getByText('Note');
    expect(text.tagName).toBe('SPAN');
    expect(hex(getComputedStyle(text).color)).toBe(themes.light.textMuted);
  });
});

describe('Heading', () => {
  test.each([
    [1, 'headline'],
    [2, 'title'],
    [3, 'label'],
  ] as const)('level %i is an h%i with the %s type scale', (level, scale) => {
    render(<Heading level={level}>Forest</Heading>);
    const heading = screen.getByRole('heading', { level, name: 'Forest' });
    expect(getComputedStyle(heading).fontSize).toBe(`${typography[scale].fontSize}px`);
  });

  test.each(['light', 'dark'] as const)('text and headings have no axe violation in the %s theme', async (theme) => {
    useTheme(theme);
    const { container } = render(
      <main>
        <Heading level={1}>Forest</Heading>
        <Heading level={2}>Sign in</Heading>
        <Text>Body</Text>
        <Text tone="muted" variant="caption">Caption</Text>
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });

  test('switching the theme recolors the same rendered heading', () => {
    render(<Heading level={1}>Forest</Heading>);
    const heading = screen.getByRole('heading');
    useTheme('dark');
    expect(screen.getByRole('heading')).toBe(heading);
    expect(hex(getComputedStyle(heading).color)).toBe(themes.dark.text);
  });
});
