import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { AuthIntent } from '@/features/auth/domain/types';
import { Banner, Button, NavBar, Screen } from '@/shared/ui';
import { layoutMotion } from '@/theme';

import { BenefitsCard } from './components/BenefitsCard';
import { CodeStep } from './components/CodeStep';
import { EmailStep } from './components/EmailStep';
import { LegalFooter } from './components/LegalFooter';
import { LoginHeader } from './components/LoginHeader';
import { ProviderButtons } from './components/ProviderButtons';
import { useLoginViewModel } from './useLoginViewModel';

/** One route for new and returning people; providers → email → code are in-page steps. */
export function LoginScreen({ intent }: { intent: AuthIntent }) {
  const vm = useLoginViewModel(intent);
  const emailBusy = vm.busyProvider === 'email';

  return (
    <Screen scroll inset="wide" testID={`login-${intent}`} contentStyle={styles.content}>
      <NavBar
        onBack={vm.onBack}
        backDisabled={vm.busy}
        right={
          vm.showSkip && vm.step === 'providers' ? (
            <Button
              label="Skip"
              variant="quiet"
              size="sm"
              onPress={vm.onSkip}
              disabled={vm.busy}
              testID="login-skip"
            />
          ) : null
        }
      />

      <Animated.View
        key={vm.step}
        entering={layoutMotion.fade}
        exiting={layoutMotion.fadeOut}
        style={styles.step}
      >
        <LoginHeader title={vm.heading.title} subtitle={vm.heading.subtitle} />
        {vm.step === 'providers' && <BenefitsCard benefits={vm.benefits} />}
        <View style={styles.spacer} />
        {vm.banner ? <Banner message={vm.banner} testID="login-banner" /> : null}

        {vm.step === 'providers' && (
          <ProviderButtons
            showApple={vm.showApple}
            busyProvider={vm.busyProvider}
            onApple={vm.onApple}
            onGoogle={vm.onGoogle}
            onEmail={vm.onContinueWithEmail}
          />
        )}
        {vm.step === 'email' && (
          <EmailStep
            email={vm.email}
            emailValid={vm.emailValid}
            sending={emailBusy}
            onChange={vm.onEmailChange}
            onSubmit={vm.onSendCode}
          />
        )}
        {vm.step === 'code' && (
          <CodeStep
            code={vm.code}
            codeError={vm.codeError}
            verifying={emailBusy}
            resendLabel={vm.resendLabel}
            canResend={vm.canResend}
            onChange={vm.onCodeChange}
            onComplete={vm.onCodeComplete}
            onResend={vm.onResend}
            onUseDifferentEmail={vm.onUseDifferentEmail}
          />
        )}
      </Animated.View>

      <LegalFooter onTerms={vm.onTerms} onPrivacy={vm.onPrivacy} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.stack },
  step: { flexGrow: 1, gap: theme.spacing.stack },
  spacer: { flexGrow: 1, minHeight: theme.spacing.sm },
}));
