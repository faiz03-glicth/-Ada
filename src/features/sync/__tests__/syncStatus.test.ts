import { syncDescription, type SyncStatus } from '../domain/syncStatus';

const member = (status: SyncStatus, enabled = true) => syncDescription({ member: true, enabled, status });

describe('syncDescription', () => {
  it('tells a guest what signing in gives them', () => {
    expect(syncDescription({ member: false, enabled: true, status: { kind: 'idle', refused: 0 } })).toBe(
      'Sign in to back up your check-ins and see them on your other phones.',
    );
  });

  it('says plainly when the switch is off', () => {
    expect(member({ kind: 'backingUp', done: 1, total: 2 }, false)).toBe(
      'Off. Check-ins stay on this phone.',
    );
  });

  it('describes each state of a signed-in account', () => {
    expect(member({ kind: 'idle', refused: 0 })).toBe('Backed up to your account');
    expect(member({ kind: 'backingUp', done: 340, total: 1200 })).toBe('Backing up · 340 of 1,200');
    expect(member({ kind: 'updating' })).toBe('Updating from your account…');
    expect(member({ kind: 'waiting' })).toBe('Waiting for a connection');
    expect(member({ kind: 'failed' })).toBe("Couldn't sync just now. Streak will try again.");
    expect(member({ kind: 'idle', refused: 1 })).toBe(
      "Backed up, except 1 check-in your account couldn't take",
    );
  });
});
