import { router } from 'expo-router';

import type { ISODate } from '../../lib/date/isoDate';
import {
  goBack,
  goHome,
  goTab,
  openActivityEditor,
  openCheckIn,
  openDay,
  openEditField,
  openHeatmap,
  openLogin,
  openOnboarding,
  openSettings,
} from '../navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

const mockedRouter = jest.mocked(router);
const day = '2026-09-24' as ISODate;

beforeEach(() => jest.clearAllMocks());

describe('navigation actions', () => {
  it('each destination has exactly one route', () => {
    goHome();
    goTab('insights');
    goTab('home');
    openHeatmap({ view: 'month', year: 2026, month: 9 });
    openDay(day);
    openSettings('privacy');
    openEditField('timezone');

    expect(mockedRouter.dismissTo).toHaveBeenCalledWith('/');
    expect(mockedRouter.navigate.mock.calls).toEqual([['/insights'], ['/']]);
    expect(mockedRouter.push.mock.calls).toEqual([
      [{ pathname: '/heatmap', params: { view: 'month', year: '2026', month: '9' } }],
      [{ pathname: '/day/[date]', params: { date: day } }],
      [{ pathname: '/settings/[section]', params: { section: 'privacy' } }],
      [{ pathname: '/edit-field', params: { field: 'timezone' } }],
    ]);
  });

  it('create and edit share one sheet each, and omit unset params', () => {
    openCheckIn();
    openCheckIn({ date: day });
    openCheckIn({ logId: 'log-1' });
    openActivityEditor();
    openActivityEditor('act-1');

    expect(mockedRouter.push.mock.calls).toEqual([
      [{ pathname: '/check-in', params: {} }],
      [{ pathname: '/check-in', params: { date: day } }],
      [{ pathname: '/check-in', params: { logId: 'log-1' } }],
      [{ pathname: '/activity-editor', params: {} }],
      [{ pathname: '/activity-editor', params: { id: 'act-1' } }],
    ]);
  });

  it('auth-flow screens push forward and can replace after sign-in', () => {
    openLogin('new');
    openOnboarding(1, { replace: true });
    expect(mockedRouter.push).toHaveBeenCalledWith({ pathname: '/login', params: { intent: 'new' } });
    expect(mockedRouter.replace).toHaveBeenCalledWith({ pathname: '/onboarding', params: { step: '1' } });
  });

  it('goBack pops when it can, otherwise runs the fallback', () => {
    goBack();
    expect(mockedRouter.back).toHaveBeenCalledTimes(1);

    mockedRouter.canGoBack.mockReturnValueOnce(false);
    const fallback = jest.fn();
    goBack(fallback);
    expect(fallback).toHaveBeenCalled();
    expect(mockedRouter.back).toHaveBeenCalledTimes(1);
  });
});
