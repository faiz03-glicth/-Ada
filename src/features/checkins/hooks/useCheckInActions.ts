import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { activityById } from '@/features/activities/domain/catalog';
import { INTENSITY_LEVELS, intensityLevel } from '@/features/heatmap/domain/intensity';
import { confirm as nativeConfirm, type Confirm } from '@/shared/lib/confirm';
import { toISODate, type ISODate } from '@/shared/lib/date/isoDate';
import { checkInCount, dayLabel, formatTime } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess, type ToastMessage } from '@/shared/ui/toast';

import type { CheckInOwner, CheckInRepository } from '../data/CheckInRepository';
import {
  CHECK_IN_PROBLEM_COPY,
  minuteOfDay,
  validateNewCheckIn,
  type CheckIn,
  type NewCheckIn,
} from '../domain/CheckIn';
import { useCheckInFeedbackStore } from '../state/checkInFeedbackStore';
import { checkInsQueryKey, useCheckInOwner } from './useCheckIns';

export type SaveResult = { ok: true; checkIn: CheckIn } | { ok: false; message: string };

export interface CheckInActions {
  /**
   * Validate → store on the device → update the cache (every screen follows) → pulse the day. Resolves
   * only after the check-in is stored; on failure nothing changes and the message says what to do.
   * It announces nothing: the caller closes its sheet first, then calls `announce`.
   */
  save(input: NewCheckIn): Promise<SaveResult>;
  /** The success toast (with Undo) and the success haptic, for a check-in that was saved. */
  announce(checkIn: CheckIn): void;
  /** Takes a just-saved check-in back out. */
  undo(checkIn: CheckIn): Promise<void>;
  /** Confirm → delete one check-in → toast with Undo (which restores it). */
  remove(checkIn: CheckIn): Promise<void>;
  /** Brings a deleted check-in back. */
  restore(checkIn: CheckIn): Promise<void>;
  /** Logs the last activity again, now (holding +). Null when there's nothing to repeat yet. */
  repeatLast(): Promise<SaveResult | null>;
  /** Confirm → delete every check-in → toast. */
  deleteAll(): Promise<void>;
}

export interface CheckInActionDeps {
  repository: CheckInRepository;
  owner: CheckInOwner;
  queryClient: QueryClient;
  now: () => Date;
  confirm: Confirm;
  toast: { success: (message: ToastMessage) => void; info: (message: Omit<ToastMessage, 'undo'>) => void };
  pulse: (day: ISODate) => void;
}

const COPY = {
  saveFailed: "Couldn't save your check-in. It's still here, so try again.",
  undoFailed: { title: "Couldn't undo", sub: 'The check-in is still saved. Try again from Day details.' },
  deleteConfirm: (count: number) =>
    `This removes ${checkInCount(count)} from this device. It can't be undone, so export a copy first.`,
  deleted: (count: number) => ({ title: 'Activity data deleted', sub: `${checkInCount(count)} removed.` }),
  deleteFailed: { title: "Couldn't delete your data", sub: 'Nothing was removed. Please try again.' },
  removeConfirm: (checkIn: CheckIn) =>
    `${activityById(checkIn.activityId).name} at ${formatTime(checkIn.minute)} will be removed from this day.`,
  removed: { title: 'Check-in deleted', sub: 'The day is updated everywhere.' },
  removeFailed: { title: "Couldn't delete the check-in", sub: 'It is still saved. Please try again.' },
  restoreFailed: { title: "Couldn't bring it back", sub: 'Please add the check-in again.' },
};

