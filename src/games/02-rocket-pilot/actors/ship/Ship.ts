import Phaser from "phaser";
import { Actor } from "../Actor";
import type { GameState } from "../../status/GameState";
import { type Side } from "../../config";
import shipUrl from "./ship.png";
import fireUrl from "./fire.png";
import engineSoundUrl from "./engine-sound.mp3";

type PhysicsSprite = Phaser.Physics.Arcade.Sprite;

// Loads every texture and sound the ship uses, so the scene needn't know its asset files.
export const preloadShip = (scene: Phaser.Scene) => {
  scene.load.image(Ship.textureKey, shipUrl);
  scene.load.image(Ship.fireTextureKey, fireUrl);
  scene.load.audio(Ship.engineSoundKey, engineSoundUrl);
};

export class Ship extends Actor {
  static readonly textureKey = "ship";
  static readonly redTextureKey = "ship-red";
  static readonly fireTextureKey = "ship-fire";
  static readonly engineSoundKey = "ship-engine";
  static readonly engineVolume = 0.5;
  // Shifts the blue artwork's hue to red (1 is a full turn), and darkens it so it blends with the dark background.
  private static readonly redHueShift = 0.4;
  private static readonly redBrightness = 0.875;
  static readonly width = 60;
  static readonly thrust = 300;
  // Rotation speed in degrees per second.
  static readonly turnSpeed = 120;
  static readonly maxSpeed = 500;
  // Damping factors: fraction of velocity kept per second (lower stops faster).
  static readonly drag = 0.7;
  static readonly coastDrag = 0.3;
  static readonly hitSoundCooldown = 400;
  // Bounce off the screen edges; solid contacts temporarily replace it (see handleSolidContact).
  static readonly wallBounce = 0.4;
  // Physics body for movement and wall bounces, in source-texture pixels. Sized to reach the wingtips.
  private static readonly bodyRadius = 70;
  // Flame placement along the ship's heading, in source-texture pixels: it starts tucked this far under the hull and moves back by up to flameMaxGap as the ship reaches top speed.
  private static readonly flameInset = 15;
  private static readonly flameMaxGap = 16;
  // Hull hit circles, in source-texture pixels from the sprite's center. They are placed on the wings and nose so the whole chevron counts as touching, and they turn with the ship.
  private static readonly hitCircles: { x: number; y: number; radius: number }[] = [
    { x: 0, y: -38.5, radius: 15 },
    { x: -13, y: -18.5, radius: 15 },
    { x: 13, y: -18.5, radius: 15 },
    { x: -27, y: -0.5, radius: 15 },
    { x: 27, y: -0.5, radius: 15 },
    { x: -42, y: 17.5, radius: 15 },
    { x: 42, y: 17.5, radius: 15 },
    { x: -47, y: 29.5, radius: 13 },
    { x: 48, y: 29.5, radius: 13 },
  ];
  private readonly sprite: PhysicsSprite;
  // Engine flame drawn behind the hull; it has the same canvas size as the hull so it lines up without offsets.
  private readonly fire: Phaser.GameObjects.Image;
  private readonly hitZones: Phaser.GameObjects.Zone[];
  // Engine loop that plays while thrust is held.
  private readonly engineSound: Phaser.Sound.BaseSound;
  private lastHitTime = -Ship.hitSoundCooldown;
  private thrusting = false;

  // Creates the ship sprite with its movement body and the hull hit circles.
  constructor(scene: Phaser.Scene, x: number, y: number, side: Side) {
    super(scene);
    const textureKey = side === "left" ? Ship.textureKey : Ship.createRedTexture(scene);
    this.sprite = this.track(scene.physics.add.sprite(x, y, textureKey));
    this.sprite.setCircle(
      Ship.bodyRadius,
      this.sprite.width / 2 - Ship.bodyRadius,
      this.sprite.height / 2 - Ship.bodyRadius,
    );
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(Ship.wallBounce);
    // Damping slows the whole velocity vector, so the ship decelerates without drifting sideways.
    this.sprite.setDamping(true);
    this.sprite.setDrag(Ship.drag);

    this.fire = this.track(scene.add.image(x, y, Ship.fireTextureKey));
    this.fire.setDepth(-1).setVisible(false);
    this.engineSound = scene.sound.add(Ship.engineSoundKey, { loop: true, volume: Ship.engineVolume });
    this.onDestroy(() => this.engineSound.destroy());

    this.collisionLayer = "ship";
    this.solidLayer = "ship-body";
    this.solids = [this.sprite];
    this.hitZones = Ship.hitCircles.map(({ radius }) => this.createHitZone(scene, x, y, radius));
    this.colliders = this.hitZones;
  }

