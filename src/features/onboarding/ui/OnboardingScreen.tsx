import { View } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { OnboardingStep } from '@/shared/actions';
import { Button, IntensityGuide, NavBar, PageDots, Screen } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import { SetupStep } from './components/SetupStep';
import { StepHeading } from './components/StepHeading';
import { WelcomeStep } from './components/WelcomeStep';
import { useOnboardingViewModel } from './useOnboardingViewModel';

/**
 * One frame for all three steps: the header, progress dots and primary button stay put, and only the
 * step's own content transitions (drifting in the direction of travel). The first render doesn't animate
 * its content: the screen itself is already arriving.
 */
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

      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={vm.step}
          entering={layoutMotion.push[vm.direction]}
          exiting={layoutMotion.fadeOut}
          style={styles.step}
        >
          {vm.copy.id === 'welcome' && (
            <WelcomeStep grid={vm.heroGrid} title={vm.copy.title} body={vm.copy.body} />
          )}
          {vm.copy.id === 'intensity' && (
            <>
              <StepHeading title={vm.copy.title} body={vm.copy.body} />
              <IntensityGuide layout="list" cellSize={30} animateIn />
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
        </Animated.View>
      </LayoutAnimationConfig>

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
  // Same rhythm inside the step as the screen uses between its sections.
  step: { gap: theme.spacing.xl },
  spacer: { flexGrow: 1, minHeight: theme.spacing.sm },
}));
