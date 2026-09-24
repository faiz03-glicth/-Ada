import { useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import { Card, Heatmap } from '@/shared/ui';

import { HERO_COLUMNS } from '../../config/heroPattern';
import { StepHeading } from './StepHeading';

const GAP = 5;
const MAX_CELL = 20;
/** Screen side padding (24 × 2) + card padding (8 × 2) + card border. */
const HORIZONTAL_CHROME = 48 + 16 + 2;

export function WelcomeStep({ grid, title, body }: { grid: HeatGrid; title: string; body: string }) {
  const { width } = useWindowDimensions();
  // 20pt cells as designed, shrinking only as much as a narrow phone needs.
  const cell = Math.min(
    MAX_CELL,
    Math.floor((width - HORIZONTAL_CHROME - GAP * (HERO_COLUMNS - 1)) / HERO_COLUMNS),
  );

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.hero}>
          <Heatmap grid={grid} cellSize={cell} gap={GAP} radius={6} animateIn />
        </View>
      </Card>
      <StepHeading title={title} body={body} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 18, paddingHorizontal: 8 },
  hero: { alignItems: 'center', paddingVertical: 10 },
});
