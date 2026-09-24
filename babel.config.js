module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Drizzle migrations are .sql files bundled as strings.
      ['inline-import', { extensions: ['.sql'] }],
      // All styled code lives under src/; route files in app/ only mount screens.
      ['react-native-unistyles/plugin', { root: 'src' }],
    ],
  };
};
