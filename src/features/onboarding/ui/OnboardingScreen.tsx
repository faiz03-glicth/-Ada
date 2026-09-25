import Animated, { LayoutAnimationConfig, useSharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { OnboardingStep } from '@/shared/actions';
import { Button, ContentSwap, IntensityGuide, NavBar, PageDots, Pager, Screen } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import { SetupStep } from './components/SetupStep';
import { StepHeading } from './components/StepHeading';
import { WelcomeStep } from './components/WelcomeStep';
import { useOnboardingViewModel } from './useOnboardingViewModel';

/**
 * Welcome, Intensity and Setup are pages of one pager: swipe between them, or use Continue and Back. The
 * frame stays put around them: the dots follow the finger, the button's label cross-fades, Back and Skip
 * fade in and out, and the buttons glide when "I already have an account" comes and goes. Arriving from
 * another screen (e.g. after signing in), the screen transition itself is the entrance.
 */
export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const vm = useOnboardingViewModel(step);
  const { theme } = useUnistyles();
  // Where the pager is, in pages: the pager writes it on the UI thread, the dots read it.
  const progress = useSharedValue<number>(vm.step);
  const [welcome, intensity, setup] = vm.pages;

  return (
    <Screen scroll inset="wide" testID={`onboarding-step-${vm.step}`} contentStyle={styles.content}>
      <NavBar
        onBack={vm.showBack ? vm.onBack : undefined}
        right={
          <ContentSwap id={vm.showSkip ? 'skip' : 'none'}>
            {vm.showSkip && (
              <Button
                label="Skip"
                variant="quiet"
                size="sm"
                onPress={vm.onSkip}
                disabled={vm.finishing}
                testID="onboarding-skip"
              />
            )}
          </ContentSwap>
        }
      />

      <Pager
        count={vm.stepCount}
        index={vm.step}
        onIndexChange={vm.onPageChange}
        progress={progress}
        inset={theme.spacing.xxl}
        renderPage={(page, seen) =>
          page === 0 ? (
            <WelcomeStep grid={vm.heroGrid} title={welcome.title} body={welcome.body} />
          ) : page === 1 ? (
            <>
              <StepHeading title={intensity.title} body={intensity.body} />
              <IntensityGuide layout="list" cellSize={30} animateIn revealed={seen} />
            </>
          ) : (
            <SetupStep
              title={setup.title}
              body={setup.body}
              activities={vm.activities}
              selectedIds={vm.selectedActivityIds}
              onToggleActivity={vm.onToggleActivity}
              reminder={{ ...vm.reminderCopy, enabled: vm.reminderEnabled, onToggle: vm.onToggleReminder }}
            />
          )
        }
      />

      <LayoutAnimationConfig skipEntering>
        <Animated.View layout={layoutMotion.settle} style={styles.actions}>
          <PageDots count={vm.stepCount} index={vm.step} progress={progress} />
          <Button
            label={vm.copy.primaryLabel}
            onPress={vm.onPrimary}
            loading={vm.finishing}
            disabled={vm.primaryDisabled}
            testID="onboarding-primary"
          />
          {vm.copy.id === 'welcome' && (
            <Animated.View entering={layoutMotion.fade.in} exiting={layoutMotion.fade.out}>
              <Button
                label="I already have an account"
                variant="ghost"
                onPress={vm.onHaveAccount}
                testID="onboarding-have-account"
              />
            </Animated.View>
          )}
        </Animated.View>
      </LayoutAnimationConfig>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  actions: { gap: theme.spacing.xl },
}));
