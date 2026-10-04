import { cleanNote, MAX_NOTE_LENGTH } from '../domain/CheckIn';

describe('cleanNote: notes the server will always accept', () => {
  it('keeps ordinary text, accents and emoji, trimmed', () => {
    expect(cleanNote('  Leg day 🏋️ — Ünïcödé  ')).toBe('Leg day 🏋️ — Ünïcödé');
    expect(cleanNote('')).toBe('');
  });

  it('turns line breaks, tabs and other control characters into one space', () => {
    expect(cleanNote('two\nlines')).toBe('two lines');
    expect(cleanNote('a\r\n\tb')).toBe('a b');
    expect(cleanNote('nul\u0000here')).toBe('nul here');
    expect(cleanNote('c1\u0085control')).toBe('c1 control');
    expect(cleanNote('line sep para')).toBe('line sep para');
    expect(cleanNote('\n\nonly\n\n')).toBe('only');
  });

  it('drops half of a split emoji, which the server could not store', () => {
    expect(cleanNote('ok \ud83c')).toBe('ok');
    expect(cleanNote('\udfc3 run')).toBe('run');
    expect(cleanNote('🏃 run')).toBe('🏃 run');
  });

  it('never lengthens a note, and caps it at the limit without splitting an emoji', () => {
    expect(cleanNote('a'.repeat(MAX_NOTE_LENGTH + 20))).toHaveLength(MAX_NOTE_LENGTH);
    const cut = cleanNote(`${'a'.repeat(MAX_NOTE_LENGTH - 1)}🏃`);
    expect(cut).toBe('a'.repeat(MAX_NOTE_LENGTH - 1));
  });
});
