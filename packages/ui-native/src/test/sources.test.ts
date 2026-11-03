import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(__dirname, '..');
const sources = readdirSync(src)
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => [file, readFileSync(resolve(src, file), 'utf8')] as const);

describe('library sources', () => {
  test('are found', () => {
    expect(sources.map(([file]) => file)).toContain('Button.tsx');
  });

  for (const [file, text] of sources)
    test(`${file} writes no color or length, only design-token values`, () => {
      // A color literal, or a property set to a number (lengths in React Native are bare numbers);
      // a numeric type union such as `level: 1 | 2 | 3` is not a value.
      const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(|\b(?:transparent|white|black)\b|\b[a-zA-Z]+:\s*-?\d*\.?\d+\b(?!\s*\|)/g;
      expect(text.match(literal) ?? []).toEqual([]);
    });
});
