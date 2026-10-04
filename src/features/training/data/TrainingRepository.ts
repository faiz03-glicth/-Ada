import { isISODate, type ISODate } from '@/shared/lib/date/isoDate';

import type { WorkoutDayDao } from './local/workoutDayDao';

/**
 * The days the account worked out in Teras, as this phone last pulled them: dates only. Read-only here;
 * Teras writes them and sync brings them in.
 */
export interface TrainingRepository {
  /** Oldest first. */
  listWorkoutDays(userId: string): Promise<ISODate[]>;
}

export class LocalTrainingRepository implements TrainingRepository {
  constructor(private readonly dao: Pick<WorkoutDayDao, 'list'>) {}

  async listWorkoutDays(userId: string): Promise<ISODate[]> {
    return (await this.dao.list(userId)).filter(isISODate);
  }
}
