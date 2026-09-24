import { EmptyState } from './EmptyState';
import { NavBar } from './NavBar';
import { Screen } from './Screen';

export interface PhasePlaceholderProps {
  title: string;
  phase: number;
  onBack?: () => void;
  body?: string;
  withTabBar?: boolean;
}

/** Stand-in for routes not built yet, so every entry point already navigates somewhere real. */
export function PhasePlaceholder({ title, phase, onBack, body, withTabBar = false }: PhasePlaceholderProps) {
  return (
    <Screen withTabBar={withTabBar} testID={`placeholder-${title}`}>
      <NavBar title={title} onBack={onBack} />
      <EmptyState
        icon="sparkles"
        title={`Coming in Phase ${phase}`}
        body={body ?? `${title} is part of Phase ${phase} of the build.`}
      />
    </Screen>
  );
}
