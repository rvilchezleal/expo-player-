// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*'],
  },
  {
    rules: {
      // expo-video expone una API imperativa (player.muted, player.audioTrack, player.currentTime...).
      // Asignar esas propiedades es el uso documentado del SDK, no una mutación de estado de React.
      'react-hooks/immutability': 'off',
    },
  },
]);
