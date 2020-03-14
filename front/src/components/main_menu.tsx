import * as React from "react";
import { App } from "../terrestria/app";
import { GameState } from "../terrestria/definitions";
import { CLogInForm } from "./log_in_form";

interface CMainMenuState {
}

interface CMainMenuProps {
  terrestria: App;
  gameState: GameState;
}

export class CMainMenu extends React.Component<CMainMenuProps> {
  state: CMainMenuState;
  private _terrestria: App;

  constructor(props: CMainMenuProps) {
    super(props);

    this.state = {};

    this._terrestria = props.terrestria;
  }

  private _logIn(email: string, password: string) {
    this._terrestria.logIn(email, password);
  }

  render() {
    const startGame = () => this._terrestria.start();
    const logIn = this._logIn.bind(this);

    return (
      <div className="main-menu">
        {this.props.gameState == GameState.MAIN_MENU &&
        <CLogInForm onLogIn={logIn} onStart={startGame} />}
        {this.props.gameState == GameState.LOGGED_IN &&
        <div className="log-in">
          <h1>Piñata</h1>
          <p>Already logged in</p>
          <button onClick={startGame}>Start</button>
        </div>
        }
      </div>
    );
  }
}
