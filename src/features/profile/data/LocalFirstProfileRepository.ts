import { isNetworkError } from '@/core/errors/AppError';
import type { AuthUser } from '@/features/auth/domain/types';

import type { Profile } from '../domain/Profile';
import type { ProfileDao } from './local/profileDao';
import { remoteToRow, rowToProfile } from './mappers';
import type { ProfileRepository } from './ProfileRepository';
import type { ProfileApi } from './remote/profileApi';

export interface LocalFirstProfileDeps {
  dao: ProfileDao;
  api: ProfileApi;
  now: () => string;
  timeZone: () => string;
}

/** SQLite is the source of truth; Supabase refreshes it when online. Local edits stay dirty until pushed. */
export class LocalFirstProfileRepository implements ProfileRepository {
  constructor(private readonly deps: LocalFirstProfileDeps) {}

  async getLocal(id: string): Promise<Profile | null> {
    const row = await this.deps.dao.getById(id);
    return row ? rowToProfile(row) : null;
  }

  async saveFromAuth(user: AuthUser): Promise<Profile> {
    if (user.provider === 'guest') return this.ensureGuest(user.id);
    await this.deps.dao.saveAuthIdentity(
      { ...user, provider: user.provider, timeZone: this.deps.timeZone() },
      this.deps.now(),
    );
    return this.require(user.id);
  }

  async ensureGuest(guestId: string): Promise<Profile> {
    await this.deps.dao.insertGuestIfMissing(guestId, this.deps.timeZone(), this.deps.now());
    return this.require(guestId);
  }

  async refreshFromRemote(id: string): Promise<Profile | null> {
    const remote = await this.deps.api.fetch(id);
    if (!remote) return null;
    const local = await this.deps.dao.getById(id);
    // Unsynced local edits win until the sync engine (Phase 5) pushes them.
    if (local?.dirty) return rowToProfile(local);
    await this.deps.dao.replaceFromRemote(remoteToRow(remote, local?.timeZone ?? this.deps.timeZone()));
    return this.require(id);
  }

  async updateDisplayName(id: string, displayName: string): Promise<void> {
    await this.deps.dao.setDisplayName(id, displayName, this.deps.now(), true);
    try {
      await this.deps.api.updateDisplayName(id, displayName);
      await this.deps.dao.markClean(id);
    } catch (error) {
      // Offline: the row stays dirty and is pushed later. Anything else is a real failure.
      if (!isNetworkError(error)) throw error;
    }
  }

  private async require(id: string): Promise<Profile> {
    const profile = await this.getLocal(id);
    if (!profile) throw new Error('Profile row missing after write');
    return profile;
  }
}
