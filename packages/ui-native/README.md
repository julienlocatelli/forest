# @forest/ui-native

Forest's React Native components, the mobile counterpart of [`@forest/ui`](../ui/README.md): same component names, variants and states. They take every color, length, type size, radius and shadow from [`@forest/design-tokens`](../design-tokens/README.md), so they follow the active theme and switch it on the fly. The package is TypeScript source for React Native 0.88 and React 19.3.

## Use it in an app

Wrap the app once in `ThemeProvider`, then use the components anywhere inside it:

```tsx
import { Button, Card, Heading, Text, TextField, ThemeProvider } from "@forest/ui-native";

export default function App() {
  return (
    <ThemeProvider>
      <Card>
        <Heading level={1}>Sign in</Heading>
        <TextField label="Email" keyboardType="email-address" hint="Your work email." />
        <Button onPress={signIn}>Sign in</Button>
      </Card>
    </ThemeProvider>
  );
}
```

## Theme provider

`ThemeProvider` follows the phone's light or dark setting by default. `useTheme()` gives any component the theme in use:

| Field | Value |
| --- | --- |
| `name` | The theme in use: `system` resolved to `light` or `dark`, or the chosen theme |
| `colors` | That theme's colors from `@forest/design-tokens` |
| `preference` | `system`, or the chosen theme's name |
| `setPreference(preference)` | Chooses `system` or any theme the tokens define |

A change of the phone setting, while following the system, or of the preference re-renders the provider, so every rendered component recolors at once, without a restart or a remount. `initialPreference` sets the starting choice; the provider does not remember it between launches. A theme added to the tokens can be chosen with `setPreference` with no change here. `useTheme()` outside a provider throws, naming the fix.

## Components

Every component also takes the props of the React Native element it renders, except `style`: its look comes from the theme only.

| Component | Renders | Props | Screen readers |
| --- | --- | --- | --- |
| `Button` | `Pressable` with a label | `children` (the label text); `variant`: `primary` (default), `secondary`, `danger`; `disabled`; `onPress` | Role `button`, named by its label, state `disabled` |
| `TextField` | a label, a `TextInput`, an optional hint and error | `label` (required); `hint`; `error`; `disabled`; any `TextInput` prop such as `value`, `onChangeText`, `secureTextEntry` | The input is named by `label`; the hint and error are read with it (`accessibilityHint`, after any hint you pass); the error is an `alert` live region; state `disabled` |
| `Text` | `Text` | `variant`: `body` (default), `label`, `caption`; `tone`: `default`, `muted` | Plain text |
| `Heading` | `Text` | `level` (required): 1 headline size, 2 title size, 3 label size in the title weight | Role `header` |
| `Card` | `View` on the surface color | any `View` prop | A plain container: each child stays reachable on its own |

## Rules for the library

- Write no color or length in a component: use a `@forest/design-tokens` value through `useTheme().colors` or the token scales. A test fails on any color literal and on any property set to a bare number in the sources.
- Keep the names, variants and states of `@forest/ui`, so both platforms match.
- Every new component comes with tests of its rendering, variants and states in the light and the dark theme, its role, label and state for screen readers, and its recoloring when the phone setting changes.

## Tests

```sh
bun run --cwd packages/ui-native test
```

Jest runs them with the React Native preset and React Native Testing Library. `src/test/phone.ts` replaces the preset's fixed `useColorScheme` with a phone setting the tests change, so they check recoloring on the same rendered tree. The PR checks run them.
