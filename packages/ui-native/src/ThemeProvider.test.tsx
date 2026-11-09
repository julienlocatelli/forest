import { themes } from '@forest/design-tokens';
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { setPhoneColorScheme } from './test/phone.ts';
import { ThemeProvider, useTheme } from './ThemeProvider.tsx';

function Probe() {
  const theme = useTheme();
  return <Text testID="probe">{`${theme.name} ${theme.preference} ${theme.colors.background}`}</Text>;
}

let choose: ((preference: 'system' | keyof typeof themes) => void) | undefined;
function Chooser() {
  const { setPreference } = useTheme();
  useEffect(() => {
    choose = setPreference;
  }, [setPreference]);
  return null;
}

describe('ThemeProvider', () => {
  test('follows the phone setting by default', async () => {
    setPhoneColorScheme('dark');
    await render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent(`dark system ${themes.dark.background}`);
  });

  test('falls back to light when the phone states no setting', async () => {
    setPhoneColorScheme(null);
    await render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent(`light system ${themes.light.background}`);
  });

  test('recolors at once when the phone setting changes', async () => {
    await render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(() => setPhoneColorScheme('dark'));
    expect(screen.getByTestId('probe')).toHaveTextContent(`dark system ${themes.dark.background}`);
  });

  test('lets the app choose a theme over the phone, then follow the system again', async () => {
    setPhoneColorScheme('dark');
    await render(<ThemeProvider><Chooser /><Probe /></ThemeProvider>);
    await act(() => choose!('light'));
    expect(screen.getByTestId('probe')).toHaveTextContent(`light light ${themes.light.background}`);
    await act(() => choose!('system'));
    expect(screen.getByTestId('probe')).toHaveTextContent(`dark system ${themes.dark.background}`);
  });

  test('accepts any theme the tokens define, so a new one needs no change here', async () => {
    for (const name of Object.keys(themes) as (keyof typeof themes)[]) {
      await render(<ThemeProvider initialPreference={name}><Probe /></ThemeProvider>);
      expect(screen.getByTestId('probe')).toHaveTextContent(`${name} ${name} ${themes[name].background}`);
    }
  });

  test('useTheme outside the provider names the fix', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow('Wrap the app in <ThemeProvider>');
  });
});
