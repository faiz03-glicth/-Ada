import { router } from 'expo-router';

import { routes } from './routes';
import type {
  AuthIntent,
  CheckInOptions,
  EditableField,
  HeatmapOptions,
  ISODate,
  OnboardingStep,
  SettingsSectionId,
  Tab,
} from './types';

/** Auth-flow screens either push (forward) or replace (after sign-in, so Back never returns to Login). */
interface FlowOptions {
  replace?: boolean;
}

export function goHome(): void {
  router.dismissTo(routes.home());
}

export function goTab(tab: Tab): void {
  router.navigate(routes.tab(tab));
}

export function openHeatmap(options?: HeatmapOptions): void {
  router.push(routes.heatmap(options));
}

export function openDay(date: ISODate): void {
  router.push(routes.day(date));
}

/** Create (optionally for a given day) or edit (with logId): one sheet for both. */
export function openCheckIn(options?: CheckInOptions): void {
  router.push(routes.checkIn(options));
}

/** Create (no id) or edit: one sheet for both. */
export function openActivityEditor(id?: string): void {
  router.push(routes.activityEditor(id));
}

export function openSettings(section: SettingsSectionId): void {
  router.push(routes.settings(section));
}

export function openEditField(field: EditableField): void {
  router.push(routes.editField(field));
}

export function openOnboarding(step: OnboardingStep, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.onboarding(step));
  else router.push(routes.onboarding(step));
}

export function openLogin(intent: AuthIntent, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.login(intent));
  else router.push(routes.login(intent));
}

/** Pops the current screen; when there is nothing to pop, runs `fallback` (default: Home). */
export function goBack(fallback: () => void = goHome): void {
  if (router.canGoBack()) router.back();
  else fallback();
}
