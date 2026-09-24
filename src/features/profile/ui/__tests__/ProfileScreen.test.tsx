import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { createFakeRepositories, testProfile, testUser } from '@test/fakes/fakeRepositories';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { ProfileScreen } from '../ProfileScreen';

const initial = useAuthStore.getState();

/** Answers the native confirmation with the button labelled `choice`. */
function answerAlert(choice: string) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === choice)?.onPress?.();
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  useAuthStore.setState(initial, true);
});

describe.each(SCHEMES)('ProfileScreen in %s', (scheme) => {
  it('shows the local profile of a signed-in person', async () => {
    useAuthStore.getState().setUser(testUser({ displayName: null }));
    const repositories = createFakeRepositories();
    repositories.profile.getLocal.mockResolvedValue(testProfile({ displayName: 'Faiz Ahmad' }));
    renderWithApp(<ProfileScreen />, { scheme, repositories });
    expect(await screen.findByRole('header', { name: 'Faiz Ahmad' })).toBeTruthy();
    expect(screen.getByText('person@example.com')).toBeTruthy();
  });

  it('shows Guest for guests and never calls Supabase for them', async () => {
    useAuthStore.getState().setUser(testUser({ id: 'g', provider: 'guest', displayName: null, email: null }));
    const repositories = createFakeRepositories();
    repositories.profile.getLocal.mockResolvedValue(null);
    renderWithApp(<ProfileScreen />, { scheme, repositories });
    expect(await screen.findByRole('header', { name: 'Guest' })).toBeTruthy();
    expect(screen.getByText('Your check-ins are stored on this device')).toBeTruthy();
    expect(repositories.profile.refreshFromRemote).not.toHaveBeenCalled();
  });
});

describe('Log out', () => {
  it('confirms, signs out and returns to signed-out (the guard then shows Login)', async () => {
    useAuthStore.getState().setUser(testUser());
    const alert = answerAlert('Log out');
    const { repositories } = renderWithApp(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    expect(alert).toHaveBeenCalledWith('Log out?', expect.any(String), expect.any(Array), expect.anything());
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
    expect(repositories.auth.signOut).toHaveBeenCalled();
  });

  it('does nothing when cancelled', async () => {
    useAuthStore.getState().setUser(testUser());
    answerAlert('Cancel');
    const { repositories } = renderWithApp(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(repositories.auth.signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
