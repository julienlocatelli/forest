// Replaces the preset's fixed useColorScheme mock with a phone setting tests can change.
// Like the real hook, it subscribes with useSyncExternalStore, so a change re-renders the same tree.
import type { ColorSchemeName } from 'react-native';

// Jest only lets a mock factory read variables whose name starts with `mock`.
const mockPhone = { scheme: 'light' as ColorSchemeName | null, listeners: new Set<() => void>() };

export function setPhoneColorScheme(next: ColorSchemeName | null) {
  mockPhone.scheme = next;
  for (const listener of mockPhone.listeners) listener();
}

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => {
  const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
  const subscribe = (listener: () => void) => {
    mockPhone.listeners.add(listener);
    return () => {
      mockPhone.listeners.delete(listener);
    };
  };
  function useColorScheme() {
    return useSyncExternalStore(subscribe, () => mockPhone.scheme);
  }
  return { __esModule: true, default: useColorScheme };
});

beforeEach(() => {
  mockPhone.scheme = 'light';
});

// Safe areas come from native code; the library ships a Jest mock.
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
