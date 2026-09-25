import { useState } from 'react';

import { openOnboarding } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { haptics } from '@/shared/lib/haptics';
import { showSuccess } from '@/shared/ui/toast';

import { AuthError } from '../../domain/AuthError';
import { feedbackFor, signedInMessage, type AuthFeedback } from '../../domain/authFeedback';
import type { AuthIntent, AuthUser } from '../../domain/types';
import { useAuthStore } from '../../state/authStore';

/**
 * Runs one sign-in attempt: light haptic → clear old feedback → call → success haptic and continue,
 * or show the right feedback (Cancelled stays silent).
 */
export function useSignInAttempt(intent: AuthIntent) {
  const restartOnboarding = useAuthStore((s) => s.restartOnboarding);
  const { finishOnboarding } = useSessionActions();
  const [feedback, setFeedback] = useState<AuthFeedback>({ banner: null, codeError: null });

  /** New people continue to onboarding step 1; returning people go Home (via the route guard). */
  const continueAfterSignIn = async (user: AuthUser) => {
    haptics.success();
    // Read now, not at render: a new-account attempt has just cleared it.
    const { hasCompletedOnboarding } = useAuthStore.getState();
    if (!hasCompletedOnboarding && (intent === 'new' || user.provider === 'guest')) {
      openOnboarding(1, { replace: true });
      return;
    }
    await finishOnboarding({ silent: true });
    if (user.provider !== 'guest') showSuccess(signedInMessage(user));
  };

  const showFailure = (error: unknown) => {
    const next = feedbackFor(error);
    setFeedback(next);
    if (!(error instanceof AuthError) || error.code === 'Unknown') {
      // Never logs tokens, codes or addresses: only the error kind.
      console.error(`[auth] Sign-in failed (${error instanceof Error ? error.name : 'unknown'})`); // TODO(Sentry)
    }
  };

  const attempt = async (signIn: () => Promise<AuthUser>): Promise<void> => {
    haptics.light();
    setFeedback({ banner: null, codeError: null });
    // A new account always goes through setup, even on a phone where it was finished before (e.g. after
    // logging out and choosing "Get started"). Cleared before the session starts, so the route guard
    // keeps the person in onboarding instead of opening Home the moment they're signed in.
    if (intent === 'new') restartOnboarding();
    let user: AuthUser;
    try {
      user = await signIn();
    } catch (error) {
      showFailure(error);
      return;
    }
    await continueAfterSignIn(user);
  };

  /** For requests that don't sign in (sending a code). Returns whether it succeeded. */
  const request = async (call: () => Promise<void>): Promise<boolean> => {
    haptics.light();
    setFeedback({ banner: null, codeError: null });
    try {
      await call();
      return true;
    } catch (error) {
      showFailure(error);
      return false;
    }
  };

  return {
    feedback,
    attempt,
    request,
    clearCodeError: () => setFeedback((current) => ({ ...current, codeError: null })),
    clearFeedback: () => setFeedback({ banner: null, codeError: null }),
  };
}
