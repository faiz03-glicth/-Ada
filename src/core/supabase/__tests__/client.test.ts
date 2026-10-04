import { createClient } from '@supabase/supabase-js';

import { sessionStorageKey } from '../client';

describe('sessionStorageKey', () => {
  it("is Supabase's own default key, so naming it signs nobody out", () => {
    const url = 'https://abcdefghijkl.supabase.co';
    const supabase = createClient(url, 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const defaultKey = (supabase.auth as unknown as { storageKey: string }).storageKey;

    expect(sessionStorageKey(url)).toBe('sb-abcdefghijkl-auth-token');
    expect(sessionStorageKey(url)).toBe(defaultKey);
  });
});
