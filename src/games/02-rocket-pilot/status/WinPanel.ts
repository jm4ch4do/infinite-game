import Phaser from "phaser";
import { Actor } from "../actors/Actor";
import { type Side } from "../config";
import type { GameCallbacks, MatchWins } from "../../registry";

export class WinPanel extends Actor {
  static readonly width = 560;
  static readonly height = 300;
  static readonly offsetY = 150;
  readonly backdrop: Phaser.GameObjects.Rectangle;
  readonly dividerLine: Phaser.GameObjects.Rectangle;
  readonly leftNameText: Phaser.GameObjects.Text;
  readonly leftScoreText: Phaser.GameObjects.Text;
  readonly rightNameText: Phaser.GameObjects.Text;
  readonly rightScoreText: Phaser.GameObjects.Text;
  readonly rematchButton: Phaser.GameObjects.Text;
  readonly nextGameButton: Phaser.GameObjects.Text;
  readonly finishButton: Phaser.GameObjects.Text;
  readonly resetScoreButton: Phaser.GameObjects.Text;
  readonly adjustPreferencesToggle: Phaser.GameObjects.Text;
  adjustPreferences: boolean;

  // Creates the winner panel and connects its menu buttons.
  constructor(scene: Phaser.Scene, playerNames: Record<Side, string>, matchWins: MatchWins, callbacks: GameCallbacks) {
    super(scene);
    this.adjustPreferences = false;

    const centerX = scene.scale.width / 2;
    const panelCenterY = scene.scale.height / 2 - WinPanel.offsetY;
    const panelTop = panelCenterY - WinPanel.height / 2;
    const resetY = panelTop + 20;
    const nameY = panelTop + 65;
    const scoreY = panelTop + 120;
    const buttonY = panelTop + 190;
    const toggleY = panelTop + 250;

    this.backdrop = this.track(scene.add.rectangle(centerX, panelCenterY, WinPanel.width, WinPanel.height, 0x000000, 0.6));
    this.resetScoreButton = this.createSecondaryButton(centerX, resetY, "RESET SCORE", () => {
      callbacks.onResetMatchWins();
    });
    this.adjustPreferencesToggle = this.createSubtleButton(centerX, toggleY, this.adjustPreferencesLabel(), () => {
      this.adjustPreferences = !this.adjustPreferences;
      this.adjustPreferencesToggle.setText(this.adjustPreferencesLabel());
    });
    this.dividerLine = this.track(scene.add.rectangle(centerX, scoreY, 2, 56, 0xffffff, 0.35));
    this.leftNameText = this.track(scene.add.text(centerX - 110, nameY, playerNames.left, { fontSize: "24px", color: "#22d3ee", fontStyle: "bold" }).setOrigin(0.5));
    this.leftScoreText = this.track(scene.add.text(centerX - 110, scoreY, String(matchWins.left), { fontSize: "48px", color: "#22d3ee", fontStyle: "bold" }).setOrigin(0.5));
    this.rightNameText = this.track(scene.add.text(centerX + 110, nameY, playerNames.right, { fontSize: "24px", color: "#c084fc", fontStyle: "bold" }).setOrigin(0.5));
    this.rightScoreText = this.track(scene.add.text(centerX + 110, scoreY, String(matchWins.right), { fontSize: "48px", color: "#c084fc", fontStyle: "bold" }).setOrigin(0.5));

    this.nextGameButton = this.createButton(centerX - 180, buttonY, "CHANGE GAME", "#22d3ee", () => callbacks.onNextGame(this.adjustPreferences));
    this.rematchButton = this.createButton(centerX, buttonY, "RETRY", "#a3e635", () => callbacks.onRematch(this.adjustPreferences));
    this.finishButton = this.createButton(centerX + 180, buttonY, "FINISH", "#ec4899", () => callbacks.onFinish());
  }

  // Returns the label for the optional preferences setting.
  adjustPreferencesLabel() {
    return `${this.adjustPreferences ? "☑" : "☐"} ADJUST PREFERENCES`;
  }

  // Creates a primary panel button with a hover color.
  createButton(x: number, y: number, label: string, color: string, onClick: () => void) {
    const button = this.scene.add
      .text(x, y, label, { fontSize: "18px", color, fontStyle: "bold", backgroundColor: "#0f172a" })
      .setPadding(12, 8, 12, 8)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#facc15"));
    button.on("pointerout", () => button.setColor(color));
    button.on("pointerdown", onClick);

    return this.track(button);
  }

  // Creates the smaller preferences toggle button.
  createSubtleButton(x: number, y: number, label: string, onClick: () => void) {
    const button = this.scene.add
      .text(x, y, label, { fontSize: "13px", color: "#64748b", fontStyle: "bold" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#94a3b8"));
    button.on("pointerout", () => button.setColor("#64748b"));
    button.on("pointerdown", onClick);

    return this.track(button);
  }

  // Creates the smaller reset-score button.
  createSecondaryButton(x: number, y: number, label: string, onClick: () => void) {
    const button = this.scene.add
      .text(x, y, label, { fontSize: "13px", color: "#64748b", fontStyle: "bold", backgroundColor: "#0b1220" })
      .setPadding(14, 6, 14, 6)
      .setOrigin(0.5)
      .setShadow(0, 2, "#020617", 1, false, true)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setColor("#94a3b8"));
    button.on("pointerout", () => button.setColor("#64748b"));
    button.on("pointerdown", onClick);

    return this.track(button);
  }

  // Repositions all panel elements after a screen size change.
  layout() {
    const centerX = this.scene.scale.width / 2;
    const panelCenterY = this.scene.scale.height / 2 - WinPanel.offsetY;
    const panelTop = panelCenterY - WinPanel.height / 2;
    const resetY = panelTop + 20;
    const nameY = panelTop + 65;
    const scoreY = panelTop + 120;
    const buttonY = panelTop + 190;
    const toggleY = panelTop + 250;

    this.backdrop.setPosition(centerX, panelCenterY);
    this.resetScoreButton.setPosition(centerX, resetY);
    this.dividerLine.setPosition(centerX, scoreY);
    this.leftNameText.setPosition(centerX - 110, nameY);
    this.leftScoreText.setPosition(centerX - 110, scoreY);
    this.rightNameText.setPosition(centerX + 110, nameY);
    this.rightScoreText.setPosition(centerX + 110, scoreY);
    this.nextGameButton.setPosition(centerX - 180, buttonY);
    this.rematchButton.setPosition(centerX, buttonY);
    this.finishButton.setPosition(centerX + 180, buttonY);
    this.adjustPreferencesToggle.setPosition(centerX, toggleY);
  }
}
