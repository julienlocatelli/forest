import { describe, expect, test } from 'bun:test';
import { themes } from './colors.ts';
import { colorVariables, sharedVariables, themeStylesheet } from './css.ts';

// The declarations of the first CSS block whose selector is exactly `selector`.
function block(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThan(-1);
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  return Object.fromEntries(
    body
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/:\s*/, 2) as [string, string]),
  );
}

describe('colorVariables', () => {
  test('names each color as a kebab-case custom property', () => {
    expect(colorVariables('light')['--color-text-muted']).toBe(themes.light.textMuted);
    expect(colorVariables('dark')['--color-on-primary']).toBe(themes.dark.onPrimary);
  });
});

describe('sharedVariables', () => {
  test('gives lengths in px and shadows as box-shadow values', () => {
    const shared = sharedVariables();
    expect(shared['--space-md']).toBe('12px');
    expect(shared['--radius-full']).toBe('9999px');
    expect(shared['--font-size-body']).toBe('16px');
    expect(shared['--line-height-body']).toBe('24px');
    expect(shared['--font-weight-body']).toBe('400');
    expect(shared['--shadow-md']).toBe('0px 4px 8px rgba(0, 0, 0, 0.16)');
  });
});

describe('themeStylesheet', () => {
  const css = themeStylesheet();

  test('defines the shared variables and the light colors on :root', () => {
    expect(block(css, ':root')).toEqual({ ...sharedVariables(), ...colorVariables('light') });
  });

  test('holds every theme, selected at runtime by data-theme, so switching needs no rebuild', () => {
    for (const theme of Object.keys(themes) as (keyof typeof themes)[])
      expect(block(css, `:root[data-theme="${theme}"]`)).toEqual(colorVariables(theme));
  });

  test('follows a dark system preference until a theme is chosen', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(block(css, ':root:not([data-theme])')).toEqual(colorVariables('dark'));
  });
});
