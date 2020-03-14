import * as React from "react";
import { App } from "../terrestria/app";
import { CMainMenu } from "./main_menu";
import { GameState } from "../terrestria/definitions";

interface CMainState {
  gameState: GameState;
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
      gameState: GameState.MAIN_MENU
    };
  }

  componentDidMount() {
    this._terrestria.initialise();
  }

  render() {
    const gameState = this.state.gameState;

    return (
      <div>
        <div id="terrestria"></div>
        { gameState != GameState.GAME_ACTIVE &&
        <div id="ui-overlay">
          <CMainMenu terrestria={this._terrestria} gameState={gameState}/>
        </div>
        }
      </div>
    );
  }
}
