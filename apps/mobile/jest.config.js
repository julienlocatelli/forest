module.exports = {
  preset: '@react-native/jest-preset',
  // A phone whose light or dark setting the tests can change, as the real useColorScheme subscribes to it.
  setupFilesAfterEnv: ['<rootDir>/src/test/phone.ts'],
  // Transformed workspace sources need this app's Babel runtime helpers.
  modulePaths: ['<rootDir>/node_modules'],
  // React Native, Expo and the workspace's @forest packages ship untranspiled source, so Jest transforms them.
  // bun installs packages under node_modules/.bun/<package>/node_modules/, so that segment is skipped too.
  transformIgnorePatterns: ['node_modules/(?!(\\.bun|@react-native|react-native|@forest|react-native-safe-area-context)/)'],
};
