import * as React from "react";
import { App } from "../terrestria/app";
import { CLogInForm } from "./log_in_form";
import { CSignUpForm } from "./sign_up_form";
import { noDefault } from "./utils";

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

  private _signUp(email: string,
                  userName: string,
                  password1: string) {
    console.log(email, userName, password1); // TODO
  }

  private _logIn(email: string, password: string) {
    this._terrestria.logIn(email, password);
  }

  render() {
    const startGame = () => this._terrestria.start();
    const signUp = this._signUp.bind(this);
    const logIn = this._logIn.bind(this);

    const goToLogIn = () => {
      this.setState({ page: MenuPage.LOG_IN });
    };

    const goToSignUp = () => {
      this.setState({ page: MenuPage.SIGN_UP });
    };

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
          <h1>Piñata</h1>
          <p>Already logged in</p>
          <button onClick={startGame}>Start</button>
        </div>}
      </div>
    );
  }
}
