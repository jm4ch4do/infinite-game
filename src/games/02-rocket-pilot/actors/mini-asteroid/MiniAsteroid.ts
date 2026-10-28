import Phaser from "phaser";
import { Actor } from "../Actor";
import { Ship } from "../ship/Ship";
import type { GameState } from "../../status/GameState";
import miniAsteroidUrl from "./mini-asteroid.png";

// Loads the mini asteroid texture, so the scene needn't know its asset files.
export const preloadMiniAsteroid = (scene: Phaser.Scene) => {
  scene.load.image(MiniAsteroid.textureKey, miniAsteroidUrl);
};

// One circle covering the sphere, used to detect ship contact; x and y are offsets from the image center and radius, in texture pixels.
const hitCircles = [{ x: 0, y: 0, radius: 19 }];

// Screen positions of all mini asteroids as shares of the screen, all on the right side. The layout is mirrored across the horizontal centre line, so the top and bottom halves match and both players get the same space. Neighbours are at least about 84 px apart at the default size.
export const miniAsteroidPositions = [
  { xFraction: 0.772, yFraction: 0.087 },
  { xFraction: 0.904, yFraction: 0.301 },
  { xFraction: 0.633, yFraction: 0.346 },
  { xFraction: 0.682, yFraction: 0.196 },
  { xFraction: 0.861, yFraction: 0.184 },
  { xFraction: 0.768, yFraction: 0.281 },
  { xFraction: 0.888, yFraction: 0.078 },
  { xFraction: 0.654, yFraction: 0.087 },
  { xFraction: 0.772, yFraction: 0.913 },
  { xFraction: 0.904, yFraction: 0.699 },
  { xFraction: 0.633, yFraction: 0.654 },
  { xFraction: 0.682, yFraction: 0.804 },
  { xFraction: 0.861, yFraction: 0.816 },
  { xFraction: 0.768, yFraction: 0.719 },
  { xFraction: 0.888, yFraction: 0.922 },
  { xFraction: 0.654, yFraction: 0.913 },
  { xFraction: 0.716, yFraction: 0.418 },
  { xFraction: 0.716, yFraction: 0.582 },
  { xFraction: 0.6, yFraction: 0.207 },
  { xFraction: 0.6, yFraction: 0.793 },
];

export class MiniAsteroid extends Actor {
  static readonly textureKey = "mini-asteroid";
  // On-screen width at full playfield scale.
  static readonly width = 52;
  // How strongly the mini asteroid bounces a ship back.
  static readonly bounce = 0.8;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly hitZones: Phaser.GameObjects.Zone[];

  // Creates the glow, mini asteroid image, and hit circle at a screen position; all are placed on resize.
  constructor(
    scene: Phaser.Scene,
    private readonly xFraction: number,
    private readonly yFraction: number,
  ) {
    super(scene);
    // Glow radius is in texture pixels; it pulses like the asteroid's glow.
    this.glow = this.track(scene.add.circle(0, 0, 28, 0x22d3ee, 0.12));
    this.sprite = this.track(scene.add.image(0, 0, MiniAsteroid.textureKey));
    this.hitZones = hitCircles.map(({ radius }) => this.createHitZone(scene, radius));

    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.08, to: 0.2 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.collisionLayer = "mini-asteroid";
    this.colliders = this.hitZones;
  }

  // Bounces a ship off the sphere using the ship's hull circles, since its movement body is wider than the hull.
  handleCollision(other: Actor) {
    if (other instanceof Ship) {
      const zone = this.hitZones[0];
      other.bounceOffCircle(zone.x, zone.y, hitCircles[0].radius * zone.scaleX, MiniAsteroid.bounce);
    }
  }

  // Each hit circle is an immovable body, set up the same way as the planet.
  private createHitZone(scene: Phaser.Scene, radius: number) {
    const zone = this.track(scene.add.zone(0, 0, radius * 2, radius * 2));
    scene.physics.add.existing(zone);
    const body = (zone as Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body }).body;
    body.setCircle(radius);
    body.moves = false;
    body.immovable = true;
    return zone;
  }

  // Places the mini asteroid at its screen position and scales the image, glow, and hit circle together.
  handleResize(width: number, height: number, state: GameState) {
    const scale = (MiniAsteroid.width / this.sprite.width) * state.playfieldScale;
    const x = width * this.xFraction;
    const y = height * this.yFraction;
    this.glow.setScale(scale).setPosition(x, y);
    this.sprite.setScale(scale).setPosition(x, y);
    hitCircles.forEach(({ x: dx, y: dy }, i) => {
      this.hitZones[i].setScale(scale).setPosition(x + dx * scale, y + dy * scale);
    });
  }
}
