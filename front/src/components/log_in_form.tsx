import * as React from "react";
import { InputControl, InputControlType, InputControlState,
         initialInputState } from "./input_control";
import { noDefault, EMAIL_REGEX, USER_NAME_REGEX } from "./utils";

interface CLogInFormProps {
  onLogIn: (email: string, password: string) => void;
  onStart: () => void;
  onBack: () => void;
}

interface CLogInFormState {
  email: InputControlState;
  password: InputControlState;
}

export class CLogInForm
  extends React.Component<CLogInFormProps, CLogInFormState> {

  state: CLogInFormState = {
    email: initialInputState(),
    password: initialInputState()
  };

  constructor(props: CLogInFormProps) {
    super(props);
  }

  render() {
    const onSubmit = this._onSubmit.bind(this);

    const onEmailChange = (state: InputControlState) => {
      this.setState({ email: state });
    };

    const onPasswordChange = (state: InputControlState) => {
      this.setState({ password: state });
    };

    const isValidIdentity = (identity: string) => {
      return EMAIL_REGEX.test(identity) || USER_NAME_REGEX.test(identity);
    };

    const isValid = this._isValid.bind(this);

    return (
      <div className="log-in">
        <h1>Piñata Sign In</h1>
        <p>Sign in with Piñata to win money as you play!</p>
        <form onSubmit={onSubmit}>
          <InputControl name="identity" label="User name or email"
            type={InputControlType.TEXT} onChange={onEmailChange}
            validator={isValidIdentity}
            errorMsg="Please enter a valid name or email"/>
          <InputControl name="password" label="Password"
            type={InputControlType.PASSWORD} onChange={onPasswordChange}
            errorMsg="Please enter a password"/>
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
    const { email, password } = this.state;
    this.props.onLogIn(email.value, password.value);
  }
}
