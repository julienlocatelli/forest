import assert from 'node:assert/strict';
import { Given, Then } from '@cucumber/cucumber';
import { type ThemeName, themes } from '../../packages/design-tokens/src/index.ts';
import type { ForestWorld } from '../support/world.ts';

function theme(name: string): ThemeName {
  assert.ok(name in themes, `Unknown theme "${name}": expected one of ${Object.keys(themes).join(', ')}.`);
  return name as ThemeName;
}

// `#rrggbb` as the browser reports computed colors.
function rgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

Given('my system prefers the {word} color scheme', async function (this: ForestWorld, name: string) {
  await this.page.emulateMedia({ colorScheme: theme(name) as 'light' | 'dark' });
});

Given('my system states no color scheme preference', async function (this: ForestWorld) {
  await this.page.emulateMedia({ colorScheme: 'no-preference' });
});

// What the user sees: the page background and its main text, against the shared theme's values.
Then('the page uses the {word} theme colors', async function (this: ForestWorld, name: string) {
  const colors = themes[theme(name)];
  const shown = await this.page.locator('main').evaluate((main) => {
    const heading = main.querySelector('h1');
    return {
      background: getComputedStyle(main).backgroundColor,
      text: heading ? getComputedStyle(heading).color : '',
    };
  });
  assert.deepEqual(shown, { background: rgb(colors.background), text: rgb(colors.text) });
});
