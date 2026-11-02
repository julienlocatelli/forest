# @forest/ui

Forest's React web components. They take every color, length, type size, radius and shadow from [`@forest/design-tokens`](../design-tokens/README.md) through its CSS variables, so they follow the active theme: switching `data-theme` at runtime recolors every rendered component without a reload or a remount, and a theme added to the tokens needs no change here.

## Use it in the front

The front depends on `@forest/ui` and loads both stylesheets once, in `apps/front/app/layout.tsx`: the token stylesheet (`themeStylesheet()` from `@forest/design-tokens`) and this library's `@forest/ui/styles.css`. Then any page imports the components:

```tsx
import { Button, Card, Heading, Text, TextField } from "@forest/ui";

<Card as="section" aria-labelledby="sign-in">
  <Heading level={1} id="sign-in">Sign in</Heading>
  <TextField label="Email" type="email" hint="Your work email." />
  <Button type="submit">Sign in</Button>
</Card>;
```

`apps/front/app/not-found.tsx` is the first page built with them.

## Components

Every component also takes the props of the HTML element it renders, such as `onClick`, `id` or `aria-*`, and a `className`.

| Component | Renders | Props |
| --- | --- | --- |
| `Button` | `<button>`, `type="button"` by default | `variant`: `primary` (default), `secondary`, `danger`; `disabled` |
| `TextField` | a label, an `<input>`, an optional hint and error | `label` (required); `hint`; `error`, shown with `role="alert"`, marks the input `aria-invalid`; any input prop such as `type`, `value`, `onChange`, `disabled` |
| `Text` | `<p>` by default | `variant`: `body` (default), `label`, `caption`; `tone`: `default`, `muted`; `as`: `p`, `span`, `div` |
| `Heading` | `<h1>` to `<h3>` | `level` (required): 1 uses the headline scale, 2 the title scale, 3 the label size in the title weight |
| `Card` | `<div>` by default | `as`: `div`, `section`, `article`; label a landmark card with `aria-labelledby` |

## Accessibility

- `Button` and `TextField` take keyboard focus with Tab and show an outline in the theme's `focus` color, whose contrast the tokens check in every theme. A disabled button or field is skipped.
- `TextField` ties its label to the input, and reads the hint and the error with it through `aria-describedby`.
- The tests run axe on every component in the light and the dark theme.

## Rules for the library

- Write no color, length or shadow in a component or in `src/styles.css`: use a `@forest/design-tokens` variable. A test fails on any hex color, `rgb()`, `px`, `rem`, `%` or named color in the sources, and on a variable a theme does not define.
- Prefix every class with `forest-`.
- Every new component comes with tests of its rendering, variants, states, keyboard use, axe in every theme and theme switch.

## Tests

```sh
bun run --cwd packages/ui test
```

Vitest runs them in happy-dom, which resolves CSS custom properties, so the tests read the real theme colors. The PR checks run them.
