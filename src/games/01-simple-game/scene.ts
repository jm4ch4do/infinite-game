import Phaser from "phaser";
import { createGameAudio, type GameAudio } from "./audio";
import type { PlayerNames as _regPlayerNames, GameCallbacks as _regGameCallbacks, Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../registry";
import { Cannon as _aCannon } from "./actors/Cannon";
import { GameState as _sGameState } from "./status/GameState";
import { Overlord as _sOverlord } from "./status/Overlord";
import { Spawner as _sSpawner } from "./status/Spawner";
import { WinPanel as _sWinPanel } from "./status/WinPanel";
import { type Side } from "./config";

export class SimpleGameScene extends Phaser.Scene {
  /*
   * -------------------------------------------------------------------------
   * Scene state
   * -------------------------------------------------------------------------
   */
  private logic!: _sOverlord;
  private state = new _sGameState();
  private audio!: GameAudio;
  private winPanel?: _sWinPanel;
  private playerNames: _regPlayerNames = { left: "Player1", right: "Player2" };
  private callbacks?: _regGameCallbacks;

  /*
   * -------------------------------------------------------------------------
   * Initialization
   * -------------------------------------------------------------------------
   */
  // Creates this Phaser scene with its registered scene key.
  constructor() {
    super("SimpleGameScene");
  }

  // Receives the player settings and menu actions before the scene is built.
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
    this.state = new _sGameState(data.difficulty, data.winScore, data.matchWins);
  }

  /*
   * -------------------------------------------------------------------------
   * Build game Objects
   * -------------------------------------------------------------------------
   */
  // Builds the game actors, logic, UI, audio, and resize listener.
  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // add audio and set it to dispose on game end
    this.audio = createGameAudio();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.dispose());

    // add actors and status panels
    const spawner = new _sSpawner(this, this.state);
    spawner.spawnInitial(centerX, centerY, this.scale.width, this.playerNames);
    this.logic = new _sOverlord(this, this.state, spawner, {
      onScoreChanged: this.showScoreChange,
      onMatchWon: this.callbacks?.onGameWon ?? (() => ({ ...this.state.matchWins })),
      onRoundWon: this.showWinPanel,
    });
    this.layoutPlayfield(this.scale.width, centerY);

    this.scale.on("resize", this.handleResize, this);
  }


  /*
   * -------------------------------------------------------------------------
   * Updates game world one frame at a time
   * -------------------------------------------------------------------------
   */
  // Sends the current frame time to the game logic.
  update(_time: number, delta: number) {
    this.logic.update(delta);
  }

  /*
   * -------------------------------------------------------------------------
   * Score updates
   * -------------------------------------------------------------------------
   */
  // Repositions the score display after a score or screen size change.
  private layoutScoreTexts(width: number, height: number) {
    this.logic.scoreBoard.layout(width, height);
  }

  // Plays the visual score animation for the player who scored.
  private highlightScore(side: Side) {
    this.logic.scoreBoard.highlight(side);
  }

  // Plays feedback and updates the score display after a target is hit.
  private showScoreChange = (side: Side, score: number) => {
    this.audio.playHit();
    this.logic.scoreBoard.updateScore(side, score);
    this.layoutScoreTexts(this.scale.width, this.scale.height);
    this.highlightScore(side);
  };

  /*
   * -------------------------------------------------------------------------
   * Round completion
   * -------------------------------------------------------------------------
   */
  // Displays the winner panel and connects its menu actions after Overlord records a match win.
  private showWinPanel = () => {
    const callbacks: _regGameCallbacks = this.callbacks ?? {
      onGameWon: () => ({ left: 0, right: 0 }),
      onNextGame: () => undefined,
      onRematch: () => undefined,
      onFinish: () => undefined,
      onResetMatchWins: () => undefined,
    };

    this.winPanel = new _sWinPanel(this, this.playerNames, this.state.matchWins, callbacks);
    this.winPanel.layout();
  };

  /*
   * -------------------------------------------------------------------------
   * Responsive layout
   * -------------------------------------------------------------------------
   */
  // Scales and positions actors to fit the current screen width.
  private layoutPlayfield(width: number, centerY: number) {
    this.state.updatePlayfieldScale(width);
    const centerX = width / 2;
    const cannonMargin = _aCannon.margin * this.state.playfieldScale;

    this.logic.planet.layout(centerX, centerY, this.state.playfieldScale);
    this.logic.targetOrbit.layout(centerX, centerY, this.state.playfieldScale);

    this.logic.players.forEach((player) => {
      const x = player.side === "left" ? cannonMargin : width - cannonMargin;
      player.layout(x, centerY, this.state.playfieldScale);
    });
  }

  // Reapplies layout when Phaser reports a screen size change.
  private handleResize(gameSize: Phaser.Structs.Size) {
    const centerY = gameSize.height / 2;

    this.layoutPlayfield(gameSize.width, centerY);
    this.winPanel?.layout();
    this.layoutScoreTexts(gameSize.width, gameSize.height);
  }
}
