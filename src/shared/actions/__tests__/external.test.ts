import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';

import { openHelpCenter, openLegal, rateApp, sendFeedback } from '../external';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));
jest.mock('../../lib/links', () => ({
  links: {
    legal: (doc: string) => `https://streak.example.com/${doc}`,
    helpCenter: () => 'https://streak.example.com/help',
  },
}));

const openBrowser = jest.mocked(WebBrowser.openBrowserAsync);

beforeEach(() => jest.clearAllMocks());

describe('external actions', () => {
  it('opens legal documents and the help center in the in-app browser', async () => {
    await openLegal('terms');
    await openLegal('privacy');
    await openHelpCenter();
    expect(openBrowser.mock.calls).toEqual([
      ['https://streak.example.com/terms'],
      ['https://streak.example.com/privacy'],
      ['https://streak.example.com/help'],
    ]);
  });

  it('tells the person when the page cannot open', async () => {
    openBrowser.mockRejectedValueOnce(new Error('no browser'));
    await openLegal('acknowledgements');
    expect(toast.info).toHaveBeenCalledWith("Couldn't open the page", expect.anything());
  });

  it('later-phase actions are connected and say which phase they arrive in', async () => {
    await sendFeedback();
    await rateApp();
    expect(toast.info).toHaveBeenCalledTimes(2);
    expect(toast.info).toHaveBeenCalledWith('Coming in Phase 4', expect.anything());
  });
});
