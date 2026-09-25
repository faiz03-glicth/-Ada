import { motion } from '@/theme';

export function heroCellDelay(column: number, row: number): number {
  const { columnMs, rowMs } = motion.heroStagger;
  const sweep = column * columnMs + row * rowMs;
  const nudge = ((column * 31 + row * 17) % 7) * 4;
  return sweep + nudge;
}
