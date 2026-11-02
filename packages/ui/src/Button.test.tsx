import { themes } from '@forest/design-tokens';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { Button } from './Button.tsx';
import { hex, loadStyles, useTheme, violations } from './test/theme.ts';

beforeAll(loadStyles);

describe('Button', () => {
  test('renders a button with its label, primary by default', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');
    expect(hex(getComputedStyle(button).backgroundColor)).toBe(themes.light.primary);
    expect(hex(getComputedStyle(button).color)).toBe(themes.light.onPrimary);
  });

  test.each([
    ['primary', 'primary', 'onPrimary'],
    ['secondary', 'surface', 'text'],
    ['danger', 'danger', 'onDanger'],
  ] as const)('the %s variant uses its theme colors', (variant, background, text) => {
    render(<Button variant={variant}>Go</Button>);
    const style = getComputedStyle(screen.getByRole('button'));
    expect(hex(style.backgroundColor)).toBe(themes.light[background]);
    expect(hex(style.color)).toBe(themes.light[text]);
  });

  test('a disabled button ignores clicks and the keyboard, and looks inactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
    await user.click(button);
    await user.tab();
    expect(document.activeElement).not.toBe(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(hex(getComputedStyle(button).color)).toBe(themes.light.textMuted);
  });

  test('is reached with Tab and pressed with Enter or Space, with a visible focus outline', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.tab();
    const button = screen.getByRole('button');
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(button.className).toContain('forest-focusable');
  });

  test.each(['light', 'dark'] as const)('has no axe violation in the %s theme', async (theme) => {
    useTheme(theme);
    const { container } = render(
      <div>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Later</Button>
      </div>,
    );
    expect(await violations(container)).toEqual([]);
  });

  test('switching the theme recolors the same rendered button, without remounting it', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button');
    useTheme('dark');
    expect(screen.getByRole('button')).toBe(button);
    expect(hex(getComputedStyle(button).backgroundColor)).toBe(themes.dark.primary);
    expect(hex(getComputedStyle(button).color)).toBe(themes.dark.onPrimary);
  });
});
