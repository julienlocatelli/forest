// Loads the design-token stylesheet and the library stylesheet into the test document, as the front does.
import { type ThemeName, themeStylesheet } from '@forest/design-tokens';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const styles = readFileSync(resolve(import.meta.dirname, '../styles.css'), 'utf8');

export function loadStyles() {
  if (document.getElementById('forest-test-styles')) return;
  const style = document.createElement('style');
  style.id = 'forest-test-styles';
  style.textContent = `${themeStylesheet()}\n${styles}`;
  document.head.append(style);
}

export function useTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
}

// A computed color as `#rrggbb`, whether the DOM reports it as hex or as `rgb(r, g, b)`.
export function hex(color: string) {
  const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(color);
  if (!channels) return color.toLowerCase();
  return `#${channels.slice(1).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
}

// axe violations of `element`, by rule id.
export async function violations(element: Element) {
  const results = await axe.run(element);
  return results.violations.map((violation) => violation.id);
}
