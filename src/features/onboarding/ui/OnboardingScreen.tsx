import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { OnboardingStep } from '@/shared/actions';
import { Button, IntensityGuide, NavBar, PageDots, Screen } from '@/shared/ui';

import { SetupStep } from './components/SetupStep';
import { StepHeading } from './components/StepHeading';
import { WelcomeStep } from './components/WelcomeStep';
import { useOnboardingViewModel } from './useOnboardingViewModel';

export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const vm = useOnboardingViewModel(step);

  return (
    <Screen scroll inset="wide" testID={`onboarding-step-${vm.step}`} contentStyle={styles.content}>
      <NavBar
        onBack={vm.showBack ? vm.onBack : undefined}
        right={
          vm.showSkip ? (
            <Button
              label="Skip"
              variant="quiet"
              size="sm"
              onPress={vm.onSkip}
              disabled={vm.finishing}
              testID="onboarding-skip"
            />
          ) : null
        }
      />

      {vm.copy.id === 'welcome' && (
        <WelcomeStep grid={vm.heroGrid} title={vm.copy.title} body={vm.copy.body} />
      )}
      {vm.copy.id === 'intensity' && (
        <>
          <StepHeading title={vm.copy.title} body={vm.copy.body} />
          <IntensityGuide layout="list" cellSize={30} />
        </>
      )}
      {vm.copy.id === 'setup' && (
        <SetupStep
          title={vm.copy.title}
          body={vm.copy.body}
          activities={vm.activities}
          selectedIds={vm.selectedActivityIds}
          onToggleActivity={vm.onToggleActivity}
          reminder={{ ...vm.reminderCopy, enabled: vm.reminderEnabled, onToggle: vm.onToggleReminder }}
        />
      )}

      <View style={styles.spacer} />
      <PageDots count={vm.stepCount} index={vm.step} />
      <Button
        label={vm.copy.primaryLabel}
        onPress={vm.onPrimary}
        loading={vm.finishing}
        disabled={vm.primaryDisabled}
        testID="onboarding-primary"
      />
      {vm.copy.id === 'welcome' && (
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={vm.onHaveAccount}
          testID="onboarding-have-account"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  spacer: { flexGrow: 1, minHeight: theme.spacing.sm },
}));
