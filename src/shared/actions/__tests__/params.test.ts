import {
  parseAuthIntent,
  parseEditableField,
  parseHeatmapOptions,
  parseISODate,
  parseOnboardingStep,
  parseOptionalId,
  parseSettingsSection,
  tabForRouteName,
} from '../params';

describe('route param parsers', () => {
  it('parseOnboardingStep falls back to the first step', () => {
    expect(parseOnboardingStep('2')).toBe(2);
    expect(parseOnboardingStep(['1', '2'])).toBe(1);
    expect(parseOnboardingStep('7')).toBe(0);
    expect(parseOnboardingStep(undefined)).toBe(0);
  });

  it('parseAuthIntent uses the caller fallback for anything unknown', () => {
    expect(parseAuthIntent('existing', 'new')).toBe('existing');
    expect(parseAuthIntent('admin', 'new')).toBe('new');
    expect(parseAuthIntent(undefined, 'existing')).toBe('existing');
  });

  it('parseSettingsSection and parseEditableField only accept known ids', () => {
    expect(parseSettingsSection('privacy')).toBe('privacy');
    expect(parseSettingsSection('billing')).toBeNull();
    expect(parseEditableField('timezone')).toBe('timezone');
    expect(parseEditableField('password')).toBeNull();
  });

  it('parseISODate rejects impossible days', () => {
    expect(parseISODate('2026-09-24')).toBe('2026-09-24');
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('24/09/2026')).toBeNull();
  });

  it('parseHeatmapOptions clamps to sane values', () => {
    expect(parseHeatmapOptions({ view: 'month', year: '2026', month: '9' })).toEqual({
      view: 'month',
      year: 2026,
      month: 9,
    });
    expect(parseHeatmapOptions({ view: 'decade', year: 'abc', month: '13' })).toEqual({
      view: 'year',
      year: undefined,
      month: undefined,
    });
  });

  it('parseOptionalId ignores blanks', () => {
    expect(parseOptionalId(' abc ')).toBe('abc');
    expect(parseOptionalId('  ')).toBeUndefined();
  });

  it('tabForRouteName maps the index route to Home', () => {
    expect(tabForRouteName('index')).toBe('home');
    expect(tabForRouteName('history')).toBe('history');
    expect(tabForRouteName(undefined)).toBe('home');
  });
});
