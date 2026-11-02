// CSS custom properties for the web. The stylesheet holds every theme, so the web switches theme at runtime
// by setting `data-theme` on the root element, without a rebuild.
import { type ThemeName, themes } from './colors.ts';
import { radius, shadows, spacing, typography } from './scales.ts';

type Variables = Record<string, string>;

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function rgba(hex: string, opacity: number) {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// `--color-<name>` for each color of the theme.
export function colorVariables(theme: ThemeName): Variables {
  return Object.fromEntries(Object.entries(themes[theme]).map(([name, value]) => [`--color-${kebab(name)}`, value]));
}

// The variables every theme shares: spacing, typography, radius and shadows.
export function sharedVariables(): Variables {
  const variables: Variables = {};
  for (const [name, value] of Object.entries(spacing)) variables[`--space-${name}`] = `${value}px`;
  for (const [name, style] of Object.entries(typography)) {
    variables[`--font-size-${name}`] = `${style.fontSize}px`;
    variables[`--line-height-${name}`] = `${style.lineHeight}px`;
    variables[`--font-weight-${name}`] = `${style.fontWeight}`;
  }
  for (const [name, value] of Object.entries(radius)) variables[`--radius-${name}`] = `${value}px`;
  for (const [name, shadow] of Object.entries(shadows))
    variables[`--shadow-${name}`] =
      `${shadow.shadowOffset.width}px ${shadow.shadowOffset.height}px ${shadow.shadowRadius}px ${rgba(shadow.shadowColor, shadow.shadowOpacity)}`;
  return variables;
}

function rule(selector: string, variables: Variables, indent = '') {
  const lines = Object.entries(variables).map(([name, value]) => `${indent}  ${name}: ${value};`);
  return `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`;
}

// Light by default, the dark system preference until a theme is chosen, then the chosen `data-theme`.
export function themeStylesheet(): string {
  const chosen = (Object.keys(themes) as ThemeName[]).map((theme) =>
    rule(`:root[data-theme="${theme}"]`, colorVariables(theme)),
  );
  return [
    rule(':root', { ...sharedVariables(), ...colorVariables('light') }),
    `@media (prefers-color-scheme: dark) {\n${rule(':root:not([data-theme])', colorVariables('dark'), '  ')}\n}`,
    ...chosen,
  ].join('\n\n') + '\n';
}
