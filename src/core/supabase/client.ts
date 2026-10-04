import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '../config/env';
import { LargeSecureStore } from './LargeSecureStore';

let client: SupabaseClient | null = null;
const sessionStorage = new LargeSecureStore();

/**
 * The key Supabase stores this device's session under. It's Supabase's own default
 * (`sb-<project ref>-auth-token`), named here so the session can be cleared without Supabase: changing it
 * would sign everyone out.
 */
export function sessionStorageKey(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

/** Lazily created so a missing .env surfaces on the boot error screen instead of crashing at import time. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const env = requireEnv();
    client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: sessionStorage,
        storageKey: sessionStorageKey(env.EXPO_PUBLIC_SUPABASE_URL),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Deletes this device's stored session without asking the server, for signing out offline: Supabase's own
 * sign-out stops early when it can't reach the server to refresh an expired access token. The server's
 * copy of the session expires on its own.
 */
export async function forgetStoredSession(): Promise<void> {
  const key = sessionStorageKey(requireEnv().EXPO_PUBLIC_SUPABASE_URL);
  await sessionStorage.removeItem(key);
  await sessionStorage.removeItem(`${key}-user`);
}
