import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface LargeSecureStoreDeps {
  /** Small, hardware-backed store for the AES key (SecureStore has a ~2 KB value limit). */
  keyStore: KeyValueStore;
  /** Large, unencrypted store that only ever receives ciphertext. */
  dataStore: KeyValueStore;
  randomBytes: (count: number) => Uint8Array;
}

const defaultDeps: LargeSecureStoreDeps = {
  keyStore: {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  },
  dataStore: AsyncStorage,
  randomBytes: getRandomBytes,
};

/**
 * Supabase session storage (pattern from Supabase's official Expo guide).
 * A fresh 256-bit AES key is stored in SecureStore; the AES-CTR-encrypted session is stored in AsyncStorage.
 */
export class LargeSecureStore {
  constructor(private readonly deps: LargeSecureStoreDeps = defaultDeps) {}

  async getItem(key: string): Promise<string | null> {
    const encrypted = await this.deps.dataStore.getItem(key);
    if (!encrypted) return null;
    const keyHex = await this.deps.keyStore.getItem(key);
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = this.deps.randomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await this.deps.keyStore.setItem(key, aesjs.utils.hex.fromBytes(encryptionKey));
    await this.deps.dataStore.setItem(key, aesjs.utils.hex.fromBytes(encrypted));
  }

  async removeItem(key: string): Promise<void> {
    await this.deps.dataStore.removeItem(key);
    await this.deps.keyStore.removeItem(key);
  }
}
