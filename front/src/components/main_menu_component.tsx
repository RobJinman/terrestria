import * as React from "react";
import { App } from "../terrestria/app";
import { GameState } from "../terrestria/definitions";

interface MainMenuComponentState {
}

interface MainMenuComponentProps {
  terrestria: App;
  gameState: GameState;
}

export class MainMenuComponent extends React.Component<MainMenuComponentProps> {
  state: MainMenuComponentState;
  private _terrestria: App;

  constructor(props: MainMenuComponentProps) {
    super(props);

    this.state = {};

    this._terrestria = props.terrestria;
  }

  render() {
    return (
      <div className="main-menu">
        <h1>Log In</h1>
        <p>{this.props.gameState}</p>
        <button onClick={() => this._terrestria.logIn()}>Log in</button>
        <button onClick={() => this._terrestria.start()}>Start</button>
      </div>
    );
  }
}
