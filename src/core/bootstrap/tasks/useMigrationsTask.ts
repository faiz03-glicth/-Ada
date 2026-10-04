import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import { getDb } from '../../db/client';
import migrations from '../../db/migrations/migrations';
import { done, failed, pending, type BootTask } from '../bootState';

type Opened = { db: ReturnType<typeof getDb> } | { error: unknown };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function open(): Opened {
  try {
    return { db: getDb() };
  } catch (error) {
    return { error };
  }
}

/** Opens the on-device database and brings it up to date; either failure is shown on the boot error screen. */
export function useMigrationsTask(): BootTask {
  const [opened] = useState(open);
  const [task, setTask] = useState<BootTask>(pending);

  useEffect(() => {
    if (!('db' in opened)) return;
    let active = true;
    migrate(opened.db, migrations).then(
      () => {
        if (active) setTask(done);
      },
      (error: unknown) => {
        if (active) setTask(failed('Streak could not update its local database', messageOf(error)));
      },
    );
    return () => {
      active = false;
    };
  }, [opened]);

  if ('error' in opened) return failed('Streak could not open its local database', messageOf(opened.error));
  return task;
}
