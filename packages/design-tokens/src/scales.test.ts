import { describe, expect, test } from 'bun:test';
import { themes } from './colors.ts';
import { radius, shadows, spacing, typography } from './scales.ts';

// Every leaf React Native reads must be a plain number or a `#rrggbb` color string.
function leaves(value: unknown, path: string): [string, unknown][] {
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  return [[path, value]];
}

const values = leaves({ spacing, typography, radius, shadows, themes }, 'tokens');

describe('React Native values', () => {
  test('cover every variable', () => {
    expect(values.length).toBeGreaterThan(0);
  });

  for (const [path, value] of values)
    test(`${path} is a plain number or a color string`, () => {
      const plain = (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value));
      expect(plain).toBe(true);
    });
});

describe('scales', () => {
  test('spacing grows step by step', () => {
    const steps = Object.values(spacing);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });

  test('every text style has a line height at least its font size', () => {
    for (const style of Object.values(typography)) expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
  });

  test('shadows use React Native style keys', () => {
    for (const shadow of Object.values(shadows))
      expect(Object.keys(shadow).sort()).toEqual(['elevation', 'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius']);
  });
});
