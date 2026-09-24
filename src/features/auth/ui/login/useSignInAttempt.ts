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
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const { finishOnboarding } = useSessionActions();
  const [feedback, setFeedback] = useState<AuthFeedback>({ banner: null, codeError: null });

  /** New people continue to onboarding step 1; returning people go Home (via the route guard). */
  const continueAfterSignIn = async (user: AuthUser) => {
    haptics.success();
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
