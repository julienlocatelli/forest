import { borderWidth, radius, themes, typography } from '@forest/design-tokens';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { TextField } from './TextField.tsx';
import { setPhoneColorScheme } from './test/phone.ts';
import { renderThemed } from './test/render.tsx';

describe('TextField', () => {
  test('ties its label to the input', async () => {
    await renderThemed(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input.type).toBe('TextInput');
    expect(input).toHaveStyle({ borderWidth: borderWidth.thin, borderRadius: radius.md, fontSize: typography.body.fontSize });
  });

  test('reads the hint with the input', async () => {
    await renderThemed(<TextField label="Email" hint="Your work email." />);
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe('Your work email.');
    expect(screen.getByText('Your work email.')).toHaveStyle({ color: themes.light.textMuted });
  });

  test('announces the error, reads it with the input and marks the border', async () => {
    await renderThemed(<TextField label="Email" hint="Your work email." error="Enter a valid email." />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter a valid email.');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(alert).toHaveStyle({ color: themes.light.danger });
    const input = screen.getByLabelText('Email');
    expect(input.props.accessibilityHint).toBe('Your work email. Enter a valid email.');
    expect(input).toHaveStyle({ borderColor: themes.light.danger });
  });

  test("keeps the hint and error read with the input when the caller adds its own hint", async () => {
    await renderThemed(<TextField label="Email" hint="Your work email." error="Enter a valid email." accessibilityHint="Required." />);
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe('Required. Your work email. Enter a valid email.');
  });

  test('takes typing', async () => {
    const onChangeText = jest.fn();
    await renderThemed(<TextField label="Name" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada');
    expect(onChangeText).toHaveBeenCalledWith('Ada');
  });

  test('a disabled field tells screen readers and takes no input', async () => {
    await renderThemed(<TextField label="Name" disabled />);
    const input = screen.getByLabelText('Name');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toEqual({ disabled: true });
    expect(input).toHaveStyle({ color: themes.light.textMuted });
  });

  test.each(['light', 'dark'] as const)('uses the %s theme colors', async (theme) => {
    await renderThemed(<TextField label="Email" />, theme);
    expect(screen.getByLabelText('Email')).toHaveStyle({
      backgroundColor: themes[theme].background,
      color: themes[theme].text,
      borderColor: themes[theme].border,
    });
    expect(screen.getByText('Email')).toHaveStyle({ color: themes[theme].text });
  });

  test('recolors when the phone setting changes', async () => {
    await renderThemed(<TextField label="Email" />);
    await act(() => setPhoneColorScheme('dark'));
    expect(screen.getByLabelText('Email')).toHaveStyle({ backgroundColor: themes.dark.background });
  });
});
