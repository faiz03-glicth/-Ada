import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AuthError } from '@/features/auth/domain/AuthError';
import { useAuthStore } from '@/features/auth/state/authStore';
import { createFakeRepositories, testUser } from '@test/fakes/fakeRepositories';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { AccountSettingsScreen } from '../account/AccountSettingsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initial = useAuthStore.getState();
const guest = () => testUser({ id: 'guest-1', provider: 'guest', displayName: null, email: null });

beforeEach(() => {
  useAuthStore.setState(initial, true);
});

describe.each(SCHEMES)('Account settings in %s', (scheme) => {
  it('lets a guest connect Google, keeping what they logged, and then shows the account', async () => {
    useAuthStore.getState().setUser(guest());
    const repositories = createFakeRepositories();
    renderWithApp(<AccountSettingsScreen />, { scheme, repositories });
    expect(screen.getByText(/Nothing you've logged is lost/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Connect Google account'));

    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedIn'));
    expect(repositories.auth.connectGoogle).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Signed in with Google')).toBeTruthy();
  });

  it('stays a guest, quietly, when Google is cancelled', async () => {
    useAuthStore.getState().setUser(guest());
    const repositories = createFakeRepositories();
    repositories.auth.connectGoogle.mockRejectedValueOnce(new AuthError('Cancelled'));
    renderWithApp(<AccountSettingsScreen />, { scheme, repositories });

    fireEvent.press(screen.getByLabelText('Connect Google account'));

    await waitFor(() => expect(repositories.auth.connectGoogle).toHaveBeenCalled());
    expect(useAuthStore.getState().user?.provider).toBe('guest');
  });

  it('offers a signed-in account no Connect button', () => {
    useAuthStore.getState().setUser(testUser());
    renderWithApp(<AccountSettingsScreen />, { scheme });
    expect(screen.queryByLabelText('Connect Google account')).toBeNull();
  });
});
