import sound from 'pixi-sound';
import { GameError } from './common/error';

const NUM_MUSIC_FILES = 4;
const MUSIC_VOLUME = 0.15;
const SFX_VOLUME = 0.7;
const MAX_AUDIBLE_DISTANCE = 640;

export class AudioManager {
  _musicAudioElement: HTMLAudioElement;
  _musicSourceElement: HTMLSourceElement;
  _currentMusicFile: number;
  _sounds = new Map<string, sound.Sound>();
  _sfxMuted = false;

  constructor() {
    this._currentMusicFile = Math.floor(Math.random() * NUM_MUSIC_FILES);

    this._musicAudioElement = document.createElement("audio");
    this._musicSourceElement = document.createElement("source");
    this._musicSourceElement.type = "audio/mpeg";
    this._musicSourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._musicAudioElement.appendChild(this._musicSourceElement);
    this._musicAudioElement.onended = () => this._nextMusicTrack();
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
    sound.muteAll();
    this._sfxMuted = true;
  }

  unmuteSfx() {
    sound.unmuteAll();
    this._sfxMuted = false;
  }

  get musicMuted() {
    return this._musicAudioElement.muted;
  }

  get sfxMuted() {
    return this._sfxMuted;
  }

  playMusic() {
    this._musicAudioElement.volume = MUSIC_VOLUME;
    this._musicAudioElement.play();
  }

  stopMusic() {
    this._musicAudioElement.pause();
  }

  muteMusic() {
    this._musicAudioElement.muted = true;
  }

  unmuteMusic() {
    return this._musicAudioElement.muted = false; 
  }

  private _nextMusicTrack() {
    this._currentMusicFile = (this._currentMusicFile + 1) % NUM_MUSIC_FILES;
    this._musicSourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._musicAudioElement.load();
    this._musicAudioElement.play();
  }
}
