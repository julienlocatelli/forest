import { themes, typography } from '@forest/design-tokens';
import { act, screen } from '@testing-library/react-native';
import { Heading, Text } from './Text.tsx';
import { setPhoneColorScheme } from './test/phone.ts';
import { renderThemed } from './test/render.tsx';

describe('Text', () => {
  test.each(['body', 'label', 'caption'] as const)('the %s variant uses its type scale', async (variant) => {
    await renderThemed(<Text variant={variant}>Line</Text>);
    expect(screen.getByText('Line')).toHaveStyle({
      fontSize: typography[variant].fontSize,
      lineHeight: typography[variant].lineHeight,
      fontWeight: typography[variant].fontWeight,
    });
  });

  test.each(['light', 'dark'] as const)('default and muted tones use the %s theme colors', async (theme) => {
    await renderThemed(
      <>
        <Text>Main</Text>
        <Text tone="muted">Note</Text>
      </>,
      theme,
    );
    expect(screen.getByText('Main')).toHaveStyle({ color: themes[theme].text });
    expect(screen.getByText('Note')).toHaveStyle({ color: themes[theme].textMuted });
  });
});

describe('Heading', () => {
  test.each([
    [1, 'headline'],
    [2, 'title'],
    [3, 'label'],
  ] as const)('level %i is a header with the %s size', async (level, scale) => {
    await renderThemed(<Heading level={level}>Forest</Heading>);
    expect(screen.getByRole('header', { name: 'Forest' })).toHaveStyle({ fontSize: typography[scale].fontSize });
  });

  test('recolors when the phone setting changes', async () => {
    await renderThemed(<Heading level={1}>Forest</Heading>);
    await act(() => setPhoneColorScheme('dark'));
    expect(screen.getByRole('header')).toHaveStyle({ color: themes.dark.text });
  });
});
