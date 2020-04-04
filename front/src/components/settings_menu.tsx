import * as React from "react";
import { App } from "../terrestria/app";
import { noDefault } from "./utils";

interface CSettingsMenuState {
  mobileControls: boolean;
  music: boolean;
  sfx: boolean;
}

interface CSettingsMenuProps {
  terrestria: App;
}

export class CSettingsMenu extends React.Component<CSettingsMenuProps> {
  state: CSettingsMenuState;

  private _terrestria: App;

  constructor(props: CSettingsMenuProps) {
    super(props);

    this._terrestria = props.terrestria;

    this.state = {
      mobileControls: true,
      music: true,
      sfx: true
    };
  }

  componentDidMount() {
    this.setState({
      mobileControls: this._terrestria.mobileControlsVisible,
      music: this._terrestria.musicEmabled,
      sfx: this._terrestria.sfxEnabled
    });
  }

  render() {
    const closeSettings = this._closeSettings.bind(this);
    const logOut = this._logOut.bind(this);
    const onToggleMobileControls = this._onToggleMobileControls.bind(this);
    const onToggleMusic = this._onToggleMusic.bind(this);
    const onToggleSfx = this._onToggleSfx.bind(this);

    return (
      <div className="settings-menu menu">
        <h1>Settings</h1>
        <div className="checkbox-field">
          <input type="checkbox" name="mobileControls"
            checked={this.state.mobileControls}
            onChange={onToggleMobileControls}/>
          <label htmlFor="mobileControls">Mobile controls</label>
        </div>
        <div className="checkbox-field">
          <input type="checkbox" name="music"
            checked={this.state.music} onChange={onToggleMusic}/>
          <label htmlFor="music">Music</label>
        </div>
        <div className="checkbox-field">
          <input type="checkbox" name="sfx"
            checked={this.state.sfx} onChange={onToggleSfx}/>
          <label htmlFor="sfx">Sound effects</label>
        </div>
        <div className="links">
          <p className="close">
            <a href="#" onClick={noDefault(closeSettings)}>Return to game</a></p>
          <p className="quit">
            <a href="#" onClick={noDefault(logOut)}>Quit game</a></p>
        </div>
      </div>
    );
  }

  private _closeSettings() {
    this._terrestria.returnFromSettingsMenu();
  }

  private _logOut() {
    this._terrestria.logOut();
  }

  private _onToggleMobileControls(event: React.FormEvent<HTMLInputElement>) {
    const showMobileControls = event.currentTarget.checked;
    this.setState({ mobileControls: showMobileControls });
    this._terrestria.setMobileControlsVisible(showMobileControls);
  }

  private _onToggleMusic(event: React.FormEvent<HTMLInputElement>) {
    const musicEnabled = event.currentTarget.checked;
    this.setState({ music: musicEnabled });
    this._terrestria.setMusicEnabled(musicEnabled);
  }

  private _onToggleSfx(event: React.FormEvent<HTMLInputElement>) {
    const sfxEnabled = event.currentTarget.checked;
    this.setState({ sfx: sfxEnabled });
    this._terrestria.setSfxEnabled(sfxEnabled);
  }
}
