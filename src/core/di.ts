import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';

/**
 * Repository interfaces the app depends on. Concrete implementations are registered in
 * createRepositories(); tests pass fakes to <DiProvider> instead.
 */
export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
}
