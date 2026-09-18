import Phaser from "phaser";
import { Actor } from "../Actor";
import { Cannon } from "../Cannon";

export class PlayerController extends Actor {
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private readonly cannon: Cannon;
  private isGameOver = false;

  // Creates the input reader for one player's cannon.
  constructor(scene: Phaser.Scene, cannon: Cannon, fireKeyCode: number) {
    super(scene);
    this.cannon = cannon;
    this.fireKey = scene.input.keyboard!.addKey(fireKeyCode);
  }

  // Reads this frame's input and asks the cannon to fire when appropriate.
  update() {
    if (!this.isGameOver && this.fireKey.isDown) {
      this.cannon.fire();
    }
  }

  // Stops the controller from acting once the round ends.
  setGameOver(isGameOver: boolean) {
    this.isGameOver = isGameOver;
  }
}
