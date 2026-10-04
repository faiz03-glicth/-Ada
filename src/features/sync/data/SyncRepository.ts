import type { CheckInRow } from '@/core/db/schema';
import { isNetworkError } from '@/core/errors/AppError';
import type { CheckInDao } from '@/features/checkins/data/local/checkInDao';
import type { CheckInApi, PushedCheckIn } from '@/features/checkins/data/remote/checkInApi';
import { cleanNote } from '@/features/checkins/domain/CheckIn';
import { secondsBefore } from '@/shared/lib/date/serverTime';

import type { SyncCursor, SyncStateDao } from './local/syncStateDao';

/** Check-ins sent per request. Small enough to stay quick on a slow connection. */
export const PUSH_BATCH = 200;
/** Rows pulled per request. */
export const PULL_PAGE = 500;
/** Each pull starts this much before its bookmark, so a write that committed late is never skipped. */
export const PULL_OVERLAP_SECONDS = 5;
// A run never sends more batches than this, whatever happens (a guard, not a limit anyone reaches).
const MAX_BATCHES = 1000;
const FIRST_KEY = '00000000-0000-0000-0000-000000000000';

export interface SyncProgress {
  step: 'backingUp' | 'updating';
  done: number;
  total: number;
}

export interface SyncRunOptions {
  onProgress?: (progress: SyncProgress) => void;
  /** Checked between batches: false stops the run where it is, and the next run carries on from there. */
  shouldContinue?: () => boolean;
}

export interface SyncResult {
  /** Check-ins the server now has from this run. */
  pushed: number;
  /** Rows on this phone that the pull changed (0 means nothing on screen needs to change). */
  changed: number;
  /** Check-ins the server refused: kept on this phone, and tried again after the app restarts. */
  refused: number;
  /** False when the run stopped early (the app went to the background, offline, or sync was turned off). */
  complete: boolean;
}

/**
 * Keeps the account's check-ins on this phone and on the server in step. Local-first: screens only ever
 * read SQLite; this runs beside them, a batch at a time.
 */
export interface SyncRepository {
  /** One sync for a signed-in account: send what's waiting, then fetch what changed elsewhere. */
  run(userId: string, options?: SyncRunOptions): Promise<SyncResult>;
}

export interface CloudSyncDeps {
  checkIns: Pick<CheckInDao, 'listDirty' | 'countDirty' | 'markClean' | 'applyPulled'>;
  checkInApi: CheckInApi;
  state: SyncStateDao;
  /** Gives the app a moment between batches, so taps and animations never wait for sync. */
  yieldToApp: () => Promise<void>;
}

const isRejected = (error: unknown) =>
  error instanceof Error && 'code' in error && (error as { code: unknown }).code === 'Rejected';

const toPushed = (row: CheckInRow): PushedCheckIn => ({
  id: row.id,
  date: row.date,
  minute: row.minute,
  activity_id: row.activityId,
  // Notes saved before notes were cleaned on save: cleaned now, so the server always accepts them.
  note: cleanNote(row.note),
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  deleted_at: row.deletedAt,
});

export class CloudSync implements SyncRepository {
  // Check-ins the server refused in this app session: not re-sent (and re-refused) on every run.
  private readonly refused = new Set<string>();

  constructor(private readonly deps: CloudSyncDeps) {}

  async run(userId: string, options: SyncRunOptions = {}): Promise<SyncResult> {
    const proceed = options.shouldContinue ?? (() => true);
    const push = await this.pushCheckIns(userId, options, proceed);
    if (!push.complete) {
      return { pushed: push.sent, changed: 0, refused: this.refused.size, complete: false };
    }
    const pull = await this.pullCheckIns(userId, options, proceed);
    return { pushed: push.sent, changed: pull.changed, refused: this.refused.size, complete: pull.complete };
  }

  private async pushCheckIns(userId: string, { onProgress }: SyncRunOptions, proceed: () => boolean) {
    const { checkIns, yieldToApp } = this.deps;
    const total = await checkIns.countDirty(userId, [...this.refused]);
    let sent = 0;
    if (total) onProgress?.({ step: 'backingUp', done: 0, total });
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const rows = await checkIns.listDirty(userId, PUSH_BATCH, [...this.refused]);
      if (!rows.length) break;
      const accepted = await this.send(rows);
      await checkIns.markClean(accepted.map(({ id, updatedAt }) => ({ id, updatedAt })));
      sent += accepted.length;
      onProgress?.({ step: 'backingUp', done: Math.min(sent, total), total });
      if (!proceed()) return { sent, complete: false };
      await yieldToApp();
      if (!proceed()) return { sent, complete: false };
    }
    return { sent, complete: true };
  }

  /** Sends rows; when the server refuses a batch, halves it until each refused row is alone and set aside. */
  private async send(rows: readonly CheckInRow[]): Promise<CheckInRow[]> {
    try {
      await this.deps.checkInApi.push(rows.map(toPushed));
      return [...rows];
    } catch (error) {
      if (isNetworkError(error) || !isRejected(error)) throw error;
      const [only] = rows;
      if (rows.length === 1 && only) {
        this.refused.add(only.id);
        // Never logs the row itself (it holds the person's note).
        console.error('[sync] The server refused a check-in; it stays on this phone'); // TODO(Sentry)
        return [];
      }
      const half = Math.ceil(rows.length / 2);
      return [...(await this.send(rows.slice(0, half))), ...(await this.send(rows.slice(half)))];
    }
  }

  private async pullCheckIns(userId: string, { onProgress }: SyncRunOptions, proceed: () => boolean) {
    const { checkIns, checkInApi, state, yieldToApp } = this.deps;
    const saved = await state.getCursor(userId, 'check_ins');
    // A little before the bookmark: pulling a row twice changes nothing, missing one would.
    let after: SyncCursor | null = saved
      ? { at: secondsBefore(saved.at, PULL_OVERLAP_SECONDS) ?? saved.at, key: FIRST_KEY }
      : null;
    let changed = 0;
    let pulled = 0;
    onProgress?.({ step: 'updating', done: 0, total: 0 });
    for (;;) {
      const page = await checkInApi.pull(userId, after, PULL_PAGE);
      changed += await checkIns.applyPulled(userId, page.rows);
      pulled += page.rows.length;
      if (page.next) {
        await state.setCursor(userId, 'check_ins', page.next);
        after = page.next;
      }
      if (page.rows.length < PULL_PAGE) return { changed, complete: true };
      onProgress?.({ step: 'updating', done: pulled, total: 0 });
      if (!proceed()) return { changed, complete: false };
      await yieldToApp();
    }
  }
}
