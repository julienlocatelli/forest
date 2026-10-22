export default {
  paths: ['../features/**/*.feature'],
  import: ['support/**/*.ts', 'steps/**/*.ts'],
  // Undefined or pending steps fail the run; the summary names failed scenarios and missing steps.
  strict: true,
  // Random order proves every scenario starts from a known state.
  order: 'random',
  format: ['progress'],
};
