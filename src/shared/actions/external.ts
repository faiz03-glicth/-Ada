import * as WebBrowser from 'expo-web-browser';

import { links } from '../lib/links';
import { showInfo } from '../ui/toast';
import type { LegalDoc } from './types';

async function openInAppBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    showInfo({ title: "Couldn't open the page", sub: 'Check your connection and try again.' });
  }
}

/** Terms, Privacy Policy and Acknowledgements; shared by the Login footer, Data & privacy and About. */
export function openLegal(doc: LegalDoc): Promise<void> {
  return openInAppBrowser(links.legal(doc));
}

/** Shared by Profile → Help & feedback and About → Help center. */
export function openHelpCenter(): Promise<void> {
  return openInAppBrowser(links.helpCenter());
}

/** Phase 4 (About): opens the mail composer. */
export async function sendFeedback(): Promise<void> {
  showInfo({ title: 'Coming in Phase 4', sub: 'Sending feedback arrives with the About section.' });
}

/** Phase 4 (About): opens the store review prompt. */
export async function rateApp(): Promise<void> {
  showInfo({ title: 'Coming in Phase 4', sub: 'Rating Streak arrives with the About section.' });
}
