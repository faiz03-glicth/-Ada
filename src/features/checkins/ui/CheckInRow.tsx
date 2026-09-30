import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { activityById } from '@/features/activities/domain/catalog';
import { formatTime } from '@/shared/lib/format/dates';
import { ActivityBadge, IconButton, PressableScale, Text } from '@/shared/ui';

import type { CheckIn } from '../domain/CheckIn';

export interface CheckInRowProps {
  checkIn: CheckIn;
  /**
   * summary: Home's today list (time · note under the name);
   * history: History (note under the name, time on the right);
   * timeline: the Day sheet (time on the left, an options button on the right).
   */
  layout: 'summary' | 'history' | 'timeline';
  onPress?: () => void;
  /** Timeline only: the row's options (delete). */
  onOptions?: (checkIn: CheckIn) => void;
  /** Hairline under the row (not after the last one). */
  divider?: boolean;
}

/** One check-in, drawn the same way wherever check-ins are listed. Reads as one phrase to screen readers. */
export const CheckInRow = memo(function CheckInRow({
  checkIn,
  layout,
  onPress,
  onOptions,
  divider = false,
}: CheckInRowProps) {
  const activity = activityById(checkIn.activityId);
  const time = formatTime(checkIn.minute);
  const detail =
    layout === 'summary'
      ? checkIn.note
        ? `${time} · ${checkIn.note}`
        : time
      : checkIn.note || (layout === 'timeline' ? 'No note' : '—');
  const spoken = `${activity.name}, ${time}${checkIn.note ? `, ${checkIn.note}` : ''}`;

  const body = (
    <>
      {layout === 'timeline' && (
        <Text variant="footnote" tone="tertiary" style={styles.time}>
          {time}
        </Text>
      )}
      <ActivityBadge activity={activity} size={layout === 'summary' ? 40 : 36} />
      <View style={styles.text}>
        <Text variant="sub" weight="medium" numberOfLines={1}>
          {activity.name}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {layout === 'history' && (
        <Text variant="footnote" tone="secondary" style={styles.tabular}>
          {time}
        </Text>
      )}
      {layout === 'timeline' && onOptions && (
        <IconButton
          icon="pencil"
          plain
          onPress={() => onOptions(checkIn)}
          accessibilityLabel={`Options for ${activity.name} at ${time}`}
        />
      )}
    </>
  );

  const style = [styles.row(layout === 'timeline'), divider && styles.divider];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={style}
      >
        {body}
      </PressableScale>
    );
  }
  return (
    <View
      style={style}
      accessible={layout !== 'timeline'}
      accessibilityLabel={layout !== 'timeline' ? spoken : undefined}
    >
      {body}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: (top: boolean) => ({
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: top ? ('flex-start' as const) : ('center' as const),
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  }),
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  text: { flex: 1, gap: 1, paddingTop: 1 },
  time: { width: 58, paddingTop: 10, fontVariant: ['tabular-nums'] },
  tabular: { fontVariant: ['tabular-nums'] },
}));
