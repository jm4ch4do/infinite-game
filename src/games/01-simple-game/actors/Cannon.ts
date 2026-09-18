import Phaser from "phaser";
import { Actor } from "./Actor";
import { type Side } from "../config";

export class Cannon extends Actor {
  static readonly width = 50;
  static readonly height = 20;
  static readonly margin = 40;
  static readonly fireCooldown = 1000;
  static readonly readyIndicatorRadius = 6;
  static readonly readyIndicatorOffset = Cannon.width / 2 + 14;
  readonly shape: Phaser.GameObjects.Rectangle;
  readonly readyIndicator: Phaser.GameObjects.Arc;
  readonly side: Side;
  onFire?: () => void;
  private ready = true;

  // Creates one cannon at the given position and side.
  constructor(scene: Phaser.Scene, x: number, y: number, side: Side) {
    super(scene);
    this.shape = this.track(scene.add.rectangle(x, y, Cannon.width, Cannon.height, 0x64748b).setStrokeStyle(2, 0xe2e8f0, 0.6));
    this.readyIndicator = this.track(
      scene.add.circle(x + (side === "left" ? Cannon.readyIndicatorOffset : -Cannon.readyIndicatorOffset), y, Cannon.readyIndicatorRadius, 0xfacc15),
    );
    this.side = side;
  }

  // Shows the ready indicator for the current cooldown and game state.
  update(isGameOver: boolean) {
    this.readyIndicator.setVisible(!isGameOver && this.ready);
  }

  // Fires once if the cooldown has ended; otherwise does nothing.
  fire() {
    if (!this.ready) {
      return false;
    }

    this.ready = false;
    this.scene.time.delayedCall(Cannon.fireCooldown, () => {
      this.ready = true;
    });
    this.onFire?.();
    return true;
  }

  // Positions and scales the cannon for the current playfield.
  layout(x: number, y: number, scale: number) {
    const indicatorOffset = Cannon.readyIndicatorOffset * scale;
    const indicatorX = this.side === "left" ? x + indicatorOffset : x - indicatorOffset;
    this.shape.setScale(scale).setPosition(x, y);
    this.readyIndicator.setScale(scale).setPosition(indicatorX, y);
  }
}
