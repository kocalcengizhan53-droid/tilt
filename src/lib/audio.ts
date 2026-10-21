import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { useSettings } from '@/lib/settings';

/**
 * The arcade's sounds, synthesised by scripts/make-tones.mjs and committed as tiny WAVs.
 * One player per sound, created on first use and rewound on each play, so a rapid run of
 * taps never waits on a file.
 */
const FILES = {
  tap: require('../../assets/audio/tap.wav'),
  drop: require('../../assets/audio/drop.wav'),
  perfect: require('../../assets/audio/perfect.wav'),
  hit: require('../../assets/audio/hit.wav'),
  bounce: require('../../assets/audio/bounce.wav'),
  lose: require('../../assets/audio/lose.wav'),
  win: require('../../assets/audio/win.wav'),
  tick: require('../../assets/audio/tick.wav'),
  merge: require('../../assets/audio/merge.wav'),
  padA: require('../../assets/audio/padA.wav'),
  padB: require('../../assets/audio/padB.wav'),
  padC: require('../../assets/audio/padC.wav'),
  padD: require('../../assets/audio/padD.wav'),
} as const;

export type Sound = keyof typeof FILES;

const players = new Map<Sound, AudioPlayer>();

export function play(sound: Sound) {
  if (!useSettings.getState().sound) return;
  try {
    let player = players.get(sound);
    if (!player) {
      player = createAudioPlayer(FILES[sound]);
      players.set(sound, player);
    }
    player.seekTo(0);
    player.play();
  } catch {
    /* a browser that has not yet heard a gesture, or no audio device: silence is fine */
  }
}
