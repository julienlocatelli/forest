// Semantic colors, one set per theme. Themes only change colors: every other variable is shared.

// The color names every theme defines.
export type ColorName =
  | 'background'
  | 'surface'
  | 'text'
  | 'textMuted'
  | 'border'
  | 'primary'
  | 'onPrimary'
  | 'danger'
  | 'onDanger'
  | 'focus';

// A color as `#rrggbb`, readable by CSS and React Native alike.
export type Colors = Record<ColorName, string>;

const light: Colors = {
  background: '#ffffff',
  surface: '#f3f6f3',
  text: '#18201b',
  textMuted: '#4b5750',
  border: '#c5cfc8',
  primary: '#2d6a3e',
  onPrimary: '#ffffff',
  danger: '#b3261e',
  onDanger: '#ffffff',
  focus: '#1f5fbf',
};

const dark: Colors = {
  background: '#0f1411',
  surface: '#1a211c',
  text: '#e6ece8',
  textMuted: '#a7b4ab',
  border: '#36423b',
  primary: '#7fc28e',
  onPrimary: '#0f1411',
  danger: '#f2b8b5',
  onDanger: '#3c0b08',
  focus: '#8ab4f8',
};

// Adding a theme only means adding an entry here with its color values.
export const themes = { light, dark } satisfies Record<string, Colors>;

export type ThemeName = keyof typeof themes;

// Text color, then the background it is read on: each pair must reach WCAG AA (4.5:1) in every theme.
export const contrastPairs: [ColorName, ColorName][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['primary', 'background'],
  ['danger', 'background'],
  ['onPrimary', 'primary'],
  ['onDanger', 'danger'],
];

// A non-text color, then the background it shows on: each pair must reach WCAG 1.4.11 (3:1) in every theme.
export const nonTextContrastPairs: [ColorName, ColorName][] = [
  ['focus', 'background'],
  ['focus', 'surface'],
];

// WCAG 2 relative luminance of a `#rrggbb` color.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2 contrast ratio between two `#rrggbb` colors, from 1 to 21.
export function contrastRatio(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
