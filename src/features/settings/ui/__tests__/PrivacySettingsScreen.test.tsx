import { act, fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useSyncPreferencesStore } from '@/features/sync/state/syncPreferencesStore';
import { useSyncStatusStore } from '@/features/sync/state/syncStatusStore';
import { testUser } from '@test/fakes/fakeRepositories';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { PrivacySettingsScreen } from '../privacy/PrivacySettingsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  act(() => {
    useSyncPreferencesStore.setState({ enabled: true });
    useSyncStatusStore.setState({ status: { kind: 'idle', refused: 0 } });
    useAuthStore.getState().setUser(testUser());
  });
});

describe.each(SCHEMES)('Data & privacy in %s', (scheme) => {
  it('has a Sync switch for a signed-in account, on by default, saved when turned off', () => {
    renderWithApp(<PrivacySettingsScreen />, { scheme });
    const toggle = screen.getByLabelText('Sync');
    expect(toggle.props.value).toBe(true);
    expect(screen.getByText('Backed up to your account')).toBeTruthy();

    fireEvent(toggle, 'valueChange', false);

    expect(useSyncPreferencesStore.getState().enabled).toBe(false);
    expect(
      useSyncPreferencesStore.persist.getOptions().partialize?.(useSyncPreferencesStore.getState()),
    ).toEqual({ enabled: false });
    expect(screen.getByText('Off. Check-ins stay on this phone.')).toBeTruthy();
  });

  it('shows what sync is doing as it happens', () => {
    renderWithApp(<PrivacySettingsScreen />, { scheme });
    act(() => useSyncStatusStore.getState().setStatus({ kind: 'backingUp', done: 340, total: 1200 }));
    expect(screen.getByText('Backing up · 340 of 1,200')).toBeTruthy();
  });

  it('offers a guest no switch, and says what signing in would give them', () => {
    act(() => useAuthStore.getState().setUser(testUser({ id: 'guest-1', provider: 'guest', email: null })));
    renderWithApp(<PrivacySettingsScreen />, { scheme });
    expect(screen.queryByLabelText('Sync')).toBeNull();
    expect(
      screen.getByText('Sign in to back up your check-ins and see them on your other phones.'),
    ).toBeTruthy();
  });
});
