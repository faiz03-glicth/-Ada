import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.faiz.streak';

/**
 * `APP_VARIANT=local` makes a separate app for builds made on this computer (`npx expo run:android`):
 * "Streak Local", with its own ID and link scheme, so it installs NEXT TO the EAS-built "Streak" instead
 * of clashing with it (the two are signed with different keys). EAS builds never set it.
 */
const IS_LOCAL = process.env.APP_VARIANT === 'local';
const APP_ID = IS_LOCAL ? `${BUNDLE_ID}.local` : BUNDLE_ID;

/**
 * Google Sign-In on iOS needs the *reversed* iOS client ID as a URL scheme:
 * `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`.
 */
function googleIosUrlScheme(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const suffix = '.apps.googleusercontent.com';
  if (!clientId || !clientId.endsWith(suffix)) {
    console.warn(
      '[app.config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing or invalid; Google Sign-In will not work on iOS.',
    );
    return 'com.googleusercontent.apps.missing-ios-client-id';
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_LOCAL ? 'Streak Local' : 'Streak',
  slug: 'streak',
  // EAS project (expo.dev/accounts/faiz-glitch/projects/streak). Identifiers only, not secrets.
  owner: 'faiz-glitch',
  extra: {
    ...config.extra,
    eas: { projectId: '384ea1bd-653a-40b0-b8a2-8d8cb7d8c492' },
  },
  scheme: IS_LOCAL ? 'streak-local' : 'streak',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: true,
    usesAppleSignIn: true,
  },
  android: {
    package: APP_ID,
    adaptiveIcon: {
      backgroundColor: '#E2F4E8',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        // The light and dark canvas colours, so the splash fades into the first screen without a shift.
        backgroundColor: '#F2F5F1',
        dark: { backgroundColor: '#0D100E' },
      },
    ],
    'expo-font',
    'expo-sqlite',
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme() }],
    'react-native-edge-to-edge',
    [
      'expo-build-properties',
      {
        android: {
          // Release builds only, so the dev client is unaffected.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // The staging APK is side-loaded onto real phones, which are all arm64.
          ...(process.env.EAS_BUILD_PROFILE === 'preview' && { buildArchs: ['arm64-v8a'] }),
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
