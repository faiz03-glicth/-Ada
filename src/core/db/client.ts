import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

function openDatabase() {
  // The change listener enables Drizzle live queries.
  const sqlite = openDatabaseSync('streak.db', { enableChangeListener: true });
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return drizzle(sqlite, { schema });
}

let opened: ReturnType<typeof openDatabase> | null = null;

/**
 * The one on-device database, opened the first time it's needed. That's the migrations boot task, so a
 * database that can't be opened shows the boot error screen instead of crashing the app as it loads.
 */
export function getDb(): ReturnType<typeof openDatabase> {
  opened ??= openDatabase();
  return opened;
}
