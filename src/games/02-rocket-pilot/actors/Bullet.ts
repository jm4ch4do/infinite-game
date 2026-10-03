import Phaser from "phaser";
import { Actor } from "./Actor";
import { type Side } from "../config";
import type { GameState } from "../status/GameState";

type PhysicsArc = Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };

export class Bullet extends Actor {
  static readonly radius = 6;
  static readonly speed = 500;
  static readonly lifetime = 2000;
  readonly body: Phaser.GameObjects.Arc;
  public age = 0;
  public side: Side;

  // Creates a bullet at the cannon's firing position and lets Arcade physics move it.
  constructor(scene: Phaser.Scene, x: number, y: number, side: Side, velocityX: number, velocityY: number) {
    super(scene);
    this.body = this.track(scene.add.circle(x, y, Bullet.radius, 0xfacc15));
    this.side = side;
    this.collisionLayer = "bullet";
    this.collider = this.body;
    scene.physics.add.existing(this.body);
    const physics = (this.body as PhysicsArc).body;
    physics.setCircle(Bullet.radius);
    physics.setVelocity(velocityX, velocityY);
  }

  // Tracks the bullet's lifetime and removes it once expired or the round is over; Arcade physics handles movement.
  update(delta: number, state: GameState) {
    this.age += delta;
    if (state.isGameOver || this.isExpired(this.scene.scale.width, this.scene.scale.height)) {
      this.remove();
    }
  }

  // Scores for its owner if the other actor is worth points, and is spent by whatever it hits.
  handleCollision(other: Actor) {
    if (other.points > 0) {
      this.emit({ type: "score", side: this.side, points: other.points });
    }
    this.remove();
  }

  // Reports whether the bullet has outlived itself or left the visible game area.
  isExpired(width: number, height: number) {
    const margin = 20;
    const bounds = new Phaser.Geom.Rectangle(-margin, -margin, width + margin * 2, height + margin * 2);
    return this.age > Bullet.lifetime || !bounds.contains(this.body.x, this.body.y);
  }
}
