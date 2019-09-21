import * as PIXI from 'pixi.js';
import "../styles/styles.scss";

function init() {
  const app = new PIXI.Application();

  const parentElement = document.getElementById("pinata-demo-app");
  if (!parentElement) {
    throw new Error("Could not find #pinata-demo-app");
  }
  parentElement.appendChild(app.view);

  app.loader.add('bunny', 'assets/ammo.png').load((loader, resources) => {
    if (!resources.bunny) {
      throw new Error("Missing resource 'bunny'");
    }

    const bunny = new PIXI.Sprite(resources.bunny.texture);

    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;

    bunny.anchor.x = 0.5;
    bunny.anchor.y = 0.5;

    app.stage.addChild(bunny);

    app.ticker.add(() => {
        bunny.rotation += 0.01;
    });
  });
}

init();
