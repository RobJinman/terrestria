import * as React from "react";
import { App } from "../terrestria/app";
import { MainMenuComponent } from "./main_menu_component";
import { GameState } from "../terrestria/definitions";

interface MainComponentState {
  gameState: GameState;
}

export class MainComponent extends React.Component<{}> {
  state: MainComponentState;
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
          <MainMenuComponent terrestria={this._terrestria}
                             gameState={gameState}/>
        </div>
        }
      </div>
    );
  }
}
