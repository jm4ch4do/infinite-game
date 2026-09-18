import Phaser from "phaser";
import { Actor } from "../Actor";
import { Cannon } from "../Cannon";
import { PlayerController } from "./PlayerController";
import { type Side } from "../../config";

export class Player extends Actor {
  readonly side: Side;
  readonly name: string;
  readonly cannon: Cannon;
  readonly controller: PlayerController;
  score = 0;

  // Creates a player's identity, cannon, and input controller.
  constructor(scene: Phaser.Scene, side: Side, name: string, x: number, y: number, fireKeyCode: number) {
    super(scene);
    this.side = side;
    this.name = name;
    this.cannon = this.track(new Cannon(scene, x, y, side));
    this.controller = this.track(new PlayerController(scene, this.cannon, fireKeyCode));
  }

  // Creates the left and right players from their names.
  static createPair(scene: Phaser.Scene, width: number, centerY: number, playerNames: Record<Side, string>) {
    return [
      new Player(scene, "left", playerNames.left, Cannon.margin, centerY, Phaser.Input.Keyboard.KeyCodes.Q),
      new Player(scene, "right", playerNames.right, width - Cannon.margin, centerY, Phaser.Input.Keyboard.KeyCodes.SPACE),
    ];
  }

  // Updates the player's controller and cannon for one frame.
  update(isGameOver: boolean) {
    this.controller.setGameOver(isGameOver);
    this.controller.update();
    this.cannon.update(isGameOver);
  }

  // Positions and scales the player's cannon for the current playfield.
  layout(x: number, y: number, scale: number) {
    this.cannon.layout(x, y, scale);
  }

  // Adds points without exceeding the score needed to win.
  addScore(value: number, winScore: number) {
    this.score = Math.min(this.score + value, winScore);
    return this.score;
  }

  // Reports whether this player has reached the score needed to win.
  hasWon(winScore: number) {
    return this.score >= winScore;
  }
}
