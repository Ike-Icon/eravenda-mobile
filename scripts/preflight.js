#!/usr/bin/env node
/**
 * Release preflight: `npm run preflight`
 * Checks the things that most often make a store build or review fail, without needing any network.
 * Exit code 1 if anything marked ERROR is found, so you can also run it in CI.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const exists = (f) => fs.existsSync(path.join(root, f));

const results = [];
const add = (level, msg) => results.push({ level, msg });

/** PNG header: width, height and whether the image has an alpha channel (colour types 4 and 6). */
function png(file) {
  const buf = fs.readFileSync(path.join(root, file));
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const colorType = buf[25];
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 };
}

// ---- icons and graphics
const images = [
  ['assets/icon.png', 1024, 1024, { noAlpha: true, why: 'App Store rejects icons with transparency' }],
  ['assets/adaptive-icon.png', 1024, 1024],
  ['assets/adaptive-icon-monochrome.png', 1024, 1024],
  ['assets/notification-icon.png', 96, 96],
  ['assets/splash-icon.png', 1024, 1024],
  ['assets/logo-mark.png', 256, 256],
  ['store-assets/play-icon-512.png', 512, 512, { noAlpha: true }],
  ['store-assets/play-feature-graphic-1024x500.png', 1024, 500, { noAlpha: true }],
];
for (const [file, w, h, opt = {}] of images) {
  if (!exists(file)) { add('ERROR', `${file} is missing (run: npm run icons)`); continue; }
  try {
    const i = png(file);
    if (i.w !== w || i.h !== h) add('ERROR', `${file} is ${i.w}x${i.h}, needs ${w}x${h}`);
    else if (opt.noAlpha && i.alpha) add('ERROR', `${file} has transparency. ${opt.why || 'The stores want an opaque image'}`);
    else add('OK', `${file} ${w}x${h}`);
  } catch (e) { add('ERROR', `${file}: ${e.message}`); }
}

// ---- app.json
const expo = read('app.json').expo || {};
const need = (cond, ok, bad, level = 'ERROR') => add(cond ? 'OK' : level, cond ? ok : bad);
need(!!expo.name, `name: ${expo.name}`, 'app.json: name is missing');
need(/^\d+\.\d+\.\d+$/.test(expo.version || ''), `version: ${expo.version}`, 'app.json: version must look like 1.0.0');
const bundle = expo.ios && expo.ios.bundleIdentifier;
const pkg = expo.android && expo.android.package;
need(!!bundle && !/example/i.test(bundle), `iOS bundle id: ${bundle}`, 'app.json: set ios.bundleIdentifier');
need(!!pkg && !/example/i.test(pkg), `Android package: ${pkg}`, 'app.json: set android.package');
if (bundle === 'com.eravenda.market' || pkg === 'com.eravenda.market') {
  add('WARN', 'Bundle id / package is still the placeholder com.eravenda.market. It can NEVER be changed after you publish, so confirm it is the one you want.');
}
need(!expo.splash, 'no legacy "splash" key', 'app.json: remove the top-level "splash" key (newer Expo SDKs configure the splash screen through the expo-splash-screen plugin)');
need(!!(expo.extra && expo.extra.eas && expo.extra.eas.projectId), 'EAS project id is set', 'Run `eas init` to add extra.eas.projectId (push notifications need it)');
need(exists('google-services.json') || !!(expo.android && expo.android.googleServicesFile), 'Android push config present', 'Android push needs google-services.json (Firebase). See docs/RELEASE_CHECKLIST.md step 5', 'WARN');

// ---- eas.json
if (!exists('eas.json')) add('ERROR', 'eas.json is missing');
else {
  const eas = read('eas.json');
  for (const profile of ['development', 'preview', 'production']) {
    const env = (((eas.build || {})[profile]) || {}).env || {};
    const api = env.EXPO_PUBLIC_API_URL || '';
    const label = `eas.json ${profile}: EXPO_PUBLIC_API_URL`;
    if (!api || /YOUR-/i.test(api)) add(profile === 'production' ? 'ERROR' : 'WARN', `${label} is still a placeholder`);
    else if (!/^https:\/\/.+\/api$/.test(api)) add('ERROR', `${label} must start with https:// and end with /api (got ${api})`);
    else add('OK', `${label} = ${api}`);
  }
  const sub = ((eas.submit || {}).production) || {};
  const ph = (v) => !v || /YOUR-/i.test(v);
  if (sub.ios && ['appleId', 'ascAppId', 'appleTeamId'].some((k) => ph(sub.ios[k]))) add('WARN', 'eas.json submit.ios still has placeholders (fill in before `eas submit`)');
  if (sub.android && !exists('google-service-account.json')) add('WARN', 'google-service-account.json not found (needed for `eas submit` to Google Play; never commit it)');
}

// ---- social sign-in (Google + Apple)
if (!exists('app.config.js')) add('ERROR', 'app.config.js is missing (it adds the Google sign-in plugin and the Apple capability)');
const pkgJson = read('package.json');
const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
const missingSocial = ['@react-native-google-signin/google-signin', 'expo-apple-authentication'].filter((p) => !deps[p]);
if (missingSocial.length) add('WARN', `Not installed yet: ${missingSocial.join(', ')}. Run: npx expo install ${missingSocial.join(' ')} (the Google/Apple buttons stay hidden until then)`);
else add('OK', 'Google and Apple sign-in packages are in package.json');
if (exists('eas.json')) {
  const prodEnv = ((((read('eas.json').build || {}).production) || {}).env) || {};
  if (!prodEnv.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) add('WARN', 'eas.json production: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty, so the Google button will be hidden');
  if (!prodEnv.GOOGLE_IOS_URL_SCHEME) add('WARN', 'eas.json production: GOOGLE_IOS_URL_SCHEME is empty. Google sign-in will not work on iOS until you create the iOS client (docs/SOCIAL_LOGIN_SETUP.md)');
}

// ---- report
const icon = { OK: '  ok  ', WARN: ' WARN ', ERROR: 'ERROR ' };
for (const r of results) console.log(`[${icon[r.level]}] ${r.msg}`);
const errors = results.filter((r) => r.level === 'ERROR').length;
const warns = results.filter((r) => r.level === 'WARN').length;
console.log(`\n${errors} error(s), ${warns} warning(s).` + (errors ? ' Fix the errors before building for the stores.' : ' No blocking problems found.'));
process.exit(errors ? 1 : 0);
