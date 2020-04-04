const MUSIC_AUDIO_ELEMENT_ID = "terrestria-music-audio";
const SFX_AUDIO_ELEMENT_ID = "terrestria-sfx-audio";
const NUM_MUSIC_FILES = 4;

export class AudioManager {
  _musicAudioElement: HTMLAudioElement;
  _musicSourceElement: HTMLSourceElement;
  _sfxAudioElement: HTMLAudioElement;
  _sfxSourceElement: HTMLSourceElement;
  _currentMusicFile: number;

  constructor() {
    this._currentMusicFile = Math.floor(Math.random() * NUM_MUSIC_FILES);

    this._musicAudioElement = document.createElement("audio");
    this._musicAudioElement.id = MUSIC_AUDIO_ELEMENT_ID;
    this._musicSourceElement = document.createElement("source");
    this._musicSourceElement.type = "audio/mpeg";
    this._musicSourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._musicAudioElement.appendChild(this._musicSourceElement);
    this._musicAudioElement.onended = () => this._nextMusicTrack();

    this._sfxAudioElement = document.createElement("audio");
    this._sfxAudioElement.id = SFX_AUDIO_ELEMENT_ID;
    this._sfxSourceElement = document.createElement("source");
    this._sfxSourceElement.type = "audio/mpeg";
    this._sfxAudioElement.appendChild(this._sfxSourceElement);
  }

  playMusic() {
    this._musicAudioElement.volume = 0.2;
    this._musicAudioElement.play();
  }

  stopMusic() {
    this._musicAudioElement.pause();
  }

  playSound(soundName: string) {
    this._sfxSourceElement.src = `assets/${soundName}.mp3`;
    this._sfxAudioElement.load();
    this._sfxAudioElement.volume = 0.9;
    this._sfxAudioElement.play();
  }

  muteSfx() {
    this._sfxAudioElement.muted = true;
  }

  unmuteSfx() {
    this._sfxAudioElement.muted = false;
  }

  get isMusicPlaying() {
    return !this._musicAudioElement.paused;
  }

  get sfxMuted() {
    return this._sfxAudioElement.muted;
  }

  private _nextMusicTrack() {
    this._currentMusicFile = (this._currentMusicFile + 1) % NUM_MUSIC_FILES;
    this._musicSourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._musicAudioElement.load();
    this._musicAudioElement.play();
  }
}
