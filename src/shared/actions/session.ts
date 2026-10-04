import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/DiProvider';
import type { AuthRepository } from '@/features/auth/data/AuthRepository';
import { useAuthStore } from '@/features/auth/state/authStore';

import { confirm as nativeConfirm, type Confirm } from '../lib/confirm';
import { showInfo, showSuccess } from '../ui/toast';

export interface SessionActions {
  /** Marks onboarding done (creating a guest first if nobody is signed in). The route guard then opens Home. */
  finishOnboarding(options?: { silent?: boolean }): Promise<void>;
  /** Confirm → repository → toast. The route guard then shows Login (returning-user variant). */
  signOut(): Promise<void>;
  /** Account: connect Apple/Google to an existing account (not supported yet; it says so). */
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
  // Check-ins aren't synced yet: they stay on this device, kept for this account.
  confirmMember: 'Your check-ins stay on this device. Sign in again any time to see them.',
  confirmGuest:
    "You're using Streak as a guest, so your check-ins stay on this device. Continue as a guest later to pick up where you left off.",
  signedOutMember: {
    title: 'Signed out',
    sub: 'Your check-ins stay on this device for when you sign back in.',
  },
  signedOutGuest: { title: 'Signed out', sub: 'Your check-ins stay on this device.' },
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
        // Ends this device's session even offline (see AuthApi.signOut), so only a real failure lands here.
        await auth.signOut();
      } catch {
        showInfo(COPY.failed);
        return;
      }
      store.getState().setUser(null);
      clearCache();
      showSuccess(isGuest ? COPY.signedOutGuest : COPY.signedOutMember);
    },

    linkProvider() {
      showInfo({
        title: 'Not available yet',
        sub: 'Connecting another sign-in method isn’t supported yet.',
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
