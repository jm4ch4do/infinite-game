import Phaser from "phaser";
import { Actor } from "../Actor";
import { Ship } from "../ship/Ship";
import { type Side } from "../../config";
import type { GameState } from "../../status/GameState";
import powerUpBlueUrl from "./power-up-blue.png";
import powerUpRedUrl from "./power-up-red.png";

// Loads the power-up texture for each player's color, so the scene needn't know its asset files.
export const preloadPowerUp = (scene: Phaser.Scene) => {
  scene.load.image(PowerUp.textureKeys.left, powerUpBlueUrl);
  scene.load.image(PowerUp.textureKeys.right, powerUpRedUrl);
};

// One circle at the spark's core, used to detect ship contact; x and y are offsets from the image center and radius, in texture pixels.
const hitCircles = [{ x: 0, y: 0, radius: 36 }];
// How long the spark takes to fade out after it is collected, in milliseconds.
const fadeDuration = 150;

// A spark a player can collect; it fades out when a ship of its own color touches it.
export class PowerUp extends Actor {
  // The left player is blue and the right player is red, so each collects the spark of its own color.
  static readonly textureKeys: Record<Side, string> = { left: "power-up-blue", right: "power-up-red" };
  // On-screen width at full playfield scale, the same as a mini asteroid.
  static readonly width = 52;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hitZones: Phaser.GameObjects.Zone[];
  private collected = false;

  // Creates the spark for one player's color at a screen position; it is placed on resize.
  constructor(
    scene: Phaser.Scene,
    private readonly side: Side,
    private readonly xFraction: number,
    private readonly yFraction: number,
  ) {
    super(scene);
    this.sprite = this.track(scene.add.image(0, 0, PowerUp.textureKeys[side]));
    this.hitZones = hitCircles.map(({ radius }) => this.createHitZone(scene, radius));

    this.collisionLayer = "power-up";
    this.colliders = this.hitZones;
  }

  // Only the ship of the spark's own color collects it: the spark fades out and then asks to be removed. Further contact is ignored while it fades.
  handleCollision(other: Actor) {
    if (this.collected || !(other instanceof Ship) || other.side !== this.side) {
      return;
    }

    this.collected = true;
    this.audio.playPowerUp();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: fadeDuration,
      ease: "Sine.easeIn",
      onComplete: () => this.remove(),
    });
  }

  // Each hit circle is an immovable body, set up the same way as the mini asteroid's.
  private createHitZone(scene: Phaser.Scene, radius: number) {
    const zone = this.track(scene.add.zone(0, 0, radius * 2, radius * 2));
    scene.physics.add.existing(zone);
    const body = (zone as Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body }).body;
    body.setCircle(radius);
    body.moves = false;
    body.immovable = true;
    return zone;
  }

  // Places the spark and its hit circle at their screen position and scales them with the playfield.
  handleResize(width: number, height: number, state: GameState) {
    const scale = (PowerUp.width / this.sprite.width) * state.playfieldScale;
    const x = width * this.xFraction;
    const y = height * this.yFraction;
    this.sprite.setScale(scale).setPosition(x, y);
    hitCircles.forEach(({ x: dx, y: dy }, i) => {
      this.hitZones[i].setScale(scale).setPosition(x + dx * scale, y + dy * scale);
    });
  }
}
