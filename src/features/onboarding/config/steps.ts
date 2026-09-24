export interface OnboardingStepCopy {
  id: 'welcome' | 'intensity' | 'setup';
  title: string;
  body: string;
  primaryLabel: string;
}

/** The three onboarding steps, in order (index = the route's ?step param). */
export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'See your consistency at a glance',
    body: 'Log anything you do, as often as you like. Every check-in fills in today on your heatmap.',
    primaryLabel: 'Get started',
  },
  {
    id: 'intensity',
    title: 'More check-ins,\ndeeper color',
    body: 'A day with more activity looks darker. Quiet days stay light.',
    primaryLabel: 'Continue',
  },
  {
    id: 'setup',
    title: 'What will you track?',
    body: 'Pick a few to start. You can add your own later.',
    primaryLabel: 'Start tracking',
  },
] as const satisfies readonly [OnboardingStepCopy, OnboardingStepCopy, OnboardingStepCopy];

export const REMINDER_COPY = {
  title: 'Daily reminder at 8:00 PM',
  description: "Only if you haven't checked in",
};
