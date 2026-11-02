import { themes } from '@forest/design-tokens';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test } from 'vitest';
import { TextField } from './TextField.tsx';
import { hex, loadStyles, useTheme, violations } from './test/theme.ts';

beforeAll(loadStyles);

describe('TextField', () => {
  test('ties its label to the input', () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  test('describes the input with its hint', () => {
    render(<TextField label="Email" hint="We never share it." />);
    const input = screen.getByLabelText('Email');
    expect(screen.getByText('We never share it.').id).toBe(input.getAttribute('aria-describedby'));
  });

  test('marks the input invalid and announces the error', () => {
    render(<TextField label="Email" hint="Your work email." error="Enter a valid email." />);
    const input = screen.getByLabelText('Email');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Enter a valid email.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(alert.id);
    expect(hex(getComputedStyle(alert).color)).toBe(themes.light.danger);
    expect(hex(getComputedStyle(input).borderColor)).toBe(themes.light.danger);
  });

  test("keeps the hint and error tied to the input when the caller adds its own description", () => {
    render(
      <>
        <p id="extra">Shown above the form.</p>
        <TextField label="Email" hint="Your work email." error="Enter a valid email." aria-describedby="extra" aria-invalid={false} />
      </>,
    );
    const input = screen.getByLabelText('Email');
    const ids = input.getAttribute('aria-describedby')?.split(' ');
    expect(ids).toEqual(['extra', screen.getByText('Your work email.').id, screen.getByRole('alert').id]);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('is reached with Tab and typed into, with a visible focus outline', async () => {
    const user = userEvent.setup();
    render(<TextField label="Name" />);
    await user.tab();
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    await user.keyboard('Ada');
    expect(input.value).toBe('Ada');
    expect(input.className).toContain('forest-focusable');
  });

  test('a disabled field is skipped by Tab', async () => {
    const user = userEvent.setup();
    render(<TextField label="Name" disabled />);
    await user.tab();
    expect(document.activeElement).not.toBe(screen.getByLabelText('Name'));
  });

  test.each(['light', 'dark'] as const)('has no axe violation in the %s theme', async (theme) => {
    useTheme(theme);
    const { container } = render(
      <form>
        <TextField label="Email" hint="Your work email." />
        <TextField label="Password" type="password" error="Too short." />
      </form>,
    );
    expect(await violations(container)).toEqual([]);
  });

  test('switching the theme recolors the same rendered field', () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    useTheme('dark');
    expect(screen.getByLabelText('Email')).toBe(input);
    expect(hex(getComputedStyle(input).backgroundColor)).toBe(themes.dark.background);
    expect(hex(getComputedStyle(input).color)).toBe(themes.dark.text);
  });
});
