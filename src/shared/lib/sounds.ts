import { requireOptionalNativeModule } from 'expo';
import type { AudioPlayer } from 'expo-audio';

import { useSoundPreferencesStore } from '../state/soundPreferencesStore';

type ExpoAudio = typeof import('expo-audio');

/** Every sound effect, by meaning. Files live in assets/sounds. */
const SOURCES = {
  /** The login mark flipping over: a soft whoosh, then one rising note per diagonal as its heatmap waves in. */
  logoFlip: require('../../../assets/sounds/logo-flip.wav') as number,
} as const;
export type SoundName = keyof typeof SOURCES;

/** Effects sit under whatever else is playing, never over it. */
const VOLUME = 0.6;

let audio: ExpoAudio | null | undefined;
const players = new Map<SoundName, AudioPlayer>();

/**
 * expo-audio, once. A development build made before expo-audio was added has no native audio module, and
 * importing the library would crash there; so it is only loaded when the module exists (otherwise sounds
 * are simply silent until the next build).
 */
function loadAudio(): ExpoAudio | null {
  if (audio !== undefined) return audio;
  audio = requireOptionalNativeModule('ExpoAudio')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see above
      (require('expo-audio') as ExpoAudio)
    : null;
  // Interface sounds: silent when the phone is on silent, and never pause the person's music.
  audio
    ?.setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    })
    .catch(() => undefined);
  return audio;
}

function playerFor(name: SoundName): AudioPlayer | null {
  const existing = players.get(name);
  if (existing) return existing;
  const lib = loadAudio();
  if (!lib) return null;
  const player = lib.createAudioPlayer(SOURCES[name]);
  player.volume = VOLUME;
  // Kept for the app's lifetime: each effect is tiny and replayed often.
  players.set(name, player);
  return player;
}

/** Sound effects are feedback, never required: any failure (no audio module, no output) is ignored. */
export const sounds = {
  /** Loads an effect ahead of time, so its first play starts on cue. */
  preload(name: SoundName): void {
    try {
      playerFor(name);
    } catch {
      // Feedback only.
    }
  },
  /** Plays an effect from the start (restarting it if it's already playing), unless sounds are off. */
  play(name: SoundName): void {
    if (!useSoundPreferencesStore.getState().soundEffects) return;
    try {
      const player = playerFor(name);
      if (!player) return;
      void player.seekTo(0);
      player.play();
    } catch {
      // Feedback only.
    }
  },
};
