import { App } from "./app";

async function init() {
  const app = new App();
  await app.start();
}

document.body.onload = init;
