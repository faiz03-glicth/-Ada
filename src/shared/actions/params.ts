import { SETTINGS_SECTIONS } from '@/features/settings/config/sections';

import type { TabId } from '../config/tabs';
import { isISODate } from '../lib/date/isoDate';
import {
  EDITABLE_FIELDS,
  type AuthIntent,
  type EditableField,
  type HeatmapOptions,
  type ISODate,
  type OnboardingStep,
  type SettingsSectionId,
} from './types';

/** Route params arrive as string | string[] | undefined; take the first value. */
type RawParam = string | string[] | undefined;
const first = (raw: RawParam): string | undefined => (Array.isArray(raw) ? raw[0] : raw);

/** PURE parsers: each turns untrusted URL params (deep links included) into typed values or a safe fallback. */
export function parseOnboardingStep(raw: RawParam): OnboardingStep {
  const step = first(raw);
  return step === '1' ? 1 : step === '2' ? 2 : 0;
}

/** The onboarding step from a route's params object (e.g. inside navigator screen options). */
export function onboardingStepOf(params: object | undefined): OnboardingStep {
  const step = params && 'step' in params ? params.step : undefined;
  return parseOnboardingStep(typeof step === 'string' ? step : undefined);
}

export function parseAuthIntent(raw: RawParam, fallback: AuthIntent): AuthIntent {
  const intent = first(raw);
  return intent === 'new' || intent === 'existing' ? intent : fallback;
}

export function parseSettingsSection(raw: RawParam): SettingsSectionId | null {
  const value = first(raw);
  return SETTINGS_SECTIONS.find((section) => section.id === value)?.id ?? null;
}

export function parseEditableField(raw: RawParam): EditableField | null {
  const value = first(raw);
  return EDITABLE_FIELDS.find((field) => field === value) ?? null;
}

export function parseISODate(raw: RawParam): ISODate | null {
  const value = first(raw);
  return value !== undefined && isISODate(value) ? value : null;
}

export function parseHeatmapOptions(raw: {
  view?: RawParam;
  year?: RawParam;
  month?: RawParam;
}): HeatmapOptions {
  const view = first(raw.view);
  const year = Number(first(raw.year));
  const month = Number(first(raw.month));
  return {
    view: view === 'month' ? 'month' : 'year',
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
  };
}

export function parseOptionalId(raw: RawParam): string | undefined {
  const value = first(raw)?.trim();
  return value ? value : undefined;
}

/** Tab navigator route names → tab ids ("index" is Home). */
export function tabForRouteName(name: string | undefined): TabId {
  return name === 'insights' || name === 'history' || name === 'profile' ? name : 'home';
}
