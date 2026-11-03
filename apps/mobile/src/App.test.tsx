import { themes } from '@forest/design-tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from './App';
import { setPhoneColorScheme } from './test/phone';

// The catalog's background follows the theme in use.
const background = () => screen.getByTestId('catalog');

describe('Catalog', () => {
  test('shows every component in each variant and state', async () => {
    await render(<App />);
    for (const name of ['Primary', 'Secondary', 'Danger', 'Disabled']) expect(screen.getByRole('button', { name })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Disabled', disabled: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('With hint')).toBeOnTheScreen();
    expect(screen.getByLabelText('With error')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByLabelText('Disabled field').props.editable).toBe(false);
    for (const level of [1, 2, 3]) expect(screen.getByRole('header', { name: `Heading level ${level}` })).toBeOnTheScreen();
    for (const text of ['Body text', 'Label text', 'Caption text', 'Muted text', 'Card content']) expect(screen.getByText(text)).toBeOnTheScreen();
  });

  test('offers System and every token theme, System first and selected', async () => {
    await render(<App />);
    const options = screen.getAllByRole('radio');
    expect(options.map((option) => option.props.accessibilityLabel)).toEqual(['System', ...Object.keys(themes).map((name) => `${name[0].toUpperCase()}${name.slice(1)}`)]);
    expect(screen.getByRole('radio', { name: 'System', checked: true })).toBeOnTheScreen();
  });

  test('recolors the whole screen at once when a theme is chosen', async () => {
    await render(<App />);
    expect(background()).toHaveStyle({ backgroundColor: themes.light.background });
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(background()).toHaveStyle({ backgroundColor: themes.dark.background });
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveStyle({ backgroundColor: themes.dark.primary });
    expect(screen.getByRole('radio', { name: 'Dark', checked: true })).toBeOnTheScreen();
  });

  test('with System chosen, a phone setting change recolors the screen without a restart', async () => {
    await render(<App />);
    await act(() => setPhoneColorScheme('dark'));
    expect(background()).toHaveStyle({ backgroundColor: themes.dark.background });
  });
});
