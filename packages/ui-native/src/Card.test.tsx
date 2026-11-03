import { radius, spacing, themes } from '@forest/design-tokens';
import { act, screen } from '@testing-library/react-native';
import { Card } from './Card.tsx';
import { Heading, Text } from './Text.tsx';
import { setPhoneColorScheme } from './test/phone.ts';
import { renderThemed } from './test/render.tsx';

describe('Card', () => {
  test.each(['light', 'dark'] as const)('groups its content on the %s surface', async (theme) => {
    await renderThemed(
      <Card testID="card">
        <Text>Content</Text>
      </Card>,
      theme,
    );
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: themes[theme].surface,
      borderColor: themes[theme].border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    });
    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  test('keeps each child reachable by screen readers, not grouped into one element', async () => {
    await renderThemed(
      <Card testID="card">
        <Heading level={2}>Sign in</Heading>
        <Text>Use your work email.</Text>
      </Card>,
    );
    expect(screen.getByTestId('card').props.accessible).toBeUndefined();
    expect(screen.getByRole('header', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.getByText('Use your work email.')).toBeOnTheScreen();
  });

  test('recolors when the phone setting changes', async () => {
    await renderThemed(<Card testID="card" />);
    await act(() => setPhoneColorScheme('dark'));
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: themes.dark.surface });
  });
});
