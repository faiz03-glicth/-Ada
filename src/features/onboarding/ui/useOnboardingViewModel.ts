import { useState } from 'react';

import { SEED_ACTIVITIES } from '@/features/activities/config/seedActivities';
import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack, openLogin, openOnboarding, type OnboardingStep } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { HERO_GRID } from '../config/heroPattern';
import { ONBOARDING_STEPS, REMINDER_COPY } from '../config/steps';

const previous = (step: OnboardingStep): OnboardingStep => (step === 2 ? 1 : 0);

export function useOnboardingViewModel(step: OnboardingStep) {
  const draft = useAuthStore((s) => s.onboardingDraft);
  const toggleDraftActivity = useAuthStore((s) => s.toggleDraftActivity);
  const setDraftReminder = useAuthStore((s) => s.setDraftReminder);
  const { finishOnboarding } = useSessionActions();
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishOnboarding();
      haptics.success();
    } catch {
      showInfo({ title: "Couldn't finish setup", sub: 'Please try again.' });
    } finally {
      setFinishing(false);
    }
  };

  const onPrimary = {
    0: () => openLogin('new'),
    1: () => openOnboarding(2),
    2: () => void finish(),
  }[step];

  return {
    step,
    stepCount: ONBOARDING_STEPS.length,
    copy: ONBOARDING_STEPS[step],
    reminderCopy: REMINDER_COPY,
    showBack: step > 0,
    showSkip: step < 2,
    heroGrid: HERO_GRID,
    activities: SEED_ACTIVITIES,
    selectedActivityIds: draft.selectedActivityIds,
    reminderEnabled: draft.reminderEnabled,
    finishing,
    /** Setup needs at least one activity to start tracking. */
    primaryDisabled: step === 2 && draft.selectedActivityIds.length === 0,

    onPrimary,
    onSkip: () => void finish(),
    onHaveAccount: () => openLogin('existing'),
    onBack: () => goBack(() => openOnboarding(previous(step), { replace: true })),
    onToggleActivity: (id: string) => {
      haptics.selection();
      toggleDraftActivity(id);
    },
    // Saved now; the reminder itself is scheduled in Phase 6.
    onToggleReminder: (enabled: boolean) => setDraftReminder(enabled),
  };
}

export type OnboardingViewModel = ReturnType<typeof useOnboardingViewModel>;
