import { focusManager, onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { isNetworkError } from '@/core/errors/AppError';
import { useAuthStore } from '@/features/auth/state/authStore';
import { checkInsQueryKey } from '@/features/checkins/hooks/useCheckIns';
import { workoutDaysQueryKey } from '@/features/training/hooks/useWorkoutDays';
import { checkInCount } from '@/shared/lib/format/dates';
import { showInfo } from '@/shared/ui/toast';

import type { SyncProgress } from '../data/SyncRepository';
import { useSyncPreferencesStore } from '../state/syncPreferencesStore';
import { onSyncRequested } from '../state/syncRequests';
import { useSyncStatusStore } from '../state/syncStatusStore';

/** How long sync waits after a check-in changes, so a burst of taps goes in one run. */
export const SYNC_AFTER_CHANGE_MS = 3000;
/** An upload at least this big says when it's done; smaller ones finish unnoticed. */
const ANNOUNCE_UPLOADS_OF = 50;

/**
 * Keeps a signed-in account's check-ins in sync while the Sync switch is on, and brings in the days they
 * worked out in Teras: right after sign-in, at launch, when the phone comes back online, when the app
 * returns to the foreground, and a few seconds after a check-in is saved, deleted or restored. One run at a
 * time; a run stops between batches when the app goes to the background or offline, and the next one
 * carries on. Guests never sync. Mounted once.
 */
export function useBackgroundSync(): void {
  const { sync } = useRepositories();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));
  const enabled = useSyncPreferencesStore((s) => s.enabled);

  useEffect(() => {
    const { setStatus } = useSyncStatusStore.getState();
    setStatus({ kind: 'idle', refused: 0 });
    if (!userId || !enabled) return;

    let alive = true;
    let running = false;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const shouldContinue = () => alive && onlineManager.isOnline() && focusManager.isFocused();
    const onProgress = ({ step, done, total }: SyncProgress) => {
      if (!alive) return;
      setStatus(step === 'backingUp' ? { kind: 'backingUp', done, total } : { kind: 'updating' });
    };

    const run = async () => {
      if (running) {
        again = true;
        return;
      }
      if (!onlineManager.isOnline()) {
        setStatus({ kind: 'waiting' });
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const result = await sync.run(userId, { onProgress, shouldContinue });
          if (!alive) return;
          if (result.changed) await queryClient.invalidateQueries({ queryKey: checkInsQueryKey(userId) });
          if (result.workoutDaysChanged) {
            await queryClient.invalidateQueries({ queryKey: workoutDaysQueryKey(userId) });
          }
          if (!result.complete) {
            // Stopped between batches: offline waits for a connection; the background resumes on return.
            if (!onlineManager.isOnline()) setStatus({ kind: 'waiting' });
            return;
          }
          setStatus({ kind: 'idle', refused: result.refused });
          if (result.pushed >= ANNOUNCE_UPLOADS_OF) {
            showInfo({
              title: 'Your check-ins are backed up',
              sub: `${checkInCount(result.pushed)} sent to your account.`,
            });
          }
        } while (again && shouldContinue());
      } catch (error) {
        if (!alive) return;
        // A run that failed part-way may have stored a page already, so screens read the phone again.
        void queryClient.invalidateQueries({ queryKey: checkInsQueryKey(userId) });
        void queryClient.invalidateQueries({ queryKey: workoutDaysQueryKey(userId) });
        if (isNetworkError(error)) {
          setStatus({ kind: 'waiting' });
          return;
        }
        setStatus({ kind: 'failed' });
        // Everything unsent stays marked on the phone and goes next time. Never logs check-in data.
        console.error(`[sync] Sync failed (${error instanceof Error ? error.name : 'unknown'})`); // TODO(Sentry)
      } finally {
        running = false;
      }
    };

    void run();
    const offOnline = onlineManager.subscribe((online) => {
      if (online) void run();
      else setStatus({ kind: 'waiting' });
    });
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) void run();
    });
    const offRequests = onSyncRequested(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), SYNC_AFTER_CHANGE_MS);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      offOnline();
      offFocus();
      offRequests();
    };
  }, [sync, queryClient, userId, enabled]);
}
