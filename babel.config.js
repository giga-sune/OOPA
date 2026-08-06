// Reanimated's Babel plugin is required for native worklet transforms.

module.exports = function (api) {
    api.cache(true);
  
    return {
      presets: ["babel-preset-expo"],
      plugins: ["react-native-reanimated/plugin"],
    };
  };