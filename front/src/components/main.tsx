import * as React from "react";
import { App, PinataCredentials } from "../terrestria/app";
import { CMainMenu } from "./main_menu";
import { GameState } from "../terrestria/definitions";

interface CMainState {
  gameState: GameState;
  username?: string;
  pinataId?: string;
  pinataToken?: string;
}

export class CMain extends React.Component<{}> {
  state: CMainState;
  private _terrestria: App;

  constructor(props: {}) {
    super(props);

    const updateStateFn = (state: GameState) => {
      return this.setState({ gameState: state });
    };

    this._terrestria = new App(updateStateFn);

    this.state = {
      gameState: GameState.GAME_INACTIVE
    };
  }

  componentDidMount() {
    this._terrestria.initialise();
  }

  render() {
    const gameState = this.state.gameState;
    const onUpdatePinataCreds = this._onUpdatePinataCreds.bind(this);

    return (
      <div>
        <div id="terrestria"></div>
        { gameState != GameState.GAME_ACTIVE &&
        <div id="ui-overlay">
          <CMainMenu terrestria={this._terrestria}
            onUpdatePinataCreds={onUpdatePinataCreds}
            username={this.state.username}
            pinataId={this.state.pinataId}
            pinataToken={this.state.pinataToken}/>
        </div>
        }
      </div>
    );
  }

  private _onUpdatePinataCreds(creds?: PinataCredentials) {
    if (creds) {
      this.setState(creds);
    }
    else {
      this.setState({
        username: undefined,
        pinataId: undefined,
        pinataToken: undefined
      });
    }
  }
}
