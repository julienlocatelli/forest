import { radius, spacing, themes } from '@forest/design-tokens';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type { View } from 'react-native';
import { Button } from './Button.tsx';
import { setPhoneColorScheme } from './test/phone.ts';
import { renderThemed } from './test/render.tsx';

describe('Button', () => {
  test('is a button named by its label, primary by default', async () => {
    await renderThemed(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveStyle({
      backgroundColor: themes.light.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
    });
    expect(screen.getByText('Save')).toHaveStyle({ color: themes.light.onPrimary });
  });

  test.each([
    ['primary', 'primary', 'onPrimary'],
    ['secondary', 'surface', 'text'],
    ['danger', 'danger', 'onDanger'],
  ] as const)('the %s variant uses its colors in light and dark', async (variant, background, text) => {
    for (const theme of ['light', 'dark'] as const) {
      await renderThemed(<Button variant={variant}>Go</Button>, theme);
      expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: themes[theme][background] });
      expect(screen.getByText('Go')).toHaveStyle({ color: themes[theme][text] });
    }
  });

  test('presses call onPress', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button onPress={onPress}>Save</Button>);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('a disabled button tells screen readers, ignores presses and looks inactive', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button disabled onPress={onPress}>Later</Button>);
    const button = screen.getByRole('button', { name: 'Later', disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Later')).toHaveStyle({ color: themes.light.textMuted });
  });

  test('recolors the same mounted button when the phone setting changes', async () => {
    const ref = createRef<View>();
    await renderThemed(<Button ref={ref}>Save</Button>);
    const mounted = ref.current;
    await act(() => setPhoneColorScheme('dark'));
    expect(ref.current).toBe(mounted);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: themes.dark.primary });
  });
});
