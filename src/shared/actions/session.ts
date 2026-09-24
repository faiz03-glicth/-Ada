import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { isNetworkError } from '@/core/errors/AppError';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import { useAuthStore } from '@/features/auth/state/authStore';

import { confirm as nativeConfirm, type Confirm } from '../lib/confirm';
import { showInfo, showSuccess } from '../ui/toast';

export interface SessionActions {
  /** Marks onboarding done (creating a guest first if nobody is signed in). The route guard then opens Home. */
  finishOnboarding(options?: { silent?: boolean }): Promise<void>;
  /** Confirm → repository → toast. The route guard then shows Login (returning-user variant). */
  signOut(): Promise<void>;
  /** Phase 4 (Account): connect Apple/Google to an existing account. */
  linkProvider(provider: 'apple' | 'google'): void;
}

export interface SessionDeps {
  auth: AuthRepository;
  store: Pick<typeof useAuthStore, 'getState'>;
  clearCache: () => void;
  confirm: Confirm;
}

const COPY = {
  allSet: { title: "You're all set", sub: 'Tap + whenever you do something worth counting.' },
  confirmMember: 'Your check-ins are saved to your account. Sign in again any time to see them.',
  confirmGuest:
    "You're using Streak as a guest, so your check-ins stay on this device. Continue as a guest later to pick up where you left off.",
  signedOutMember: { title: 'Signed out', sub: 'Your check-ins are saved to your account.' },
  signedOutGuest: { title: 'Signed out', sub: 'Your check-ins stay on this device.' },
  offline: { title: "You're offline", sub: 'Check your connection and try again.' },
  failed: { title: "Couldn't log out", sub: 'Please try again.' },
};

export function createSessionActions({ auth, store, clearCache, confirm }: SessionDeps): SessionActions {
  return {
    async finishOnboarding({ silent = false } = {}) {
      if (store.getState().status === 'signedOut') {
        store.getState().setUser(await auth.continueAsGuest());
      }
      store.getState().completeOnboarding();
      if (!silent) showSuccess(COPY.allSet);
    },

    async signOut() {
      const isGuest = store.getState().user?.provider === 'guest';
      const confirmed = await confirm({
        title: 'Log out?',
        message: isGuest ? COPY.confirmGuest : COPY.confirmMember,
        confirmLabel: 'Log out',
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await auth.signOut();
      } catch (error) {
        showInfo(isNetworkError(error) ? COPY.offline : COPY.failed);
        return;
      }
      store.getState().setUser(null);
      clearCache();
      showSuccess(isGuest ? COPY.signedOutGuest : COPY.signedOutMember);
    },

    linkProvider() {
      showInfo({
        title: 'Coming in Phase 4',
        sub: 'Connecting another sign-in method arrives with Account settings.',
      });
    },
  };
}

export function useSessionActions(): SessionActions {
  const { auth } = useRepositories();
  const queryClient = useQueryClient();
  return useMemo(
    () =>
      createSessionActions({
        auth,
        store: useAuthStore,
        clearCache: () => queryClient.clear(),
        confirm: nativeConfirm,
      }),
    [auth, queryClient],
  );
}
