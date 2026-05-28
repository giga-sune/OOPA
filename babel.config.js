/**
 * Babel is required for Expo + React Native.
 * We use react-native-reanimated for navigation (tabs + gestures),
 * so this plugin enables smooth native animations and prevents crashes.
 */

module.exports = function (api) {
    api.cache(true);
  
    return {
      presets: ["babel-preset-expo"],
      plugins: ["react-native-reanimated/plugin"],
    };
  };