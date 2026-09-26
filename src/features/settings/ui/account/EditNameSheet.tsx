import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';
import { profileQueryKey, useProfile } from '@/features/profile/hooks/useProfile';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { Banner, Button, SheetLayout, Text, TextField } from '@/shared/ui';
import { showSuccess } from '@/shared/ui/toast';

export const MAX_NAME_LENGTH = 60;

/**
 * Edit your name. Saved on the device first (so it works offline) and sent to your account when online;
 * the sheet only closes once the local save has succeeded.
 */
export function EditNameSheet() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);
  const { profile: profiles } = useRepositories();
  const queryClient = useQueryClient();
  const [initial] = useState(() => profile?.displayName ?? user?.displayName ?? '');
  const name = useRef(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const next = name.current.trim();
    if (!user || saving) return;
    if (!next) {
      setError('Enter a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await profiles.updateDisplayName(user.id, next);
    } catch {
      haptics.error();
      setError("Couldn't save your name. Please try again.");
      setSaving(false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
    goBack();
    showSuccess({ title: 'Name updated' });
    haptics.success();
  };

  return (
    <SheetLayout title="Name" onClose={() => goBack()} testID="edit-name-sheet">
      <TextField
        label="Name"
        defaultValue={initial}
        onChangeText={(text) => (name.current = text)}
        autoFocus
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
      <Text variant="footnote" tone="secondary" style={styles.hint}>
        Shown on your profile.
      </Text>
      {error ? <Banner message={error} /> : null}
      <Button label="Save" onPress={() => void save()} loading={saving} loadingLabel="Saving…" />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: -8 },
});
