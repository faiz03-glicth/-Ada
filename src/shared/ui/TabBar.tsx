import type { RefObject } from 'react';
import type { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import type { TabId, TabItem } from '../config/tabs';
import { ClassicTabBar } from './ClassicTabBar';
import { LiquidTabBar } from './LiquidTabBar';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
  /** Holding +: a shortcut (repeat the last check-in). A hold never also counts as a tap. */
  onFabLongPress?: () => void;
  /** What the Liquid Glass bar frosts (Android): the tab screens' BlurTarget. */
  blurTarget?: RefObject<View | null>;
}

/**
 * The footer, by material: Liquid Glass gets the floating frosted bar with its flowing highlight; Classic
 * gets a plain docked bar with none of it. Same tabs, same + button, same navigation either way. Switching
 * material swaps them under the theme transition's veil, so neither is ever seen half-changed.
 */
export function TabBar({ blurTarget, ...props }: TabBarProps) {
  const { theme } = useUnistyles();
  return theme.glass ? <LiquidTabBar {...props} blurTarget={blurTarget} /> : <ClassicTabBar {...props} />;
}
