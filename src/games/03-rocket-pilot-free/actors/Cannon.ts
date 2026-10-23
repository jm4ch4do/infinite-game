import Phaser from "phaser";
import { Actor } from "./Actor";
import { Bullet } from "./Bullet";
import { type Side } from "../config";
import type { GameState } from "../status/GameState";

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
  update(_delta: number, state: GameState) {
    this.readyIndicator.setVisible(!state.isGameOver && this.ready);
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
    const direction = this.side === "left" ? 1 : -1;
    this.emit({
      type: "spawned",
      actor: new Bullet(this.scene, this.readyIndicator.x, this.readyIndicator.y, this.side, direction * Bullet.speed, 0),
    });
    this.audio.playShoot();
    return true;
  }

  // Places the cannon at its side of the screen for the current playfield.
  handleResize(width: number, height: number, state: GameState) {
    const scale = state.playfieldScale;
    const margin = Cannon.margin * scale;
    const x = this.side === "left" ? margin : width - margin;
    const y = height / 2;
    const indicatorOffset = Cannon.readyIndicatorOffset * scale;
    const indicatorX = this.side === "left" ? x + indicatorOffset : x - indicatorOffset;
    this.shape.setScale(scale).setPosition(x, y);
    this.readyIndicator.setScale(scale).setPosition(indicatorX, y);
  }
}

