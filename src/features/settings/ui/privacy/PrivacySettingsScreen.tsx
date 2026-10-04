import { useQueryClient } from '@tanstack/react-query';
import { Share } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { checkInsToCsv, checkInsToJson } from '@/features/checkins/domain/export';
import type { CheckIn } from '@/features/checkins/domain/CheckIn';
import { useCheckInActions } from '@/features/checkins/hooks/useCheckInActions';
import { checkInsQueryKey, useCheckInOwner, useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { useSyncSettingsViewModel } from '@/features/sync/ui/useSyncSettingsViewModel';
import { goBack, openLegal } from '@/shared/actions';
import { checkInCount } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { Card, ListRow, NavBar, Screen, SectionLabel, Text } from '@/shared/ui';
import { showInfo } from '@/shared/ui/toast';

const NOT_YET = 'Not available yet';

/**
 * Data & privacy. Everything here reflects what Streak really does today: check-ins live on this device
 * and, for a signed-in account with Sync on (the default), are backed up to the account; export goes
 * through the phone's share sheet, and deleting is real (after a confirmation). Features that don't exist
 * yet say so instead of offering a switch that does nothing.
 */
export function PrivacySettingsScreen() {
  const sync = useSyncSettingsViewModel();
  const { index } = useCheckIns();
  const owner = useCheckInOwner() ?? null;
  const queryClient = useQueryClient();
  const actions = useCheckInActions();

  const exportAs = async (format: 'csv' | 'json') => {
    const all = queryClient.getQueryData<CheckIn[]>(checkInsQueryKey(owner)) ?? [];
    if (!all.length) {
      showInfo({ title: 'Nothing to export yet', sub: 'Your check-ins will be here once you log some.' });
      return;
    }
    try {
      const result = await Share.share({
        title: format === 'csv' ? 'Streak check-ins (CSV)' : 'Streak backup (JSON)',
        message: format === 'csv' ? checkInsToCsv(all) : checkInsToJson(all),
      });
      if (result.action === Share.sharedAction) haptics.success();
    } catch {
      haptics.error();
      showInfo({ title: "Couldn't export", sub: 'Please try again.' });
    }
  };

  const unavailable = (title: string, sub: string) => () => showInfo({ title, sub });

  return (
    <Screen scroll testID="settings-privacy">
      <NavBar title="Data & privacy" onBack={() => goBack()} />

      <SectionLabel>Sync</SectionLabel>
      <Card tight>
        <ListRow
          title="Sync"
          description={sync.description}
          icon="upload"
          iconColor="blue"
          value={sync.canSync ? undefined : 'Off'}
          trailing={sync.canSync ? 'toggle' : 'none'}
          toggleValue={sync.enabled}
          onToggle={sync.onToggle}
          testID="privacy-sync"
        />
      </Card>

      <SectionLabel>Security</SectionLabel>
      <Card tight>
        <ListRow
          title="App lock"
          description="Lock Streak when you leave the app"
          icon="lock"
          iconColor="purple"
          value={NOT_YET}
        />
      </Card>

      <SectionLabel>Your data</SectionLabel>
      <Card tight divided>
        <ListRow
          title="Export as CSV"
          icon="download"
          iconColor="teal"
          value="Spreadsheet"
          trailing="chevron"
          onPress={() => void exportAs('csv')}
          testID="privacy-export-csv"
        />
        <ListRow
          title="Export as JSON"
          icon="download"
          iconColor="teal"
          value="Backup"
          trailing="chevron"
          onPress={() => void exportAs('json')}
          testID="privacy-export-json"
        />
        <ListRow
          title="Import check-ins"
          icon="upload"
          iconColor="teal"
          value={NOT_YET}
          onPress={unavailable(
            'Importing isn’t available yet',
            'Keep your JSON backup: it will import later.',
          )}
        />
      </Card>

      <SectionLabel>Privacy</SectionLabel>
      <Card tight divided>
        <ListRow
          title="Usage data"
          description="Streak doesn't collect usage analytics."
          icon="chart"
          iconColor="purple"
        />
        <ListRow
          title="Privacy policy"
          icon="shield"
          iconColor="purple"
          trailing="chevron"
          onPress={() => void openLegal('privacy')}
        />
      </Card>

      <Card tight>
        <ListRow
          title="Delete all activity data"
          danger
          centered
          onPress={() => void actions.deleteAll()}
          testID="privacy-delete-all"
        />
      </Card>
      <Text variant="mini" tone="tertiary" style={styles.footnote}>
        {checkInCount(index.total)} stored on this device. Deleting can&apos;t be undone, so export a copy
        first.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footnote: { paddingHorizontal: 6, lineHeight: 16 },
});
