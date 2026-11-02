import { themes } from '@forest/design-tokens';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test } from 'vitest';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';
import { Heading } from './Text.tsx';
import { hex, loadStyles, useTheme, violations } from './test/theme.ts';

beforeAll(loadStyles);

describe('Card', () => {
  test('groups its content on the surface color', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
    expect(card.textContent).toBe('Content');
    expect(hex(getComputedStyle(card).backgroundColor)).toBe(themes.light.surface);
  });

  test('can be a labelled section', () => {
    render(
      <Card as="section" aria-labelledby="title">
        <Heading level={2} id="title">Sign in</Heading>
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Sign in' }).tagName).toBe('SECTION');
  });

  test('keeps its content reachable with Tab, in order', async () => {
    const user = userEvent.setup();
    render(
      <Card>
        <Button>First</Button>
        <Button>Second</Button>
      </Card>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Second' }));
  });

  test.each(['light', 'dark'] as const)('has no axe violation in the %s theme', async (theme) => {
    useTheme(theme);
    const { container } = render(
      <Card as="section" aria-labelledby="t">
        <Heading level={2} id="t">Account</Heading>
        <Button>Save</Button>
      </Card>,
    );
    expect(await violations(container)).toEqual([]);
  });

  test('switching the theme recolors the same rendered card', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    useTheme('dark');
    expect(screen.getByTestId('card')).toBe(card);
    expect(hex(getComputedStyle(card).backgroundColor)).toBe(themes.dark.surface);
  });
});
