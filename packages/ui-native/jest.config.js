module.exports = {
  preset: '@react-native/jest-preset',
  // A phone whose light or dark setting the tests can change, as the real useColorScheme subscribes to it.
  setupFilesAfterEnv: ['<rootDir>/src/test/phone.ts'],
  // React Native and the workspace's @forest packages ship untranspiled source, so Jest transforms them.
  // bun installs packages under node_modules/.bun/<package>/node_modules/, so that segment is skipped too.
  // Transformed workspace sources need this package's Babel runtime helpers.
  modulePaths: ['<rootDir>/node_modules'],
  transformIgnorePatterns: ['node_modules/(?!(\\.bun|@react-native|react-native|@forest)/)'],
};
