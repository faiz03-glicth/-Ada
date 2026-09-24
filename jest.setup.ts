// Global Jest setup: replaces native modules with in-memory or no-op versions.

jest.mock('react-native-unistyles', () => require('./test/mocks/unistyles'));

// Synchronous SQLite key/value store used by Zustand persist.
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  const Storage = {
    getItemSync: (key: string) => data.get(key) ?? null,
    setItemSync: (key: string, value: string) => void data.set(key, value),
    removeItemSync: (key: string) => data.delete(key),
    clearSync: () => data.clear(),
  };
  return { __esModule: true, Storage, default: Storage };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => false,
  isGlassEffectAPIAvailable: () => false,
}));
