import { LargeSecureStore } from '../LargeSecureStore';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => void data.set(key, value),
    removeItem: async (key: string) => void data.delete(key),
  };
}

let counter = 0;
const randomBytes = (count: number) =>
  Uint8Array.from({ length: count }, (_, i) => (i * 7 + ++counter) % 256);

describe('LargeSecureStore', () => {
  const session = JSON.stringify({ access_token: 'secret-token', user: { email: 'person@example.com' } });

  it('round-trips a value', async () => {
    const store = new LargeSecureStore({ keyStore: memoryStore(), dataStore: memoryStore(), randomBytes });
    await store.setItem('sb-session', session);
    await expect(store.getItem('sb-session')).resolves.toBe(session);
  });

  it('keeps only ciphertext in the data store and a 256-bit key in the key store', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    await store.setItem('sb-session', session);

    const stored = dataStore.data.get('sb-session') ?? '';
    expect(stored).not.toContain('secret-token');
    expect(stored).not.toContain('person@example.com');
    expect(keyStore.data.get('sb-session')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns null when either half is missing and removes both halves', async () => {
    const keyStore = memoryStore();
    const dataStore = memoryStore();
    const store = new LargeSecureStore({ keyStore, dataStore, randomBytes });

    await expect(store.getItem('missing')).resolves.toBeNull();
    await store.setItem('k', 'v');
    keyStore.data.delete('k');
    await expect(store.getItem('k')).resolves.toBeNull();

    await store.setItem('k', 'v');
    await store.removeItem('k');
    expect(dataStore.data.has('k')).toBe(false);
    expect(keyStore.data.has('k')).toBe(false);
  });
});
