import Phaser from "phaser";
import { Actor } from "./Actor";

export class Target extends Actor {
  static readonly count = 6;
  static readonly radius = 24;
  static readonly orbitRadius = 280;
  private static readonly valueWeights = [10, 6, 3, 1.5, 0.5];
  readonly body: Phaser.GameObjects.Arc;
  readonly label: Phaser.GameObjects.Text;

  // Creates one orbiting target with its score value label.
  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene);
    this.points = value;
    this.body = this.track(scene.add.circle(x, y, Target.radius, 0xec4899));
    this.body.setStrokeStyle(3, 0xffffff, 0.6);
    this.collisionLayer = "target";
    this.collider = this.body;
    scene.physics.add.existing(this.body);
    const physics = (this.body as Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body }).body;
    physics.setCircle(Target.radius);
    // The orbit container moves the target, so physics must only read its position.
    physics.moves = false;
    this.label = this.track(scene.add.text(x, y, String(value), { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
  }

  // A target is removed when anything hits it.
  handleCollision() {
    this.audio.playHit();
    this.remove();
  }

  // Randomly chooses a target score using the configured weights.
  static pickValue() {
    const totalWeight = Target.valueWeights.reduce((sum, weight) => sum + weight, 0);
    let roll = Phaser.Math.FloatBetween(0, totalWeight);

    for (let i = 0; i < Target.valueWeights.length; i++) {
      roll -= Target.valueWeights[i];
      if (roll <= 0) {
        return i + 1;
      }
    }

    return Target.valueWeights.length;
  }
}

