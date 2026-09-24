import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack, openLogin, openOnboarding } from '@/shared/actions';
import { createWrapper, renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { OnboardingScreen } from '../OnboardingScreen';
import { useOnboardingViewModel } from '../useOnboardingViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

const initial = useAuthStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ ...initial, status: 'signedOut' }, true);
});

describe('useOnboardingViewModel', () => {
  it('navigates between steps through the actions layer', () => {
    const { Wrapper } = createWrapper();
    const welcome = renderHook(() => useOnboardingViewModel(0), { wrapper: Wrapper }).result.current;
    welcome.onPrimary();
    welcome.onHaveAccount();
    expect(jest.mocked(openLogin).mock.calls).toEqual([['new'], ['existing']]);

    const intensity = renderHook(() => useOnboardingViewModel(1), { wrapper: Wrapper }).result.current;
    intensity.onPrimary();
    expect(openOnboarding).toHaveBeenCalledWith(2);
    intensity.onBack();
    expect(goBack).toHaveBeenCalledWith(expect.any(Function));

    // With nothing to pop, Back replaces with the previous step.
    const fallback = jest.mocked(goBack).mock.calls[0]?.[0] as () => void;
    fallback();
    expect(openOnboarding).toHaveBeenLastCalledWith(0, { replace: true });
  });

  it('toggles activities and the reminder in the persisted draft', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useOnboardingViewModel(2), { wrapper: Wrapper });
    act(() => result.current.onToggleActivity('walk'));
    act(() => result.current.onToggleActivity('workout'));
    act(() => result.current.onToggleReminder(false));
    expect(result.current.selectedActivityIds).toEqual(['deep-work', 'reading', 'walk']);
    expect(result.current.reminderEnabled).toBe(false);
  });

  it('needs at least one activity to start tracking', () => {
    useAuthStore.setState({ onboardingDraft: { selectedActivityIds: [], reminderEnabled: true } });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useOnboardingViewModel(2), { wrapper: Wrapper });
    expect(result.current.primaryDisabled).toBe(true);
  });

  it('Skip on Welcome finishes as a guest and confirms with a toast', async () => {
    const { Wrapper, repositories } = createWrapper();
    const { result } = renderHook(() => useOnboardingViewModel(0), { wrapper: Wrapper });
    act(() => result.current.onSkip());
    await waitFor(() => expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true));
    expect(repositories.auth.continueAsGuest).toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(toast.success).toHaveBeenCalledWith("You're all set", expect.anything());
  });
});

describe.each(SCHEMES)('OnboardingScreen in %s', (scheme) => {
  it('Welcome: Skip, Get started and I already have an account', async () => {
    renderWithApp(<OnboardingScreen step={0} />, { scheme });
    expect(screen.getByRole('header', { name: 'See your consistency at a glance' })).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.press(screen.getByRole('button', { name: 'I already have an account' }));
    expect(jest.mocked(openLogin).mock.calls).toEqual([['new'], ['existing']]);

    fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true));
  });

  it('Intensity: shows the five levels, Back and Continue', () => {
    renderWithApp(<OnboardingScreen step={1} />, { scheme });
    expect(screen.getByLabelText('Peak: 6+ check-ins')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(openOnboarding).toHaveBeenCalledWith(2);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(goBack).toHaveBeenCalled();
  });

  it('Setup: activity tiles, reminder toggle, Start tracking and no Skip', async () => {
    useAuthStore
      .getState()
      .setUser({ id: 'u', email: null, displayName: null, avatarUrl: null, provider: 'email' });
    renderWithApp(<OnboardingScreen step={2} />, { scheme });
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Workout' }).props.accessibilityState).toEqual({
      checked: true,
    });

    fireEvent.press(screen.getByRole('checkbox', { name: 'Walk' }));
    expect(useAuthStore.getState().onboardingDraft.selectedActivityIds).toContain('walk');
    fireEvent(screen.getByLabelText('Daily reminder at 8:00 PM'), 'valueChange', false);
    expect(useAuthStore.getState().onboardingDraft.reminderEnabled).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'Start tracking' }));
    await waitFor(() => expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true));
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
