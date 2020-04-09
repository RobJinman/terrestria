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
  _currentMusic = -1;

  constructor() {
    for (let i = 0; i < NUM_MUSIC_FILES; ++i) {
      const music = sound.Sound.from(`assets/music${i}.mp3`);
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
      sound.muted = false;
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
    if (this._currentMusic == -1) {
      this._currentMusic = Math.floor(Math.random() * NUM_MUSIC_FILES);
      this._playMusic();
    }
  }

  stopMusic() {
    if (this._currentMusic !== -1) {
      this._music[this._currentMusic].stop();
      this._currentMusic = -1;
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

  private _onMusicFinished() {
    this._currentMusic = (this._currentMusic + 1) % NUM_MUSIC_FILES;
    this._playMusic();
  }

  private _playMusic() {
    this._music[this._currentMusic].volume = MUSIC_VOLUME;
    this._music[this._currentMusic].play(() => this._onMusicFinished());
  }
}
