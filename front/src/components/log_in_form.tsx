import * as React from "react";
import { InputControl, InputControlType, InputControlState,
         initialInputState } from "./input_control";
import { noDefault } from "./utils";

interface CLogInFormProps {
  onLogIn: (email: string, password: string, stayLoggedIn: boolean) => void;
  onStart: () => void;
  onBack: () => void;
}

interface CLogInFormState {
  email: InputControlState;
  password: InputControlState;
  stayLoggedIn: boolean;
}

export class CLogInForm
  extends React.Component<CLogInFormProps, CLogInFormState> {

  state: CLogInFormState = {
    email: initialInputState(),
    password: initialInputState(),
    stayLoggedIn: true
  };

  constructor(props: CLogInFormProps) {
    super(props);
  }

  render() {
    const onSubmit = this._onSubmit.bind(this);

    const onEmailChange = (state: InputControlState) => {
      this.setState({ email: state });
    }

    const onPasswordChange = (state: InputControlState) => {
      this.setState({ password: state });
    }

    const isValid = this._isValid.bind(this);

    const onStayLoggedInToggle = (event: React.SyntheticEvent) => {
      const target: any = event.target;
      this.setState({ stayLoggedIn: target.checked });
    };

    return (
      <div className="log-in">
        <h1>Piñata Sign In</h1>
        <p>Sign in with Piñata to win money as you play!</p>
        <form onSubmit={onSubmit}>
          <InputControl name="email" label="Email"
            type={InputControlType.EMAIL} onChange={onEmailChange}
            errorMsg="Please enter a valid email address"/>
          <InputControl name="password" label="Password"
            type={InputControlType.PASSWORD} onChange={onPasswordChange}
            errorMsg="Please enter a password"/>
          <div className="form-field">
            <label htmlFor="stayLoggedIn">Stay signed in</label>
            <input type="checkbox" name="stayLoggedIn"
              checked={this.state.stayLoggedIn}
              onChange={onStayLoggedInToggle} />
          </div>
          <input disabled={!isValid()} type="submit" value="Sign in"
            className="btn-log-in" />
        </form>
        <p className="continue">
          <a href="#" onClick={noDefault(this.props.onStart)}>
          Skip Piñata sign in and continue to game</a></p>
        <p className="go-back">
          <a href="#" onClick={noDefault(this.props.onBack)}>Go back</a></p>
      </div>
    );
  }

  private _isValid() {
    return this.state.email.valid && this.state.password.valid;
  }

  private _onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const { email, password, stayLoggedIn } = this.state;
    this.props.onLogIn(email.value, password.value, stayLoggedIn);
  }
}