export function createCheckInActions(deps: CheckInActionDeps): CheckInActions {
  const key = checkInsQueryKey(deps.owner);
  const cached = () => deps.queryClient.getQueryData<CheckIn[]>(key);
  // New arrays each time: the index (and so every derived number) is rebuilt once per change.
  const update = (change: (list: CheckIn[]) => CheckIn[]) => {
    if (cached()) deps.queryClient.setQueryData<CheckIn[]>(key, (list) => change(list ?? []));
    else void deps.queryClient.invalidateQueries({ queryKey: key });
  };

  const actions: CheckInActions = {
    async save(input) {
      const now = deps.now();
      const valid = validateNewCheckIn(input, toISODate(now), minuteOfDay(now));
      if (!valid.ok) return { ok: false, message: CHECK_IN_PROBLEM_COPY[valid.problem] };
      let checkIn: CheckIn;
      try {
        checkIn = await deps.repository.add(deps.owner, valid.value);
      } catch {
        haptics.error();
        return { ok: false, message: COPY.saveFailed };
      }
      update((list) => [...list, checkIn]);
      deps.pulse(checkIn.date);
      return { ok: true, checkIn };
    },

    announce(checkIn) {
      const count = (cached() ?? []).filter((c) => c.date === checkIn.date).length;
      const level = INTENSITY_LEVELS[intensityLevel(count)].name;
      deps.toast.success({
        title: `Checked in · ${activityById(checkIn.activityId).name}`,
        sub: `${dayLabel(checkIn.date, toISODate(deps.now()))} now has ${checkInCount(count)} · ${level}`,
        undo: () => void actions.undo(checkIn),
      });
      haptics.success();
    },

    async undo(checkIn) {
      try {
        await deps.repository.remove(checkIn.id);
      } catch {
        haptics.error();
        deps.toast.info(COPY.undoFailed);
        return;
      }
      update((list) => list.filter((c) => c.id !== checkIn.id));
      haptics.light();
    },

    async remove(checkIn) {
      haptics.warning();
      const confirmed = await deps.confirm({
        title: 'Delete this check-in?',
        message: COPY.removeConfirm(checkIn),
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await deps.repository.remove(checkIn.id);
      } catch {
        haptics.error();
        deps.toast.info(COPY.removeFailed);
        return;
      }
      update((list) => list.filter((c) => c.id !== checkIn.id));
      deps.toast.success({ ...COPY.removed, undo: () => void actions.restore(checkIn) });
      haptics.light();
    },

    async restore(checkIn) {
      let restored: CheckIn;
      try {
        restored = await deps.repository.restore(checkIn.id);
      } catch {
        haptics.error();
        deps.toast.info(COPY.restoreFailed);
        return;
      }
      update((list) => [...list.filter((c) => c.id !== restored.id), restored]);
      haptics.light();
    },

    async repeatLast() {
      const list = cached() ?? [];
      const last = list.reduce<CheckIn | null>(
        (latest, c) => (!latest || c.createdAt > latest.createdAt ? c : latest),
        null,
      );
      if (!last) return null;
      const now = deps.now();
      return actions.save({
        date: toISODate(now),
        minute: minuteOfDay(now),
        activityId: last.activityId,
        note: '',
      });
    },

    async deleteAll() {
      const count = (cached() ?? []).length;
      haptics.warning();
      const confirmed = await deps.confirm({
        title: 'Delete all activity data?',
        message: COPY.deleteConfirm(count),
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;
      let removed: number;
      try {
        removed = await deps.repository.removeAll(deps.owner);
      } catch {
        haptics.error();
        deps.toast.info(COPY.deleteFailed);
        return;
      }
      update(() => []);
      deps.toast.success(COPY.deleted(removed));
      haptics.success();
    },
  };
  return actions;
}

/** The check-in actions for whoever is signed in (or the guest). */
export function useCheckInActions(): CheckInActions {
  const { checkIns } = useRepositories();
  const owner = useCheckInOwner() ?? null;
  const queryClient = useQueryClient();
  const pulse = useCheckInFeedbackStore((s) => s.pulse);
  return useMemo(
    () =>
      createCheckInActions({
        repository: checkIns,
        owner,
        queryClient,
        now: () => new Date(),
        confirm: nativeConfirm,
        toast: { success: showSuccess, info: showInfo },
        pulse,
      }),
    [checkIns, owner, queryClient, pulse],
  );
}
