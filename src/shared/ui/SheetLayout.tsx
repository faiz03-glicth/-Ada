import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetLayoutProps {
  title: string;
  /** Small line above the title ("Today"). */
  eyebrow?: string;
  /** Line under the title ("Today, 7:30 PM"). */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * The inside of every bottom sheet (Check-in, Day details). The sheet itself is the platform's native
 * form sheet (the stack presents it), so dragging, settling and dismissing follow the finger natively;
 * this lays out its header (title, Close) and scrolls the content above the keyboard.
 */
export function SheetLayout({ title, eyebrow, subtitle, onClose, children, testID }: SheetLayoutProps) {
  return (
    <KeyboardAwareScrollView
      testID={testID}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      accessibilityViewIsModal
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          {eyebrow ? (
            <Text variant="caption" tone="secondary">
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="title3" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="footnote" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" testID="sheet-close" />
      </View>
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    gap: 18,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing.lg) + theme.spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titles: { flex: 1, gap: 2 },
}));
