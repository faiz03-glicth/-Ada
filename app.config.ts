import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.faiz.streak';

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
  name: 'Streak',
  slug: 'streak',
  // EAS project (expo.dev/accounts/faiz-glitch/projects/streak). Identifiers only, not secrets.
  owner: 'faiz-glitch',
  extra: {
    ...config.extra,
    eas: { projectId: '384ea1bd-653a-40b0-b8a2-8d8cb7d8c492' },
  },
  scheme: 'streak',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    usesAppleSignIn: true,
  },
  android: {
    package: BUNDLE_ID,
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
  ],
  experiments: {
    typedRoutes: true,
  },
});
