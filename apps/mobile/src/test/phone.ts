// The phone whose light or dark setting tests can change comes from the component library's test support,
// so both workspaces share one mock of useColorScheme.
export { setPhoneColorScheme } from '@forest/ui-native/src/test/phone';

// Safe areas come from native code; the library ships a Jest mock.
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
