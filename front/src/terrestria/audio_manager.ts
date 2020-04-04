import { GameError } from "./common/error";

const AUDIO_ELEMENT_ID = "terrestria-audio";
const NUM_MUSIC_FILES = 4;

export class AudioManager {
  _audioElement: HTMLAudioElement;
  _sourceElement: HTMLSourceElement;
  _currentMusicFile: number;

  constructor() {
    if (document.getElementById(AUDIO_ELEMENT_ID)) {
      throw new GameError("Audio element already exists");
    }

    this._currentMusicFile = Math.floor(Math.random() * NUM_MUSIC_FILES);

    this._audioElement = document.createElement("audio");
    this._audioElement.id = "terrestria-audio";
    this._sourceElement = document.createElement("source");
    this._sourceElement.type = "audio/mpeg";
    this._sourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._audioElement.appendChild(this._sourceElement);
    this._audioElement.onended = () => this._nextMusicTrack();
  }

  playMusic() {
    this._audioElement.play();
    this._audioElement.volume = 0.2;
  }

  stopMusic() {
    this._audioElement.pause();
  }

  get isMusicPlaying() {
    return !this._audioElement.paused;
  }

  private _nextMusicTrack() {
    this._currentMusicFile = (this._currentMusicFile + 1) % NUM_MUSIC_FILES;
    this._sourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._audioElement.load();
    this._audioElement.play();
  }
}
