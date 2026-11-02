import { describe, expect, test } from 'bun:test';
import { contrastPairs, contrastRatio, themes } from './colors.ts';

const names = Object.keys(themes.light).sort();

describe('themes', () => {
  test('offer light and dark', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
  });

  for (const [theme, colors] of Object.entries(themes))
    test(`${theme} defines exactly the same color names as light`, () => {
      expect(Object.keys(colors).sort()).toEqual(names);
    });

  for (const [theme, colors] of Object.entries(themes))
    for (const [text, background] of contrastPairs)
      test(`${theme}: ${text} on ${background} reaches WCAG AA 4.5:1`, () => {
        expect(contrastRatio(colors[text], colors[background])).toBeGreaterThanOrEqual(4.5);
      });
});

describe('contrastRatio', () => {
  test('follows the WCAG formula', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});
