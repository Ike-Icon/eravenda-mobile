// Metro (the JavaScript bundler) configuration.
// allowOptionalDependencies: the Google and Apple sign-in libraries are loaded with a `require` inside try/catch
// (see src/services/socialAuth.ts) because they contain native code that Expo Go does not have. With this switch
// Metro treats such a `require` as optional, so the app still bundles and runs when the package is not installed.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformer = { ...config.transformer, allowOptionalDependencies: true };

module.exports = config;
