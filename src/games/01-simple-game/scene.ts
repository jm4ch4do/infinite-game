import Phaser from "phaser";
import { createGameAudio, type GameAudio } from "./audio";
import type { PlayerNames as _regPlayerNames, GameCallbacks as _regGameCallbacks, Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../registry";

type Side = "left" | "right";

const TARGET_COUNT = 6;
const TARGET_ORBIT_RADIUS = 280;
const TARGET_RADIUS = 24;
// index i = value (i + 1); weight decreases as the value increases
const TARGET_VALUE_WEIGHTS = [10, 6, 3, 1.5, 0.5];
const BALL_RADIUS = 150;
const ROTATION_SPEED_BY_DIFFICULTY: Record<_regDifficulty, number> = {
  easy: 0.5,
  medium: 0.9,
  hard: 1.4,
}; // radians per second
const ROTATION_SPEED_GROWTH = 0.15; // fraction faster on each respawn

const CANNON_WIDTH = 50;
const CANNON_HEIGHT = 20;
const CANNON_MARGIN = 40; // distance from the screen edge
const CANNON_FIRE_COOLDOWN = 1000; // ms, prevents held-key rapid fire
const READY_INDICATOR_RADIUS = 6;
const READY_INDICATOR_OFFSET = CANNON_WIDTH / 2 + 14; // distance in front of the cannon
const BULLET_SPEED = 500; // px per second
const BULLET_RADIUS = 6;
const BULLET_LIFETIME = 2000; // ms before a bullet is force-destroyed
const DEFAULT_WIN_SCORE: _regWinScore = 10;
const SCORE_MARGIN_BOTTOM = 40;
const SCORE_HIGHLIGHT_SCALE = 1.6;
const SCORE_HIGHLIGHT_DURATION = 300; // ms
const WIN_PANEL_WIDTH = 560;
const WIN_PANEL_HEIGHT = 300;
const WIN_PANEL_OFFSET_Y = 150; // distance above vertical center
const PLAYFIELD_BASE_WIDTH = 1280;

type Bullet = Phaser.GameObjects.Arc & {
  velocityX: number;
  velocityY: number;
  age: number;
  side: Side;
};

type Cannon = {
  shape: Phaser.GameObjects.Rectangle;
  readyIndicator: Phaser.GameObjects.Arc;
  side: Side;
  fireKey: Phaser.Input.Keyboard.Key;
  lastFiredAt: number;
};

export class SimpleGameScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Arc;
  private ballGlow!: Phaser.GameObjects.Arc;
  private ballHighlight!: Phaser.GameObjects.Arc;
  private targetsOrbit!: Phaser.GameObjects.Container;
  private targets: Phaser.GameObjects.Arc[] = [];
  private targetLabels: Phaser.GameObjects.Text[] = [];
  private cannons: Cannon[] = [];
  private bullets: Bullet[] = [];
  private scores: Record<Side, number> = { left: 0, right: 0 };
  private scoreTexts!: Record<Side, Phaser.GameObjects.Text>;
  private nameTexts!: Record<Side, Phaser.GameObjects.Text>;
  private audio!: GameAudio;
  private isGameOver = false;
  private winBackdrop?: Phaser.GameObjects.Rectangle;
  private winDividerLine?: Phaser.GameObjects.Rectangle;
  private winLeftNameText?: Phaser.GameObjects.Text;
  private winLeftScoreText?: Phaser.GameObjects.Text;
  private winRightNameText?: Phaser.GameObjects.Text;
  private winRightScoreText?: Phaser.GameObjects.Text;
  private winRematchButton?: Phaser.GameObjects.Text;
  private winNextGameButton?: Phaser.GameObjects.Text;
  private winFinishButton?: Phaser.GameObjects.Text;
  private winResetScoreButton?: Phaser.GameObjects.Text;
  private winAdjustPreferencesToggle?: Phaser.GameObjects.Text;
  private adjustPreferences = false;
  private rotationSpeed = ROTATION_SPEED_BY_DIFFICULTY.medium;
  private playerNames: _regPlayerNames = { left: "Player1", right: "Player2" };
  private callbacks?: _regGameCallbacks;
  private winScore: _regWinScore = DEFAULT_WIN_SCORE;
  private matchWins: _regMatchWins = { left: 0, right: 0 };
  private playfieldScale = 1;

  constructor() {
    super("SimpleGameScene");
  }

  init(data: {
    playerNames?: _regPlayerNames;
    callbacks?: _regGameCallbacks;
    difficulty?: _regDifficulty;
    winScore?: _regWinScore;
    matchWins?: _regMatchWins;
  }) {
    if (data.playerNames) {
      this.playerNames = data.playerNames;
    }
    this.callbacks = data.callbacks;
    this.rotationSpeed = ROTATION_SPEED_BY_DIFFICULTY[data.difficulty ?? "medium"];
    this.winScore = data.winScore ?? DEFAULT_WIN_SCORE;
    this.matchWins = data.matchWins ?? { left: 0, right: 0 };
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.audio = createGameAudio();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.dispose());

    this.ball = this.createBall(centerX, centerY);
    this.targetsOrbit = this.createTargetsOrbit(centerX, centerY);
    this.cannons = this.createCannons(this.scale.width, centerY);
    this.layoutPlayfield(this.scale.width, centerY);
    this.createScoreTexts(this.scale.width, this.scale.height);

    this.scale.on("resize", this.handleResize, this);
  }

  update(_time: number, delta: number) {
    this.targetsOrbit.rotation += (delta / 1000) * this.rotationSpeed;
    // keep the value labels upright regardless of the orbit's rotation
    this.targetLabels.forEach((label) => (label.rotation = -this.targetsOrbit.rotation));
    this.updateCannons();
    this.updateBullets(delta);
  }

  private createBall(x: number, y: number) {
    // layered glow + highlight give the ball a lit sphere look, kept subtle rather than shiny
    this.ballGlow = this.add.circle(x, y, BALL_RADIUS * 1.2, 0x22d3ee, 0.12);
    const ball = this.add.circle(x, y, BALL_RADIUS, 0x0e7490);
    this.ballHighlight = this.add.circle(
      x - BALL_RADIUS * 0.35,
      y - BALL_RADIUS * 0.35,
      BALL_RADIUS * 0.22,
      0xffffff,
      0.2,
    );

    this.tweens.add({
      targets: this.ballGlow,
      alpha: { from: 0.08, to: 0.2 },
      scale: { from: 1, to: 1.08 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return ball;
  }

  private createTargetsOrbit(centerX: number, centerY: number) {
    this.targets = [];
    this.targetLabels = [];
    const children: Phaser.GameObjects.GameObject[] = [];

    for (let i = 0; i < TARGET_COUNT; i++) {
      const angle = (i / TARGET_COUNT) * Math.PI * 2;
      // positions are relative to the container's origin, not the world
      const x = Math.cos(angle) * TARGET_ORBIT_RADIUS;
      const y = Math.sin(angle) * TARGET_ORBIT_RADIUS;
      const target = this.add.circle(x, y, TARGET_RADIUS, 0xec4899);
      target.setStrokeStyle(3, 0xffffff, 0.6);

      const value = this.pickTargetValue();
      target.setData("value", value);
      const label = this.add.text(x, y, String(value), { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

      this.targets.push(target);
      this.targetLabels.push(label);
      children.push(target, label);
    }

    return this.add.container(centerX, centerY, children);
  }

  private pickTargetValue() {
    const totalWeight = TARGET_VALUE_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
    let roll = Phaser.Math.FloatBetween(0, totalWeight);

    for (let i = 0; i < TARGET_VALUE_WEIGHTS.length; i++) {
      roll -= TARGET_VALUE_WEIGHTS[i];
      if (roll <= 0) {
        return i + 1;
      }
    }

    return TARGET_VALUE_WEIGHTS.length;
  }

  private createCannons(width: number, centerY: number): Cannon[] {
    const keyboard = this.input.keyboard!;

    const left: Cannon = {
      shape: this.add.rectangle(CANNON_MARGIN, centerY, CANNON_WIDTH, CANNON_HEIGHT, 0x64748b).setStrokeStyle(2, 0xe2e8f0, 0.6),
      readyIndicator: this.add.circle(CANNON_MARGIN + READY_INDICATOR_OFFSET, centerY, READY_INDICATOR_RADIUS, 0xfacc15),
      side: "left",
      fireKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      lastFiredAt: 0,
    };

    const right: Cannon = {
      shape: this.add.rectangle(width - CANNON_MARGIN, centerY, CANNON_WIDTH, CANNON_HEIGHT, 0x64748b).setStrokeStyle(2, 0xe2e8f0, 0.6),
      readyIndicator: this.add.circle(width - CANNON_MARGIN - READY_INDICATOR_OFFSET, centerY, READY_INDICATOR_RADIUS, 0xfacc15),
      side: "right",
      fireKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      lastFiredAt: 0,
    };

    return [left, right];
  }

  private createScoreTexts(width: number, height: number) {
    const y = height - SCORE_MARGIN_BOTTOM;

    const leftScore = this.add
      .text(0, y, this.formatScore("left"), { fontSize: "28px", color: "#22d3ee", fontStyle: "bold" })
      .setOrigin(0, 1);
    const leftName = this.add
      .text(0, y, this.playerNames.left, { fontSize: "28px", color: "#22d3ee", fontStyle: "bold" })
      .setOrigin(0, 1);

    const rightScore = this.add
      .text(0, y, this.formatScore("right"), { fontSize: "28px", color: "#c084fc", fontStyle: "bold" })
      .setOrigin(1, 1);
    const rightName = this.add
      .text(0, y, this.playerNames.right, { fontSize: "28px", color: "#c084fc", fontStyle: "bold" })
      .setOrigin(1, 1);

    this.scoreTexts = { left: leftScore, right: rightScore };
    this.nameTexts = { left: leftName, right: rightName };
    this.layoutScoreTexts(width, height);
  }

  private formatScore(side: Side) {
    return `${this.scores[side]}/${this.winScore}`;
  }

  private layoutScoreTexts(width: number, height: number) {
    const y = height - SCORE_MARGIN_BOTTOM;
    const gap = 10;

    this.scoreTexts.left.setPosition(CANNON_MARGIN, y);
    this.nameTexts.left.setPosition(CANNON_MARGIN + this.scoreTexts.left.width + gap, y);

    this.scoreTexts.right.setPosition(width - CANNON_MARGIN, y);
    this.nameTexts.right.setPosition(width - CANNON_MARGIN - this.scoreTexts.right.width - gap, y);
  }

  private updateCannons() {
    this.cannons.forEach((cannon) => {
      if (this.isGameOver) {
        cannon.readyIndicator.setVisible(false);
        return;
      }

      cannon.readyIndicator.setVisible(this.time.now - cannon.lastFiredAt > CANNON_FIRE_COOLDOWN);

      if (cannon.fireKey.isDown && this.time.now - cannon.lastFiredAt > CANNON_FIRE_COOLDOWN) {
        this.fireBulletFrom(cannon);
        cannon.lastFiredAt = this.time.now;
      }
    });
  }

  private fireBulletFrom(cannon: Cannon) {
    const direction = cannon.side === "left" ? 1 : -1;
    // spawn where the ready indicator sits, so the bullet doesn't jump forward on its first frame
    const bullet = this.add.circle(cannon.readyIndicator.x, cannon.readyIndicator.y, BULLET_RADIUS, 0xfacc15) as Bullet;
    bullet.velocityX = direction * BULLET_SPEED;
    bullet.velocityY = 0;
    bullet.age = 0;
    bullet.side = cannon.side;

    this.audio.playShoot();
    this.bullets.push(bullet);
  }

  private updateBullets(delta: number) {
    const seconds = delta / 1000;
    const matrix = this.targetsOrbit.getWorldTransformMatrix();
    const targetPoint = new Phaser.Math.Vector2();

    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.velocityX * seconds;
      bullet.y += bullet.velocityY * seconds;
      bullet.age += delta;

      const hitBall = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.ball.x, this.ball.y) <= (BALL_RADIUS + BULLET_RADIUS) * this.playfieldScale;

      const hitTargetIndex = this.targets.findIndex((target) => {
        matrix.transformPoint(target.x, target.y, targetPoint);
        return Phaser.Math.Distance.Between(bullet.x, bullet.y, targetPoint.x, targetPoint.y) <= (TARGET_RADIUS + BULLET_RADIUS) * this.playfieldScale;
      });

      if (hitTargetIndex !== -1) {
        this.destroyTarget(hitTargetIndex, bullet.side);
      }

      const expired = hitBall || hitTargetIndex !== -1 || bullet.age > BULLET_LIFETIME || this.isOffScreen(bullet);
      if (expired) {
        bullet.destroy();
      }

      return !expired;
    });
  }

  private destroyTarget(index: number, side: Side) {
    const target = this.targets[index];
    const label = this.targetLabels[index];
    const value = target.getData("value") as number;

    target.destroy();
    label.destroy();
    this.targets.splice(index, 1);
    this.targetLabels.splice(index, 1);

    this.audio.playHit();
    this.scores[side] = Math.min(this.scores[side] + value, this.winScore);
    this.scoreTexts[side].setText(this.formatScore(side));
    this.layoutScoreTexts(this.scale.width, this.scale.height);
    this.highlightScore(side);
    this.checkForWinner(side);

    if (this.targets.length === 0 && !this.isGameOver) {
      this.respawnTargets();
    }
  }

  private highlightScore(side: Side) {
    const text = this.scoreTexts[side];
    this.tweens.killTweensOf(text);
    text.setScale(SCORE_HIGHLIGHT_SCALE);
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: SCORE_HIGHLIGHT_DURATION,
      ease: "Back.easeOut",
    });
  }

  private checkForWinner(side: Side) {
    if (this.isGameOver || this.scores[side] < this.winScore) {
      return;
    }

    this.isGameOver = true;
    this.matchWins = this.callbacks?.onGameWon(side) ?? { ...this.matchWins, [side]: this.matchWins[side] + 1 };

    const centerX = this.scale.width / 2;
    const panelCenterY = this.winPanelCenterY();
    const panelTop = panelCenterY - WIN_PANEL_HEIGHT / 2;
    const resetY = panelTop + 20;
    const nameY = panelTop + 65;
    const scoreY = panelTop + 120;
    const buttonY = panelTop + 190;
    const toggleY = panelTop + 250;

    this.winBackdrop = this.add.rectangle(centerX, panelCenterY, WIN_PANEL_WIDTH, WIN_PANEL_HEIGHT, 0x000000, 0.6);
    this.winResetScoreButton = this.createSecondaryWinButton(centerX, resetY, "RESET SCORE", () => {
      this.matchWins = { left: 0, right: 0 };
      this.winLeftScoreText?.setText(String(this.matchWins.left));
      this.winRightScoreText?.setText(String(this.matchWins.right));
      this.callbacks?.onResetMatchWins();
    });
    this.winAdjustPreferencesToggle = this.createSubtleWinButton(centerX, toggleY, this.adjustPreferencesLabel(), () => {
      this.adjustPreferences = !this.adjustPreferences;
      this.winAdjustPreferencesToggle?.setText(this.adjustPreferencesLabel());
    });
    this.winDividerLine = this.add.rectangle(centerX, scoreY, 2, 56, 0xffffff, 0.35);
    this.winLeftNameText = this.add
      .text(centerX - 110, nameY, this.playerNames.left, { fontSize: "24px", color: "#22d3ee", fontStyle: "bold" })
      .setOrigin(0.5);
    this.winLeftScoreText = this.add
      .text(centerX - 110, scoreY, String(this.matchWins.left), { fontSize: "48px", color: "#22d3ee", fontStyle: "bold" })
      .setOrigin(0.5);
    this.winRightNameText = this.add
      .text(centerX + 110, nameY, this.playerNames.right, { fontSize: "24px", color: "#c084fc", fontStyle: "bold" })
      .setOrigin(0.5);
    this.winRightScoreText = this.add
      .text(centerX + 110, scoreY, String(this.matchWins.right), { fontSize: "48px", color: "#c084fc", fontStyle: "bold" })
      .setOrigin(0.5);

    this.winNextGameButton = this.createWinButton(centerX - 180, buttonY, "CHANGE GAME", "#22d3ee", () => this.callbacks?.onNextGame(this.adjustPreferences));
    this.winRematchButton = this.createWinButton(centerX, buttonY, "RETRY", "#a3e635", () => this.callbacks?.onRematch(this.adjustPreferences));
    this.winFinishButton = this.createWinButton(centerX + 180, buttonY, "FINISH", "#ec4899", () => this.callbacks?.onFinish());
  }

  private adjustPreferencesLabel() {
    return `${this.adjustPreferences ? "☑" : "☐"} ADJUST PREFERENCES`;
  }

  private winPanelCenterY() {
    return this.scale.height / 2 - WIN_PANEL_OFFSET_Y;
  }

  private createWinButton(x: number, y: number, label: string, color: string, onClick: () => void) {
    const button = this.add
      .text(x, y, label, { fontSize: "18px", color, fontStyle: "bold", backgroundColor: "#0f172a" })
      .setPadding(12, 8, 12, 8)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#facc15"));
    button.on("pointerout", () => button.setColor(color));
    button.on("pointerdown", onClick);

    return button;
  }

  private createSubtleWinButton(x: number, y: number, label: string, onClick: () => void) {
    const button = this.add
      .text(x, y, label, { fontSize: "13px", color: "#64748b", fontStyle: "bold" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#94a3b8"));
    button.on("pointerout", () => button.setColor("#64748b"));
    button.on("pointerdown", onClick);

    return button;
  }

  private createSecondaryWinButton(x: number, y: number, label: string, onClick: () => void) {
    const button = this.add
      .text(x, y, label, { fontSize: "13px", color: "#64748b", fontStyle: "bold", backgroundColor: "#0b1220" })
      .setPadding(14, 6, 14, 6)
      .setOrigin(0.5)
      .setShadow(0, 2, "#020617", 1, false, true)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#94a3b8"));
    button.on("pointerout", () => button.setColor("#64748b"));
    button.on("pointerdown", onClick);

    return button;
  }

  private respawnTargets() {
    this.rotationSpeed *= 1 + ROTATION_SPEED_GROWTH;
    this.targetsOrbit.destroy();
    this.targetsOrbit = this.createTargetsOrbit(this.ball.x, this.ball.y);
  }

  private isOffScreen(bullet: Phaser.GameObjects.Arc) {
    const margin = 20;
    return (
      bullet.x < -margin ||
      bullet.x > this.scale.width + margin ||
      bullet.y < -margin ||
      bullet.y > this.scale.height + margin
    );
  }

  private layoutPlayfield(width: number, centerY: number) {
    this.playfieldScale = Math.min(1, width / PLAYFIELD_BASE_WIDTH);
    const centerX = width / 2;
    const cannonMargin = CANNON_MARGIN * this.playfieldScale;
    const indicatorOffset = READY_INDICATOR_OFFSET * this.playfieldScale;

    this.ball.setScale(this.playfieldScale).setPosition(centerX, centerY);
    this.ballGlow.setScale(this.playfieldScale).setPosition(centerX, centerY);
    this.ballHighlight
      .setScale(this.playfieldScale)
      .setPosition(centerX - BALL_RADIUS * 0.35 * this.playfieldScale, centerY - BALL_RADIUS * 0.35 * this.playfieldScale);
    this.targetsOrbit.setScale(this.playfieldScale).setPosition(centerX, centerY);

    this.cannons.forEach((cannon) => {
      const x = cannon.side === "left" ? cannonMargin : width - cannonMargin;
      const indicatorX = cannon.side === "left" ? x + indicatorOffset : x - indicatorOffset;

      cannon.shape.setScale(this.playfieldScale).setPosition(x, centerY);
      cannon.readyIndicator.setScale(this.playfieldScale).setPosition(indicatorX, centerY);
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const centerX = gameSize.width / 2;
    const centerY = gameSize.height / 2;

    this.layoutPlayfield(gameSize.width, centerY);
    this.winBackdrop?.setPosition(centerX, this.winPanelCenterY());
    this.winResetScoreButton?.setPosition(centerX, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 20);
    this.winDividerLine?.setPosition(centerX, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 120);
    this.winLeftNameText?.setPosition(centerX - 110, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 65);
    this.winLeftScoreText?.setPosition(centerX - 110, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 120);
    this.winRightNameText?.setPosition(centerX + 110, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 65);
    this.winRightScoreText?.setPosition(centerX + 110, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 120);
    this.winRematchButton?.setPosition(centerX - 180, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 190);
    this.winNextGameButton?.setPosition(centerX, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 190);
    this.winFinishButton?.setPosition(centerX + 180, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 190);
    this.winAdjustPreferencesToggle?.setPosition(centerX, this.winPanelCenterY() - WIN_PANEL_HEIGHT / 2 + 250);
    this.layoutScoreTexts(gameSize.width, gameSize.height);
  }
}
