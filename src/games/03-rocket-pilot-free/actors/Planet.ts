import Phaser from "phaser";
import { Actor } from "./Actor";
import type { GameState } from "../status/GameState";

export class Planet extends Actor {
  static readonly radius = 150;
  // How strongly the planet bounces a ship back; higher than the screen-edge bounce.
  static readonly bounce = 0.9;
  readonly body: Phaser.GameObjects.Arc;
  readonly glow: Phaser.GameObjects.Arc;
  readonly highlight: Phaser.GameObjects.Arc;

  // Creates the planet with its glow and highlight effects.
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);
    this.glow = this.track(scene.add.circle(x, y, Planet.radius * 1.2, 0x22d3ee, 0.12));
    this.body = this.track(scene.add.circle(x, y, Planet.radius, 0x0e7490));
    this.highlight = this.track(
      scene.add.circle(x - Planet.radius * 0.35, y - Planet.radius * 0.35, Planet.radius * 0.22, 0xffffff, 0.2),
    );

    this.collisionLayer = "planet";
    this.colliders = [this.body];
    scene.physics.add.existing(this.body);
    const physics = (this.body as Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body }).body;
    physics.setCircle(Planet.radius);
    physics.moves = false;
    // Immovable so a bouncing ship is pushed back instead of pushing the planet.
    physics.immovable = true;
    this.solidBounce = Planet.bounce;

    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.08, to: 0.2 },
      scale: { from: 1, to: 1.08 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Centers the planet on screen and scales all visible parts together.
  handleResize(width: number, height: number, state: GameState) {
    const x = width / 2;
    const y = height / 2;
    const scale = state.playfieldScale;
    this.body.setScale(scale).setPosition(x, y);
    this.glow.setScale(scale).setPosition(x, y);
    this.highlight.setScale(scale).setPosition(x - Planet.radius * 0.35 * scale, y - Planet.radius * 0.35 * scale);
  }
}

