import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import { createAuthApi } from '@/features/auth/data/remote/authApi';
import { expoAppleAuthService } from '@/features/auth/data/services/AppleAuthService';
import { expoCryptoService } from '@/features/auth/data/services/CryptoService';
import { googleSignInService } from '@/features/auth/data/services/GoogleAuthService';
import { SupabaseAuthRepository } from '@/features/auth/data/SupabaseAuthRepository';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import { LocalCheckInRepository, type CheckInRepository } from '@/features/checkins/data/CheckInRepository';
import { createCheckInDao } from '@/features/checkins/data/local/checkInDao';
import { createCheckInApi } from '@/features/checkins/data/remote/checkInApi';
import { createProfileDao } from '@/features/profile/data/local/profileDao';
import { LocalFirstProfileRepository } from '@/features/profile/data/LocalFirstProfileRepository';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';
import { createProfileApi } from '@/features/profile/data/remote/profileApi';
import { createSyncStateDao } from '@/features/sync/data/local/syncStateDao';
import { CloudSync, type SyncRepository } from '@/features/sync/data/SyncRepository';
import { deviceTimeZone, nowIso } from '@/shared/lib/date/deviceTimeZone';

import { requireEnv } from './config/env';
import { createAppMetaDao } from './db/appMetaDao';
import { getDb } from './db/client';
import { forgetStoredSession, getSupabase } from './supabase/client';

/**
 * Repository interfaces the app depends on. Concrete implementations are registered in
 * createRepositories(); tests pass fakes to <DiProvider> instead.
 */
export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
  checkIns: CheckInRepository;
  sync: SyncRepository;
}

/** Lets the app take its turn between sync batches (taps and animations first, then the next batch). */
const yieldToApp = () =>
  new Promise<void>((resolve) => {
    requestIdleCallback(() => resolve(), { timeout: 500 });
  });

/** Composition root: the only place concrete data sources and services are wired together. */
export function createRepositories(): Repositories {
  const env = requireEnv();
  const supabase = getSupabase();
  // Opened by the migrations boot task already; this runs only after it succeeded.
  const db = getDb();

  googleSignInService.configure({
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  const profile = new LocalFirstProfileRepository({
    dao: createProfileDao(db),
    api: createProfileApi(supabase),
    now: nowIso,
    timeZone: deviceTimeZone,
  });

  const auth = new SupabaseAuthRepository({
    api: createAuthApi(supabase.auth, { forget: forgetStoredSession }),
    apple: expoAppleAuthService,
    google: googleSignInService,
    crypto: expoCryptoService,
    profiles: profile,
    appMeta: createAppMetaDao(db),
    guestData: createGuestDataDao(db),
    now: nowIso,
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });

  const checkInDao = createCheckInDao(db);
  const checkIns = new LocalCheckInRepository({
    dao: checkInDao,
    uuid: expoCryptoService.uuid,
    now: nowIso,
  });

  const sync = new CloudSync({
    checkIns: checkInDao,
    checkInApi: createCheckInApi(supabase),
    state: createSyncStateDao(db),
    yieldToApp,
  });

  return { auth, profile, checkIns, sync };
}
