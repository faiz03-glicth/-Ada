/*
 * Each test loads `sounds` fresh, with the native audio module present or not: a development build made
 * before expo-audio was added has no module, and the app must stay silent there instead of crashing.
 */
type Sounds = typeof import('../sounds').sounds;

function loadSounds({ nativeModule, enabled = true }: { nativeModule: boolean; enabled?: boolean }) {
  const player = { volume: 1, seekTo: jest.fn(async () => undefined), play: jest.fn() };
  const audio = {
    createAudioPlayer: jest.fn(() => player),
    setAudioModeAsync: jest.fn(async () => undefined),
  };
  let sounds!: Sounds;
  jest.isolateModules(() => {
    jest.doMock('expo', () => ({ requireOptionalNativeModule: () => (nativeModule ? {} : null) }));
    jest.doMock('expo-audio', () => audio);
    require('@/shared/state/soundPreferencesStore').useSoundPreferencesStore.setState({
      soundEffects: enabled,
    });
    sounds = require('../sounds').sounds;
  });
  return { sounds, audio, player };
}

afterEach(() => {
  jest.dontMock('expo');
  jest.dontMock('expo-audio');
});

describe('sounds', () => {
  it('stay silent (and never load expo-audio) on a build without the audio module', () => {
    const { sounds, audio } = loadSounds({ nativeModule: false });
    expect(() => sounds.play('logoFlip')).not.toThrow();
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('play from the start, quietly, without pausing other audio or ignoring the silent switch', () => {
    const { sounds, audio, player } = loadSounds({ nativeModule: true });
    sounds.preload('logoFlip');
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }),
    );
    expect(player.volume).toBeLessThan(1);

    sounds.play('logoFlip');
    sounds.play('logoFlip');
    // One player, reused and restarted each time.
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('stay silent when the person has turned sound effects off in settings', () => {
    const { sounds, player } = loadSounds({ nativeModule: true, enabled: false });
    sounds.play('logoFlip');
    expect(player.play).not.toHaveBeenCalled();
  });

  it('are feedback only: a failing player is ignored', () => {
    const { sounds, player } = loadSounds({ nativeModule: true });
    player.play.mockImplementation(() => {
      throw new Error('no output');
    });
    expect(() => sounds.play('logoFlip')).not.toThrow();
  });
});
