import type { ReactNode } from 'react';
import { Keyboard, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { Backdrop } from './Backdrop';

export interface ScreenProps {
  children: ReactNode;
  /** Scrolls, and keeps the focused field above the keyboard. */
  scroll?: boolean;
  /** Leaves room for the floating tab bar and FAB. */
  withTabBar?: boolean;
  edges?: readonly Edge[];
  /** 'wide' = 24pt side padding (onboarding, login); default is the 16pt gutter. */
  inset?: 'default' | 'wide';
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const TAB_BAR_CLEARANCE = 104;

export function Screen({
  children,
  scroll = false,
  withTabBar = false,
  edges = ['top', 'bottom'],
  inset = 'default',
  contentStyle,
  testID,
}: ScreenProps) {
  const content = [styles.content(inset, withTabBar), contentStyle];
  return (
    <SafeAreaView edges={edges} style={styles.root} testID={testID}>
      <Backdrop />
      {scroll ? (
        <KeyboardAwareScrollView
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[styles.grow, content]}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        // Tapping empty space dismisses the keyboard; not an accessibility element.
        <Pressable style={styles.grow} onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.grow, content]}>{children}</View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
  grow: { flexGrow: 1 },
  content: (inset: 'default' | 'wide', withTabBar: boolean) => ({
    paddingHorizontal: inset === 'wide' ? theme.spacing.xxl : theme.spacing.gutter,
    paddingBottom: withTabBar ? TAB_BAR_CLEARANCE : theme.spacing.lg,
    gap: theme.spacing.stack,
  }),
}));
