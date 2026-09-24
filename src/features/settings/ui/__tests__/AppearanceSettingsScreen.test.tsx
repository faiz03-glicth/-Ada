import { act, fireEvent, screen } from '@testing-library/react-native';

import { useSystemMotionStore } from '@/theme/state/systemMotionStore';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';
import { renderInScheme, SCHEMES } from '@test/render';

import { AppearanceSettingsScreen } from '../appearance/AppearanceSettingsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  act(() => {
    useThemePreferencesStore.setState({ preference: 'system', reduceMotion: 'system' });
    useSystemMotionStore.setState({ reduceMotion: true });
  });
});

describe.each(SCHEMES)('AppearanceSettingsScreen in %s', (scheme) => {
  it('defaults both settings to System and explains what that means', () => {
    renderInScheme(<AppearanceSettingsScreen />, scheme);
    expect(screen.getByTestId('appearance-theme-system').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByText('Matches your phone (reduced right now).')).toBeTruthy();
  });

  it('saves a Dark theme and a Reduce Motion override', () => {
    renderInScheme(<AppearanceSettingsScreen />, scheme);
    fireEvent.press(screen.getByTestId('appearance-theme-dark'));
    fireEvent.press(screen.getByTestId('appearance-motion-off'));
    expect(useThemePreferencesStore.getState()).toMatchObject({ preference: 'dark', reduceMotion: 'off' });
    expect(screen.getByText('Always dark.')).toBeTruthy();
    expect(screen.getByText('Full motion, even if your phone reduces it.')).toBeTruthy();
  });
});
