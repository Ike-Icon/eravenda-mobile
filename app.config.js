/**
 * Wraps app.json so a few settings can depend on environment variables.
 *
 * GOOGLE_IOS_URL_SCHEME  The "iOS URL scheme" of your Google iOS OAuth client (it looks like
 *                        com.googleusercontent.apps.1234567890-abcdef). When set, the native Google sign-in plugin is
 *                        added. Leave it unset until you have installed the sign-in package and created the iOS client,
 *                        so `expo start` keeps working in the meantime. See docs/SOCIAL_LOGIN_SETUP.md.
 */
module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])];

  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  return {
    ...config,
    plugins,
    ios: { ...(config.ios || {}) },
  };
};
