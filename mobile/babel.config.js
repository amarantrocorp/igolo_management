const path = require("path");

module.exports = function (api) {
  api.cache(true);

  // Force use of project-local babel-preset-expo (not any global version)
  const localPresetExpo = path.resolve(
    __dirname,
    "node_modules/expo/node_modules/babel-preset-expo"
  );

  return {
    presets: [[localPresetExpo, { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
