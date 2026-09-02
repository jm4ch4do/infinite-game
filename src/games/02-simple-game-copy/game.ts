import Phaser from "phaser";
import { SimpleGameScene } from "./scene";

export const createGame = () =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    transparent: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [SimpleGameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
