import * as React from "react";

export function noDefault(fn: (event: React.SyntheticEvent) => void) {
  return (event: React.SyntheticEvent) => {
    event.preventDefault();
    fn(event);
  };
}
