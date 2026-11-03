// Replaces the preset's fixed useColorScheme mock with a phone setting tests can change.
// Like the real hook, it subscribes with useSyncExternalStore, so a change re-renders the same tree.
import type { ColorSchemeName } from 'react-native';

// Jest only lets a mock factory read variables whose name starts with `mock`.
const mockPhone = { scheme: 'light' as ColorSchemeName, listeners: new Set<() => void>() };

export function setPhoneColorScheme(next: ColorSchemeName) {
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
  return { __esModule: true, default: () => useSyncExternalStore(subscribe, () => mockPhone.scheme) };
});

beforeEach(() => {
  mockPhone.scheme = 'light';
});
