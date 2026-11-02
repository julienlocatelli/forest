import { colorVariables, sharedVariables, themes } from '@forest/design-tokens';
import { render } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { violations } from './theme.ts';

const src = resolve(import.meta.dirname, '..');
const sources = readdirSync(src)
  .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => [file, readFileSync(resolve(src, file), 'utf8')] as const);

describe('test harness', () => {
  test('axe reports a real violation, so an empty result means something', async () => {
    const { container } = render(<button type="button" />);
    expect(await violations(container)).toContain('button-name');
  });
});

describe('library sources', () => {
  test('are found', () => {
    expect(sources.map(([file]) => file)).toContain('styles.css');
  });

  for (const [file, text] of sources)
    test(`${file} writes no color or length, only design-token variables`, () => {
      const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(|\b\d*\.?\d+(?:px|rem|em|vh|vw|%)\b|\b(?:transparent|white|black)\b/gi;
      expect(text.match(literal) ?? []).toEqual([]);
    });

  test('use only variables every theme defines, so a new theme needs no change here', () => {
    const css = sources.find(([file]) => file === 'styles.css')![1];
    const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((match) => match[1]));
    for (const theme of Object.keys(themes) as (keyof typeof themes)[]) {
      const defined = new Set(Object.keys({ ...sharedVariables(), ...colorVariables(theme) }));
      expect([...used].filter((name) => !defined.has(name))).toEqual([]);
    }
  });
});
