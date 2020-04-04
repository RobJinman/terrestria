const MUSIC_AUDIO_ELEMENT_ID = "terrestria-music-audio";
const SFX_AUDIO_ELEMENT_ID = "terrestria-sfx-audio";
const NUM_MUSIC_FILES = 4;
const NUM_CONCURRENT_SFX = 10;
const MUSIC_VOLUME = 0.2;
const SFX_VOLUME = 0.7;
const MAX_AUDIBLE_DISTANCE = 640;

interface HtmlAudio {
  audio: HTMLAudioElement;
  source: HTMLSourceElement;
  playing: boolean;
}

export class AudioManager {
  _musicAudioElement: HTMLAudioElement;
  _musicSourceElement: HTMLSourceElement;
  _sfxElements: HtmlAudio[] = [];
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

    for (let i = 0; i < NUM_CONCURRENT_SFX; ++i) {
      const audioElement = document.createElement("audio");
      audioElement.id = SFX_AUDIO_ELEMENT_ID;
      const sourceElement = document.createElement("source");
      sourceElement.type = "audio/mpeg";
      audioElement.appendChild(sourceElement);

      const sfx = {
        audio: audioElement,
        source: sourceElement,
        playing: false
      };

      audioElement.onended = () => sfx.playing = false;
      audioElement.onerror = () => sfx.playing = false;

      this._sfxElements.push(sfx);
    }
  }

  playMusic() {
    this._musicAudioElement.volume = MUSIC_VOLUME;
    this._musicAudioElement.play();
  }

  stopMusic() {
    this._musicAudioElement.pause();
  }

  playSound(soundName: string, distance: number) {
    const attentuation = 1 - Math.min(1, distance / MAX_AUDIBLE_DISTANCE);
    const volume = SFX_VOLUME * attentuation;

    if (volume > 0) {
      for (const sfx of this._sfxElements) {
        if (!sfx.playing) {
          sfx.source.src = `assets/${soundName}.mp3`;
          sfx.audio.load();
          sfx.audio.volume = volume;
          sfx.audio.play();
          sfx.playing = true;
          break;
        }
      }
    }
  }

  muteSfx() {
    for (const sfx of this._sfxElements) {
      sfx.audio.muted = true;
    }
  }

  unmuteSfx() {
    for (const sfx of this._sfxElements) {
      sfx.audio.muted = false;
    }
  }

  get isMusicPlaying() {
    return !this._musicAudioElement.paused;
  }

  get sfxMuted() {
    return this._sfxElements[0].audio.muted;
  }

  private _nextMusicTrack() {
    this._currentMusicFile = (this._currentMusicFile + 1) % NUM_MUSIC_FILES;
    this._musicSourceElement.src = `assets/music${this._currentMusicFile}.mp3`;
    this._musicAudioElement.load();
    this._musicAudioElement.play();
  }
}