  // Builds the red hull once from the blue artwork by rotating every pixel's hue, keeping its brightness and transparency. Returns the texture key.
  private static createRedTexture(scene: Phaser.Scene) {
    const { textures } = scene;
    if (textures.exists(Ship.redTextureKey)) {
      return Ship.redTextureKey;
    }

    const source = textures.get(Ship.textureKey).getSourceImage() as HTMLImageElement;
    const canvasTexture = textures.createCanvas(Ship.redTextureKey, source.width, source.height)!;
    const context = canvasTexture.getContext();
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, source.width, source.height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const hsv = Phaser.Display.Color.RGBToHSV(pixels[i], pixels[i + 1], pixels[i + 2]) as Phaser.Types.Display.HSVColorObject;
      const rgb = Phaser.Display.Color.HSVToRGB((hsv.h + Ship.redHueShift) % 1, hsv.s, hsv.v * Ship.redBrightness) as Phaser.Types.Display.ColorObject;
      pixels[i] = rgb.r;
      pixels[i + 1] = rgb.g;
      pixels[i + 2] = rgb.b;
    }
    context.putImageData(image, 0, 0);
    canvasTexture.refresh();
    return Ship.redTextureKey;
  }

  // Each hit circle is a non-moving body that follows its zone, set up the same way as the planet.
  private createHitZone(scene: Phaser.Scene, x: number, y: number, radius: number) {
    const zone = this.track(scene.add.zone(x, y, radius * 2, radius * 2));
    scene.physics.add.existing(zone);
    const body = (zone as Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body }).body;
    body.setCircle(radius);
    body.moves = false;
    return zone;
  }

  // Moves the hit circles to follow the ship's position, rotation and scale.
  private updateHitZones() {
    const scale = this.sprite.scaleX;
    const cos = Math.cos(this.sprite.rotation);
    const sin = Math.sin(this.sprite.rotation);
    Ship.hitCircles.forEach(({ x, y }, i) => {
      const dx = x * scale;
      const dy = y * scale;
      this.hitZones[i]
        .setPosition(this.sprite.x + dx * cos - dy * sin, this.sprite.y + dx * sin + dy * cos)
        .setScale(scale);
    });
  }

  // Moves the flame to follow the ship's position, rotation and scale. It sits partly under the hull and drifts back along the ship's own axis as speed rises, so it stays on the tail while turning.
  private updateFire() {
    const scale = this.sprite.scaleX;
    const cos = Math.cos(this.sprite.rotation);
    const sin = Math.sin(this.sprite.rotation);
    const speed = (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.length();
    const gap = Ship.flameMaxGap * Math.min(speed / Ship.maxSpeed, 1);
    const dy = (gap - Ship.flameInset) * scale;
    this.fire
      .setPosition(this.sprite.x - dy * sin, this.sprite.y + dy * cos)
      .setRotation(this.sprite.rotation)
      .setScale(scale);
  }

  // Caps the ship's overall speed each frame; Arcade's max velocity limits each axis separately, so diagonals could exceed it.
  update() {
    (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.limit(Ship.maxSpeed);
    this.sprite.setBounce(Ship.wallBounce);
    this.updateHitZones();
  }

  // Follows the ship's new rotation after the physics step, so the flame stays on the tail while turning.
  lateUpdate() {
    this.updateFire();
  }

  // Uses the other solid's bounce for this contact, since Arcade applies the moving body's bounce.
  handleSolidContact(other: Actor) {
    this.sprite.setBounce(other.solidBounce ?? Ship.wallBounce);
  }

  // Turns the ship; -1 is left, 1 is right, 0 stops turning.
  turn(direction: -1 | 0 | 1) {
    this.sprite.setAngularVelocity(direction * Ship.turnSpeed);
  }

  // Accelerates along the nose direction and shows the engine flame; when off, the ship coasts with stronger drag so it slows down faster.
  setThrusting(on: boolean) {
    if (on && !this.thrusting) {
      this.engineSound.play();
    } else if (!on && this.thrusting) {
      this.engineSound.stop();
    }
    this.thrusting = on;
    this.fire.setVisible(on);
    this.sprite.setDrag(on ? Ship.drag : Ship.coastDrag);
    if (!on) {
      this.sprite.setAcceleration(0, 0);
      return;
    }

    // The artwork points up, while Phaser's rotation 0 points right.
    const heading = this.sprite.rotation - Math.PI / 2;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.scene.physics.velocityFromRotation(heading, Ship.thrust, body.acceleration);
  }

  // Plays a crash sound when touching the planet, throttled because overlap is reported every frame.
  handleCollision(other: Actor) {
    if (other.collisionLayer !== "planet") {
      return;
    }

    const now = this.scene.time.now;
    if (now - this.lastHitTime >= Ship.hitSoundCooldown) {
      this.lastHitTime = now;
      this.audio.playHit();
    }
  }

  // Keeps the ship's on-screen size in line with the playfield scale.
  handleResize(_width: number, _height: number, state: GameState) {
    this.sprite.setScale((Ship.width / this.sprite.width) * state.playfieldScale);
    this.updateHitZones();
    this.updateFire();
  }
}
