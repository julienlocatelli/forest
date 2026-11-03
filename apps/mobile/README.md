# Forest mobile

A minimal Expo app (SDK 58, React Native 0.88) that shows every [`@forest/ui-native`](../../packages/ui-native/README.md) component in a catalog screen, and the starting point of the future mobile app. It has no Forest feature yet.

## Start it

From the repository root:

```sh
bun run mobile
```

It starts Metro (`expo start`) and prints a QR code and a menu. Expo comes from the app's own dependencies: nothing is installed globally.

| Target | How |
| --- | --- |
| iOS simulator | Press `i` in the Expo menu, or run `bun run --cwd apps/mobile ios`. Needs Xcode with an iOS simulator runtime installed. |
| Android emulator | Press `a` in the Expo menu, or run `bun run --cwd apps/mobile android`. Needs Android Studio with an emulator running. |
| Expo Go on a phone | Install Expo Go from the App Store or Google Play, then scan the QR code (with the Camera app on iOS, from Expo Go on Android). The phone must reach this computer on the network. |

`bun dev` at the root still starts only the API and the front: the app's script is `start`, not `dev`.

## The catalog

The only screen lists every component in each of its variants and states: the four buttons, the text fields with a hint, an error and a disabled state, the three heading levels, the text variants and a card.

The **Theme** choices at the top select System, then every theme `@forest/design-tokens` defines. The whole screen recolors at once. With System chosen, changing the phone's light or dark setting recolors the screen without restarting the app. The app does not remember the choice between launches.

When a component joins `@forest/ui-native`, add it to the catalog in `src/App.tsx`, in each of its variants and states, and to the test in `src/App.test.tsx`.

## Checks

```sh
bun run --cwd apps/mobile typecheck
bun run --cwd apps/mobile lint
bun run --cwd apps/mobile test
```

The PR checks run all three. They build no native iOS or Android binary. The tests render the catalog with Jest and React Native Testing Library: every component shown, the theme choice and a phone setting change.
