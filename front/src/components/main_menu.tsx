import * as React from "react";
import { App } from "../terrestria/app";
import { CLogInForm } from "./log_in_form";
import { CSignUpForm } from "./sign_up_form";
import { noDefault } from "./utils";
import { GameState } from "../terrestria/definitions";

interface CMainMenuState {
  page: MenuPage
}

enum MenuPage {
  SIGN_UP,
  LOG_IN,
  LOGGED_IN
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

    this.state = {
      page: MenuPage.SIGN_UP
    };

    this._terrestria = props.terrestria;
  }

  componentDidUpdate() {
    // Detect successful log in
    if (this.state.page != MenuPage.LOGGED_IN) {
      if (this.props.gameState === GameState.GAME_INACTIVE &&
          this._terrestria.userName) {
        this.setState({ page: MenuPage.LOGGED_IN });
      }
    }
  }

  render() {
    const startGame = this._startGame.bind(this);
    const signUp = this._signUp.bind(this);
    const logIn = this._logIn.bind(this);
    const logOut = this._logOut.bind(this);

    const goToLogIn = () => {
      this.setState({ page: MenuPage.LOG_IN });
    };

    const goToSignUp = () => {
      this.setState({ page: MenuPage.SIGN_UP });
    };

    const userName = this._terrestria.userName;

    return (
      <div className="main-menu">
        {this.state.page == MenuPage.SIGN_UP &&
        <div>
          <CSignUpForm onSignUp={signUp} />
          <p>Already have an account?{" "}
            <a href="#" onClick={noDefault(goToLogIn)}>Log in</a></p>
          <p>Don't care about free money?{" "}
            <a href="#" onClick={noDefault(startGame)}>Continue to game</a>
          </p>
        </div>}
        {this.state.page == MenuPage.LOG_IN &&
        <div>
          <CLogInForm onLogIn={logIn} onStart={startGame} onBack={goToSignUp} />
        </div>}
        {this.state.page == MenuPage.LOGGED_IN &&
        <div className="log-in">
          <h1>Ready to Play</h1>
          <p>You're logged in as <b>{userName}</b>.</p>
          <p>Not you? <a href="#" onClick={noDefault(logOut)}>Log out</a></p>
          <button onClick={startGame}>Start Game</button>
        </div>}
      </div>
    );
  }

  private _startGame() {
    this._terrestria.connect().then(() => {
      console.log("Hello");
      this._terrestria.start();
    }, () => {
      // TODO
      console.error("Failed to connect");
    });
  }

  private _logOut() {
    this._terrestria.logOut();
    this.setState({ page: MenuPage.SIGN_UP });
  }

  private _signUp(email: string,
                  userName: string,
                  password1: string) {
    console.log(email, userName, password1); // TODO
  }

  private async _logIn(email: string, password: string) {
    this._terrestria.connect().then(() => {
      this._terrestria.logIn(email, password);
    }, () => {
      // TODO
      console.error("Failed to connect");
    });
  }
}
