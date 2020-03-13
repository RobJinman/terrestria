import * as React from "react";
import { App } from "../terrestria/app";

interface MainComponentState {
  terrestria: App
}

export class MainComponent extends React.Component<{}> {
  state: MainComponentState;

  constructor(props: {}) {
    super(props);

    this.state = {
      terrestria: new App()
    };
  }

  componentDidMount() {
    this.state.terrestria.start();
  }

  render() {
    return <div id="terrestria"></div>;
  }
}
