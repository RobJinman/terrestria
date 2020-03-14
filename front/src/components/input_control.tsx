import * as React from "react";

const EMAIL_REGEX = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

function isValidPassword(password: string) {
  return password.length > 0;
}

export enum InputControlType {
  EMAIL,
  PASSWORD,
  TEXT
}

export interface InputControlState {
  dirty: boolean;
  value: string;
  valid: boolean;
}

export function initialInputState(valid?: boolean): InputControlState {
  return {
    dirty: false,
    value: "",
    valid: valid === undefined ? false: valid
  };
}

export interface InputControlProps {
  name: string;
  label: string;
  type: InputControlType;
  onChange: (state: InputControlState) => void;
  errorMsg: string;
  validator?: (value: string) => boolean;
}

export class InputControl
  extends React.Component<InputControlProps, InputControlState> {

  private _validator = (value: string) => true;
  private _inputType = "text";

  state: InputControlState = {
    dirty: false,
    value: "",
    valid: false
  };

  constructor(props: InputControlProps) {
    super(props);

    if (props.validator) {
      this._validator = props.validator;
    }
    else {
      switch (props.type) {
        case InputControlType.EMAIL: {
          this._validator = isValidEmail;
          this._inputType = "email";
          break;
        }
        case InputControlType.PASSWORD: {
          this._validator = isValidPassword;
          this._inputType = "password";
          break;
        }
      }
    }
  }

  componentDidMount() {
    this.props.onChange(this.state);
  }

  render() {
    const onChange = (event: React.FormEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value;

      const state = {
        value,
        dirty: true,
        valid: this._validator(value)
      };

      this.setState(state);
      this.props.onChange(state);
    }

    const isInvalid = () => this.state.dirty && !this.state.valid;

    return (
      <div className="input-control form-field">
        <label htmlFor="email">{this.props.label}</label>
        <input type={this._inputType} name={this.props.name} value={this.state.value}
          onChange={onChange}/>
        <div className={isInvalid() ? "error-msg" : "error-msg hidden"}>
          {this.props.errorMsg}
        </div>
      </div>
    );
  }
}
