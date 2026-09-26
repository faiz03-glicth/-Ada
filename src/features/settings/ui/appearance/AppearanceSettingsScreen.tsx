import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Card,
  Heatmap,
  Legend,
  ListRow,
  NavBar,
  PressableScale,
  Screen,
  SegmentedControl,
  Text,
} from '@/shared/ui';

import {
  useAppearanceSettingsViewModel,
  type AppearanceSettingsViewModel,
} from './useAppearanceSettingsViewModel';

function Label({ children }: { children: string }) {
  return (
    <Text
      variant="caption"
      tone="secondary"
      weight="semibold"
      style={styles.label}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

export function AppearanceSettingsScreen() {
  const vm = useAppearanceSettingsViewModel();

  return (
    <Screen scroll testID="settings-appearance">
      <NavBar title="Appearance" onBack={vm.onBack} />

      <View style={styles.section}>
        <Label>THEME</Label>
        <Card style={styles.card}>
          <SegmentedControl
            options={vm.themeOptions}
            value={vm.theme}
            onChange={vm.onThemeChange}
            accessibilityLabel="Theme"
            testID="appearance-theme"
          />
          <Text variant="footnote" tone="secondary">
            {vm.themeCaption}
          </Text>
          <SegmentedControl
            options={vm.styleOptions}
            value={vm.style}
            onChange={vm.onStyleChange}
            accessibilityLabel="Style"
            testID="appearance-style"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Label>HEATMAP COLOUR</Label>
        <PalettePicker vm={vm} />
        <Card style={styles.preview}>
          <View style={styles.between}>
            <Text variant="footnote" tone="secondary">
              Preview
            </Text>
            <Legend />
          </View>
          <Heatmap grid={vm.palettePreview} cellSize={13} gap={3} />
        </Card>
      </View>

      <View style={styles.section}>
        <Label>CALENDAR</Label>
        <Card tight divided>
          <View style={styles.weekStart}>
            <Text variant="sub" weight="semibold" style={styles.grow}>
              Week starts on
            </Text>
            <View style={styles.weekStartControl}>
              <SegmentedControl
                options={vm.weekStartOptions}
                value={vm.weekStart}
                onChange={vm.onWeekStartChange}
                accessibilityLabel="Week starts on"
                testID="appearance-week-start"
              />
            </View>
          </View>
          <ListRow
            title="Show legend"
            description="Less → More scale under the heatmap"
            trailing="toggle"
            toggleValue={vm.showLegend}
            onToggle={vm.onShowLegendChange}
            testID="appearance-legend"
          />
          <ListRow
            title="Outline today"
            trailing="toggle"
            toggleValue={vm.outlineToday}
            onToggle={vm.onOutlineTodayChange}
            testID="appearance-outline-today"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Label>REDUCE MOTION</Label>
        <Card style={styles.card}>
          <SegmentedControl
            options={vm.reduceMotionOptions}
            value={vm.reduceMotion}
            onChange={vm.onReduceMotionChange}
            accessibilityLabel="Reduce motion"
            testID="appearance-motion"
          />
          <Text variant="footnote" tone="secondary">
            {vm.reduceMotionCaption}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Label>SOUNDS & HAPTICS</Label>
        <Card tight divided>
          <ListRow
            testID="appearance-sounds"
            icon="volume"
            iconColor="blue"
            title={vm.soundEffectsCopy.title}
            description={vm.soundEffectsCopy.description}
            trailing="toggle"
            toggleValue={vm.soundEffects}
            onToggle={vm.onSoundEffectsChange}
          />
          <ListRow
            testID="appearance-haptics"
            icon="target"
            iconColor="purple"
            title={vm.hapticsCopy.title}
            description={vm.hapticsCopy.description}
            trailing="toggle"
            toggleValue={vm.haptics}
            onToggle={vm.onHapticsChange}
          />
        </Card>
      </View>
    </Screen>
  );
}

function PalettePicker({ vm }: { vm: AppearanceSettingsViewModel }) {
  return (
    <View style={styles.palettes} accessibilityRole="radiogroup" accessibilityLabel="Heatmap colour">
      {vm.palettes.map((palette) => (
        <PressableScale
          key={palette.id}
          onPress={() => vm.onPaletteChange(palette.id)}
          accessibilityRole="radio"
          accessibilityLabel={palette.name}
          accessibilityState={{ checked: palette.selected }}
          style={[styles.palette, palette.selected && styles.paletteOn]}
          testID={`appearance-palette-${palette.id}`}
        >
          <View style={styles.swatches}>
            {palette.swatches.map((color, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
          </View>
          <Text variant="caption">{palette.name}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: { gap: theme.spacing.sm },
  label: { paddingHorizontal: theme.spacing.xs, letterSpacing: 0.6 },
  card: { gap: theme.spacing.md },
  grow: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { gap: 10, alignItems: 'stretch' },
  palettes: { flexDirection: 'row', gap: theme.spacing.sm },
  palette: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: theme.radii.control,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.glass?.card.background ?? theme.colors.surface,
  },
  paletteOn: { borderColor: theme.colors.accent },
  swatches: { flexDirection: 'row', gap: 2 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  weekStart: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  weekStartControl: { width: 120 },
}));
