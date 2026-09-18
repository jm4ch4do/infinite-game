import Phaser from "phaser";
import { Actor } from "./Actor";

export class Planet extends Actor {
  static readonly radius = 150;
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

  // Positions and scales all visible planet parts together.
  layout(x: number, y: number, scale: number) {
    this.body.setScale(scale).setPosition(x, y);
    this.glow.setScale(scale).setPosition(x, y);
    this.highlight.setScale(scale).setPosition(x - Planet.radius * 0.35 * scale, y - Planet.radius * 0.35 * scale);
  }
}
