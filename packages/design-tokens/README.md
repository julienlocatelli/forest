# @forest/design-tokens

Forest's design variables, shared by the web front and the future mobile app. Themes only change colors: spacing, typography, radius and shadows are the same in every theme. The package is TypeScript source with no dependency; import it from `@forest/design-tokens`.

## Colors

`themes.light` and `themes.dark` define the same color names, as `#rrggbb` strings. On the web each one is the custom property `--color-<kebab-name>`.

| Name | Use | Light | Dark | CSS variable |
| --- | --- | --- | --- | --- |
| `background` | Page background | `#ffffff` | `#0f1411` | `--color-background` |
| `surface` | Cards, panels, inputs | `#f3f6f3` | `#1a211c` | `--color-surface` |
| `text` | Main text | `#18201b` | `#e6ece8` | `--color-text` |
| `textMuted` | Secondary text | `#4b5750` | `#a7b4ab` | `--color-text-muted` |
| `border` | Borders and dividers | `#c5cfc8` | `#36423b` | `--color-border` |
| `primary` | Main actions and links | `#2d6a3e` | `#7fc28e` | `--color-primary` |
| `onPrimary` | Text on `primary` | `#ffffff` | `#0f1411` | `--color-on-primary` |
| `danger` | Errors and destructive actions | `#b3261e` | `#f2b8b5` | `--color-danger` |
| `onDanger` | Text on `danger` | `#ffffff` | `#3c0b08` | `--color-on-danger` |
| `focus` | Focus outline | `#1f5fbf` | `#8ab4f8` | `--color-focus` |

`contrastPairs` lists the text-on-background pairs; the tests check each reaches WCAG AA (4.5:1) in every theme. `nonTextContrastPairs` lists `focus` on `background` and `surface`, checked against WCAG 1.4.11 (3:1). `border` is decorative and in neither list.

To add a theme, add an entry to `themes` in `src/colors.ts` with a value for every color name: TypeScript and the tests refuse a theme missing one. Nothing else changes.

## Shared variables

Lengths are unitless numbers: density-independent pixels on mobile, `px` on the web.

| Variable | Values | CSS variables |
| --- | --- | --- |
| `spacing` | `xxs` 2, `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32, `xxxl` 48 | `--space-<name>` |
| `typography` | `caption` 12/16 400, `body` 16/24 400, `label` 14/20 500, `title` 20/28 600, `headline` 28/36 700 (font size / line height, weight) | `--font-size-<name>`, `--line-height-<name>`, `--font-weight-<name>` |
| `radius` | `none` 0, `sm` 4, `md` 8, `lg` 16, `full` 9999 | `--radius-<name>` |
| `borderWidth` | `thin` 1, `focus` 2 (focus outline width and offset) | `--border-width-<name>` |
| `shadows` | `sm`, `md`, `lg`, as React Native shadow styles | `--shadow-<name>` (`box-shadow` value) |

Font families stay with each platform: the web keeps its font stack, mobile its system font.

## Web

`themeStylesheet()` returns one stylesheet holding every theme:

- `:root` gets the shared variables and the light colors;
- without a `data-theme` attribute, a dark system preference (`prefers-color-scheme: dark`) applies the dark colors;
- `:root[data-theme="<theme>"]` applies that theme's colors.

Switching theme at runtime needs no rebuild: set the attribute, for example `document.documentElement.dataset.theme = 'dark'`, or remove it to follow the system again. `colorVariables(theme)` and `sharedVariables()` return the same values as objects, for example to set them inline.

## React Native

Every value is a plain number or a `#rrggbb` string, so styles use them directly:

```ts
import { radius, shadows, spacing, themes, typography } from '@forest/design-tokens';

const colors = themes[colorScheme === 'dark' ? 'dark' : 'light'];
const card = {
  backgroundColor: colors.surface,
  padding: spacing.lg,
  borderRadius: radius.md,
  ...shadows.md,
};
const body = { ...typography.body, color: colors.text };
```

## Tests

```sh
bun run --cwd packages/design-tokens test
```

They check that every theme defines the same colors, the contrast pairs, that every value is a plain number or color string, and the stylesheet. The PR checks run them.
