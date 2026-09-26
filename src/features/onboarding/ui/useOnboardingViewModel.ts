import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { SEED_ACTIVITIES } from '@/features/activities/config/seedActivities';
import { useAuthStore } from '@/features/auth/state/authStore';
import { openLogin, showOnboardingStep, type OnboardingStep } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { HERO_GRID } from '../config/heroPattern';
import { ONBOARDING_STEPS, REMINDER_COPY } from '../config/steps';

const previous = (step: OnboardingStep): OnboardingStep => (step === 2 ? 1 : 0);
/** A pager page as a step (the pager only ever reports 0…2). */
const asStep = (page: number): OnboardingStep => (page >= 2 ? 2 : page <= 0 ? 0 : 1);

export function useOnboardingViewModel(step: OnboardingStep) {
  const draft = useAuthStore((s) => s.onboardingDraft);
  const toggleDraftActivity = useAuthStore((s) => s.toggleDraftActivity);
  const setDraftReminder = useAuthStore((s) => s.setDraftReminder);
  const { finishOnboarding } = useSessionActions();
  const [finishing, setFinishing] = useState(false);

  /**
   * The three steps are pages of one pager: swiping, Continue and Back all just set the step (the latest
   * wins; setting a param is idempotent). How the pages move is the pager's job.
   */
  const back = () => {
    if (step > 0) showOnboardingStep(previous(step));
  };

  // Android's back button goes one page back too, like the on-screen Back (on Welcome it leaves as usual).
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      showOnboardingStep(previous(step));
      return true;
    });
    return () => subscription.remove();
  }, [step]);

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

  // Handed to the pages, so kept the same between renders: a page only re-renders when its own data changes.
  const onPageChange = useCallback((page: number) => showOnboardingStep(asStep(page)), []);
  const onToggleActivity = useCallback(
    (id: string) => {
      haptics.selection();
      toggleDraftActivity(id);
    },
    [toggleDraftActivity],
  );
  // Saved now; the reminder itself is scheduled in Phase 6.
  const onToggleReminder = useCallback((enabled: boolean) => setDraftReminder(enabled), [setDraftReminder]);

  const onPrimary = {
    0: () => openLogin('new'),
    1: () => showOnboardingStep(2),
    2: () => void finish(),
  }[step];

  return {
    step,
    stepCount: ONBOARDING_STEPS.length,
    /** Every page's copy (the pager shows them side by side); `copy` is the current one. */
    pages: ONBOARDING_STEPS,
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
    onBack: back,
    /** A swipe landed on another page. */
    onPageChange,
    onToggleActivity,
    onToggleReminder,
  };
}

export type OnboardingViewModel = ReturnType<typeof useOnboardingViewModel>;
