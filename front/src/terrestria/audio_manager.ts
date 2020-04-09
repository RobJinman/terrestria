import sound from 'pixi-sound';
import { GameError } from './common/error';

const NUM_MUSIC_FILES = 4;
const MUSIC_VOLUME = 0.15;
const SFX_VOLUME = 0.7;
const MAX_AUDIBLE_DISTANCE = 640;

export class AudioManager {
  _sounds = new Map<string, sound.Sound>();
  _music: sound.Sound[] = [];
  _sfxMuted = false;
  _musicMuted = false;

  constructor() {
    for (let i = 0; i < NUM_MUSIC_FILES; ++i) {
      const music = sound.Sound.from({
        url: `assets/music${i}.mp3`,
        volume: MUSIC_VOLUME,
        complete: () => this._onMusicFinished(i)
      });
      this._music.push(music);
    }
  }

  addSound(soundName: string) {
    const s = sound.Sound.from(`assets/${soundName}.mp3`);
    this._sounds.set(soundName, s);
  }

  playSound(soundName: string, distance: number) {
    const sound = this._sounds.get(soundName);
    if (!sound) {
      throw new GameError(`No sound with name ${soundName}`);
    }

    const attentuation = 1 - Math.min(1, distance / MAX_AUDIBLE_DISTANCE);
    const volume = SFX_VOLUME * attentuation;

    if (volume > 0) {
      sound.volume = volume;
      sound.play();
    }
  }

  muteSfx() {
    for (const [ soundName, sound ] of this._sounds) {
      sound.muted = true;
    }
    this._sfxMuted = true;
  }

  unmuteSfx() {
    for (const [ soundName, sound ] of this._sounds) {
      sound.muted = true;
    }
    this._sfxMuted = false;
  }

  get musicMuted() {
    return this._musicMuted;
  }

  get sfxMuted() {
    return this._sfxMuted;
  }

  playMusic() {
    this.stopMusic();
    const i = Math.floor(Math.random() * NUM_MUSIC_FILES);
    this._music[i].play();
  }

  stopMusic() {
    for (const sound of this._music) {
      sound.stop();
    }
  }

  muteMusic() {
    for (const sound of this._music) {
      sound.muted = true;
    }
    this._musicMuted = true;
  }

  unmuteMusic() {
    for (const sound of this._music) {
      sound.muted = false;
    }
    this._musicMuted = false;
  }

  private _onMusicFinished(i: number) {
    const next = (i + 1) % NUM_MUSIC_FILES;
    this._music[next].play();
  }
}
