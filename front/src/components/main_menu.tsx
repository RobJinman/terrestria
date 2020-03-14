import * as React from "react";
import { App } from "../terrestria/app";
import { CLogInForm } from "./log_in_form";
import { CSignUpForm } from "./sign_up_form";
import { noDefault } from "./utils";

enum MenuPage {
  SIGN_UP,
  LOG_IN,
  LOGGED_IN
}

interface CMainMenuState {
  page: MenuPage,
  loading: boolean
  errorMsg: string;
}

interface CMainMenuProps {
  terrestria: App;
}

export class CMainMenu extends React.Component<CMainMenuProps> {
  state: CMainMenuState = {
    page: MenuPage.SIGN_UP,
    loading: false,
    errorMsg: ""
  };

  private _terrestria: App;

  constructor(props: CMainMenuProps) {
    super(props);

    this._terrestria = props.terrestria;
  }

  render() {
    const startGame = this._startGame.bind(this);
    const signUp = this._signUp.bind(this);
    const logIn = this._logIn.bind(this);
    const logOut = this._logOut.bind(this);

    const goToPage = (page: MenuPage) => () => {
      this.setState({
        page,
        errorMsg: ""
      });
    };

    const userName = this._terrestria.userName;

    const hasError = this.state.errorMsg.length > 0;
    const errorMsg = this.state.errorMsg;

    return (
      <div className="main-menu">
        {this.state.loading &&
        <div className="loading">Loading...</div>}
        {!this.state.loading &&
        <div className="content">
          {this.state.page == MenuPage.SIGN_UP &&
          <div>
            <CSignUpForm onSignUp={signUp} />
            <p>Already have an account?{" "}
              <a href="#" onClick={noDefault(goToPage(MenuPage.LOG_IN))}>
                Sign in</a></p>
            <p>Don't care about free money?{" "}
              <a href="#" onClick={noDefault(startGame)}>Continue to game</a>
            </p>
          </div>}
          {this.state.page == MenuPage.LOG_IN &&
          <div>
            <CLogInForm onLogIn={logIn} onStart={startGame}
              onBack={goToPage(MenuPage.SIGN_UP)} />
          </div>}
          {this.state.page == MenuPage.LOGGED_IN &&
          <div className="log-in">
            <h1>Ready to Play</h1>
            <p>You're signed in as <b>{userName}</b>.</p>
            <p>Not you? <a href="#" onClick={noDefault(logOut)}>Sign out</a></p>
            <button onClick={startGame}>Start Game</button>
          </div>}
          <div className={hasError ? "error-msg" : "error-msg hidden"}>
            {errorMsg}</div>
        </div>}
      </div>
    );
  }

  private _startGame() {
    this._terrestria.connect().then(() => {
      this._terrestria.start();
    }, () => {
      this.setState({
        loading: false,
        errorMsg: "Failed to connect to server"
      });
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

  private _logIn(email: string, password: string) {
    this.setState({
      loading: true,
      errorMsg: ""
    });

    this._terrestria.connect().then(() => {
      this._terrestria.logIn(email, password).then(() => {
        this.setState({
          page: MenuPage.LOGGED_IN,
          loading: false
        });
      }, () => {
        this.setState({
          loading: false,
          errorMsg: "Authentication failed"
        });
        this._terrestria.disconnect();
      });
    }, () => {
      this.setState({
        loading: false,
        errorMsg: "Failed to connect to server"
      });
    });
  }
}
