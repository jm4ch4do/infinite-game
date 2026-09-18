import Phaser from "phaser";
import { Actor } from "./Actor";
import { Cannon } from "./Cannon";
import { type Side } from "../config";

export class ScoreBoard extends Actor {
  static readonly marginBottom = 40;
  static readonly highlightScale = 1.6;
  static readonly highlightDuration = 300;
  readonly text: Record<Side, Phaser.GameObjects.Text>;
  readonly names: Record<Side, Phaser.GameObjects.Text>;
  winScore: number;

  // Creates the two player names and score displays.
  constructor(scene: Phaser.Scene, playerNames: Record<Side, string>, winScore: number) {
    super(scene);
    this.winScore = winScore;
    const y = scene.scale.height - ScoreBoard.marginBottom;

    const leftScore = this.track(scene.add.text(0, y, this.formatScore(0), { fontSize: "28px", color: "#22d3ee", fontStyle: "bold" }).setOrigin(0, 1));
    const leftName = this.track(scene.add.text(0, y, playerNames.left, { fontSize: "28px", color: "#22d3ee", fontStyle: "bold" }).setOrigin(0, 1));

    const rightScore = this.track(scene.add.text(0, y, this.formatScore(0), { fontSize: "28px", color: "#c084fc", fontStyle: "bold" }).setOrigin(1, 1));
    const rightName = this.track(scene.add.text(0, y, playerNames.right, { fontSize: "28px", color: "#c084fc", fontStyle: "bold" }).setOrigin(1, 1));

    this.text = { left: leftScore, right: rightScore };
    this.names = { left: leftName, right: rightName };
  }

  // Formats one score using the selected score required to win.
  formatScore(score: number) {
    return `${score}/${this.winScore}`;
  }

  // Updates the displayed score for one player.
  updateScore(side: Side, newScore: number) {
    this.text[side].setText(this.formatScore(newScore));
  }

  // Animates a player's score after they earn points.
  highlight(side: Side) {
    const text = this.text[side];
    this.scene.tweens.killTweensOf(text);
    text.setScale(ScoreBoard.highlightScale);
    this.scene.tweens.add({
      targets: text,
      scale: 1,
      duration: ScoreBoard.highlightDuration,
      ease: "Back.easeOut",
    });
  }

  // Positions the names and scores along the bottom of the screen.
  layout(width: number, height: number) {
    const y = height - ScoreBoard.marginBottom;
    const gap = 10;

    this.text.left.setPosition(Cannon.margin, y);
    this.names.left.setPosition(Cannon.margin + this.text.left.width + gap, y);

    this.text.right.setPosition(width - Cannon.margin, y);
    this.names.right.setPosition(width - Cannon.margin - this.text.right.width - gap, y);
  }
}
