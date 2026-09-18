import Phaser from "phaser";
import { Actor } from "./Actor";
import { type Side } from "../config";
import { Planet } from "./Planet";
import { Target } from "./Target";

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
    scene.physics.add.existing(this.body);
    (this.body as PhysicsArc).body.setVelocity(velocityX, velocityY);
  }

  // Tracks the bullet's lifetime; Arcade physics handles its movement.
  update(delta: number) {
    this.age += delta;
  }

  // Checks whether the bullet is touching the central planet.
  collidesWithPlanet(planet: Phaser.GameObjects.Arc, playfieldScale: number) {
    const bulletCircle = new Phaser.Geom.Circle(this.body.x, this.body.y, Bullet.radius * playfieldScale);
    const planetCircle = new Phaser.Geom.Circle(planet.x, planet.y, Planet.radius * playfieldScale);
    return Phaser.Geom.Intersects.CircleToCircle(bulletCircle, planetCircle);
  }

  // Checks whether the bullet is touching a target's current world position.
  collidesWithTarget(targetPoint: Phaser.Math.Vector2, playfieldScale: number) {
    const bulletCircle = new Phaser.Geom.Circle(this.body.x, this.body.y, Bullet.radius * playfieldScale);
    const targetCircle = new Phaser.Geom.Circle(targetPoint.x, targetPoint.y, Target.radius * playfieldScale);
    return Phaser.Geom.Intersects.CircleToCircle(bulletCircle, targetCircle);
  }

  // Reports whether the bullet has outlived itself or left the visible game area.
  isExpired(width: number, height: number) {
    const margin = 20;
    const bounds = new Phaser.Geom.Rectangle(-margin, -margin, width + margin * 2, height + margin * 2);
    return this.age > Bullet.lifetime || !bounds.contains(this.body.x, this.body.y);
  }
}
