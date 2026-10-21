// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Reanimated shared values are written from gesture callbacks and frame callbacks by
    // design — `sv.value = x` is the API. The React Compiler's immutability rule reads every
    // such write as mutating a hook result. The games are where those writes live; the rule
    // stays on everywhere else.
    files: ['src/features/games/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off', 'react-hooks/refs': 'off' },
  },
]);
