import Phaser from "phaser";
import { Actor } from "./Actor";
import { Ship } from "./ship/Ship";
import type { GameState } from "../status/GameState";
import planetUrl from "./planet.png";

// Loads the planet texture, so the scene needn't know its asset files.
export const preloadPlanet = (scene: Phaser.Scene) => {
  scene.load.image(Planet.textureKey, planetUrl);
};

export class Planet extends Actor {
  static readonly textureKey = "planet";
  static readonly radius = 150;
  // How strongly the planet bounces a ship back; higher than the screen-edge bounce.
  static readonly bounce = 0.9;
  readonly sprite: Phaser.GameObjects.Image;
  // Hidden circle that ships overlap; it matches the disc of the planet image.
  readonly body: Phaser.GameObjects.Arc;
  readonly glow: Phaser.GameObjects.Arc;

  // Creates the planet image with its glow and collision circle.
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);
    this.glow = this.track(scene.add.circle(x, y, Planet.radius * 1.2, 0x22d3ee, 0.12));
    this.sprite = this.track(scene.add.image(x, y, Planet.textureKey));
    this.body = this.track(scene.add.circle(x, y, Planet.radius));
    this.body.setVisible(false);

    this.collisionLayer = "planet";
    this.colliders = [this.body];
    scene.physics.add.existing(this.body);
    const physics = (this.body as Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body }).body;
    physics.setCircle(Planet.radius);
    physics.moves = false;
    physics.immovable = true;

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

  // Pushes a ship out of the planet using its hull circles, so the bounce happens where the ship's wings and nose touch the disc.
  handleCollision(other: Actor) {
    if (other instanceof Ship) {
      other.bounceOffCircle(this.body.x, this.body.y, Planet.radius * this.body.scaleX, Planet.bounce);
    }
  }

  // Centers the planet on screen and scales all visible parts together.
  handleResize(width: number, height: number, state: GameState) {
    const x = width / 2;
    const y = height / 2;
    const scale = state.playfieldScale;
    this.sprite.setScale((Planet.radius * 2 / this.sprite.width) * scale).setPosition(x, y);
    this.body.setScale(scale).setPosition(x, y);
    this.glow.setScale(scale).setPosition(x, y);
  }
}

