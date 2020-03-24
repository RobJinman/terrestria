import * as React from "react";
import { InputControl, InputControlType, InputControlState,
         initialInputState } from "./input_control";
import { USER_NAME_REGEX } from "./utils";

interface CSignUpFormProps {
  onSignUp: (email: string,
             username: string,
             password1: string) => void;
}

interface CSignUpFormState {
  email: InputControlState;
  username: InputControlState;
  password1: InputControlState;
  password2: InputControlState;
  errorMsg: string;
}

export class CSignUpForm
  extends React.Component<CSignUpFormProps, CSignUpFormState> {

  state: CSignUpFormState = {
    email: initialInputState(),
    username: initialInputState(),
    password1: initialInputState(),
    password2: initialInputState(),
    errorMsg: ""
  };

  constructor(props: CSignUpFormProps) {
    super(props);
  }

  private _isValid() {
    return this.state.email.valid &&
           this.state.username.valid &&
           this.state.password1.valid &&
           this.state.password2.valid;
  }

  private _onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const { email, username, password1, password2 } = this.state;

    if (password1.value !== password2.value) {
      this.setState({ errorMsg: "Please make sure your passwords match" });
    }
    else {
      this.props.onSignUp(email.value,
                          username.value,
                          password1.value);
    }
  }

  render() {
    const onSubmit = this._onSubmit.bind(this);

    const onEmailChange = (state: InputControlState) => {
      this.setState({ email: state, errorMsg: "" });
    };

    const onUserNameChange = (state: InputControlState) => {
      this.setState({ username: state, errorMsg: "" });
    };

    const onPassword1Change = (state: InputControlState) => {
      this.setState({ password1: state, errorMsg: "" });
    };

    const onPassword2Change = (state: InputControlState) => {
      this.setState({ password2: state, errorMsg: "" });
    };

    const isValidUserName = (username: string) => {
      return USER_NAME_REGEX.test(username);
    };

    const isValid = this._isValid.bind(this);

    const errorMsg = this.state.errorMsg;
    const hasError = errorMsg.length > 0;

    return (
      <div className="sign-up">
        <h1>Create your Piñata Account</h1>
        <p>Once signed up, you can view your awards at{" "}
          <a href="https://pinatagames.com">pinatagames.com</a> and convert your
          Fetti to real money via PayPal.</p>
        <form onSubmit={onSubmit}>
          <InputControl name="email" label="Email"
            type={InputControlType.EMAIL} onChange={onEmailChange}
            errorMsg="Please enter a valid email address"/>
          <InputControl name="username" label="User name"
            type={InputControlType.TEXT} onChange={onUserNameChange}
            validator={isValidUserName}
            errorMsg="Please enter a valid user name"/>
          <InputControl name="password1" label="Password"
            type={InputControlType.PASSWORD} onChange={onPassword1Change}
            errorMsg="Please enter a password"/>
          <InputControl name="password2" label="Repeat password"
            type={InputControlType.PASSWORD} onChange={onPassword2Change}
            errorMsg="Please repeat your password"/>
          <input disabled={!isValid()} type="submit" value="Sign up"/>
        </form>
        <div className={hasError ? "error-msg" : "error-msg hidden"}>
          {errorMsg}</div>
      </div>
    );
  }
}
