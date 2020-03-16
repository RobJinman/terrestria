import * as React from "react";
import { App, PinataCredentials } from "../terrestria/app";
import { CLogInForm } from "./log_in_form";
import { CSignUpForm } from "./sign_up_form";
import { noDefault } from "./utils";
import { RLogInSuccess } from "../terrestria/common/response";

enum MenuPage {
  SIGN_UP,
  SIGN_UP_SUCCESS,
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
  onUpdatePinataCreds: (creds?: PinataCredentials) => void;
  pinataId?: string;
  pinataToken?: string;
  userName?: string;
}

export class CMainMenu extends React.Component<CMainMenuProps> {
  state: CMainMenuState;

  private _terrestria: App;

  constructor(props: CMainMenuProps) {
    super(props);

    this._terrestria = props.terrestria;

    const loggedIn = this.props.pinataId && this.props.pinataToken;

    this.state = {
      page: loggedIn ? MenuPage.LOGGED_IN : MenuPage.SIGN_UP,
      loading: false,
      errorMsg: ""
    };
  }

  componentDidUpdate() {
    if (this.state.page !== MenuPage.LOGGED_IN &&
        this.props.pinataId && this.props.pinataToken) {
      this.setState({
        page: MenuPage.LOGGED_IN
      });
    }
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
            <p>You're signed in as <b>{this.props.userName}</b>.</p>
            <p>Not you? <a href="#" onClick={noDefault(logOut)}>Sign out</a></p>
            <button onClick={startGame}>Start Game</button>
          </div>}
          {this.state.page == MenuPage.SIGN_UP_SUCCESS &&
          <div className="sign-up-success">
            <h1>Your New Piñata Account</h1>
            <p>Your account has successfully been created.</p>
            <p><a href="#" onClick={noDefault(goToPage(MenuPage.LOG_IN))}>
              Sign in</a></p>
          </div>}
          <div className={hasError ? "error-msg" : "error-msg hidden"}>
            {errorMsg}</div>
        </div>}
      </div>
    );
  }

  private _startGame() {
    this._terrestria.connect().then(() => {
      const { userName, pinataId, pinataToken } = this.props;
      let creds: PinataCredentials|undefined;

      if (userName && pinataId && pinataToken) {
        creds = {
          userName, pinataId, pinataToken
        };
      }

      this._terrestria.start(creds);
    }, () => {
      this.setState({
        loading: false,
        errorMsg: "Failed to connect to server"
      });
    });
  }

  private _logOut() {
    this._terrestria.logOut();
    this.setState({
      page: MenuPage.SIGN_UP
    });
    this.props.onUpdatePinataCreds(undefined);
  }

  private _signUp(email: string,
                  userName: string,
                  password: string) {
    this.setState({
      loading: true,
      errorMsg: ""
    });

    this._terrestria.connect().then(() => {
      this._terrestria.signUp(email, userName, password).then(() => {
        this.setState({
          page: MenuPage.SIGN_UP_SUCCESS,
          loading: false
        });
      }, () => {
        this.setState({
          loading: false,
          errorMsg: "Sign up failed"
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

  private _logIn(email: string, password: string) {
    this.setState({
      loading: true,
      errorMsg: ""
    });

    this._terrestria.connect().then(() => {
      this._terrestria.logIn(email, password).then((result: RLogInSuccess) => {
        this.setState({
          page: MenuPage.LOGGED_IN,
          loading: false
        });
        this.props.onUpdatePinataCreds(result);
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
