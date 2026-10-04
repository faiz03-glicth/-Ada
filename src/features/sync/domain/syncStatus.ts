import { checkInCount } from '@/shared/lib/format/dates';

/** What sync is doing, as Data & privacy shows it. */
export type SyncStatus =
  /** Nothing running: up to date as of the last run (or not run yet). */
  | { kind: 'idle'; refused: number }
  | { kind: 'backingUp'; done: number; total: number }
  | { kind: 'updating' }
  /** Offline: it carries on when the phone is back online. */
  | { kind: 'waiting' }
  /** The last run failed for another reason: it's tried again on the next trigger. */
  | { kind: 'failed' };

const count = (value: number) => value.toLocaleString('en-US');

/** PURE: the Sync row's description, from who is signed in, the switch and what sync is doing. */
export function syncDescription({
  member,
  enabled,
  status,
}: {
  member: boolean;
  enabled: boolean;
  status: SyncStatus;
}): string {
  if (!member) return 'Sign in to back up your check-ins and see them on your other phones.';
  if (!enabled) return 'Off. Check-ins stay on this phone.';
  switch (status.kind) {
    case 'backingUp':
      return `Backing up · ${count(status.done)} of ${count(status.total)}`;
    case 'updating':
      return 'Updating from your account…';
    case 'waiting':
      return 'Waiting for a connection';
    case 'failed':
      return "Couldn't sync just now. Streak will try again.";
    case 'idle':
      return status.refused
        ? `Backed up, except ${checkInCount(status.refused)} your account couldn't take`
        : 'Backed up to your account';
  }
}
