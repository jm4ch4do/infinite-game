import Phaser from "phaser";
import { createGameAudio, provideAudio, type GameAudio } from "./audio";
import type { PlayerNames as _regPlayerNames, GameCallbacks as _regGameCallbacks, Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../registry";
import { GameState as _sGameState } from "./status/GameState";
import { Overlord as _sOverlord } from "./status/Overlord";
import { MainSpawner as _sMainSpawner } from "./status/MainSpawner";
import { WinPanel as _sWinPanel } from "./status/WinPanel";

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
    provideAudio(this, this.audio);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.dispose());

    // add actors and status panels
    const mainSpawner = new _sMainSpawner(this, this.state);
    this.logic = new _sOverlord(this, this.state, mainSpawner, {
      onMatchWon: this.callbacks?.onGameWon ?? (() => ({ ...this.state.matchWins })),
      onRoundWon: this.showWinPanel,
    });
    this.logic.start(centerX, centerY, this.scale.width, this.playerNames);
    this.logic.resize(this.scale.width, this.scale.height);

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
  // Reapplies layout when Phaser reports a screen size change.
  private handleResize(gameSize: Phaser.Structs.Size) {
    this.logic.resize(gameSize.width, gameSize.height);
    this.winPanel?.layout();
  }
}