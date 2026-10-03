import Phaser from "phaser";
import { Actor as _aActor } from "../actors/Actor";
import { Planet as _aPlanet } from "../actors/Planet";
import { type Side } from "../config";
import { GameState as _sGameState } from "./GameState";

export class MainSpawner {
  readonly scene: Phaser.Scene;
  readonly state: _sGameState;
  // Set by the Overlord so every spawned actor gets registered with it.
  onSpawned?: (actor: _aActor) => void;
  // Set by the Overlord so it can ask each player for its input every frame.
  // TODO: Uncomment when adding players
  // onPlayerCreated?: (player: _pPlayer) => void;

  // Creates the main spawner for a scene and its shared game state.
  constructor(scene: Phaser.Scene, state: _sGameState) {
    this.scene = scene;
    this.state = state;
  }

  // Creates the planet, players, first target orbit, and score display for a new game.
  // For now, only spawn the planet as a starting point for game 2.
  spawnInitial(centerX: number, centerY: number, width: number, playerNames: Record<Side, string>) {
    this.spawn(new _aPlanet(this.scene, centerX, centerY));
    // TODO: Add players, targets, and score display
    // this.spawnPlayer("left", _aCannon.margin, centerY, Phaser.Input.Keyboard.KeyCodes.Q);
    // this.spawnPlayer("right", width - _aCannon.margin, centerY, Phaser.Input.Keyboard.KeyCodes.SPACE);
    // this.spawnTargetOrbit(centerX, centerY);
    // this.spawn(new _aScoreBoard(this.scene, playerNames, this.state.winScore));
  }

  // Creates a cannon and the player who controls it; the Overlord receives both.
  // TODO: Uncomment when adding players
  // private spawnPlayer(side: Side, x: number, y: number, fireKeyCode: number) {
  //   const cannon = this.spawn(new _aCannon(this.scene, x, y, side));
  //   this.onPlayerCreated?.(new _pPlayer(this.scene, side, cannon, fireKeyCode));
  // }

  // Announces a freshly created actor to the Overlord and returns it.
  private spawn<T extends _aActor>(actor: T) {
    this.onSpawned?.(actor);
    return actor;
  }

  /*
   * -------------------------------------------------------------------------
   * Targets
   * -------------------------------------------------------------------------
   */
  // Creates a target orbit and announces it and every target in it.
  // TODO: Uncomment when adding targets
  // spawnTargetOrbit(x: number, y: number) {
  //   const orbit = this.spawn(new _aTargetOrbit(this.scene, x, y));
  //   orbit.targets.forEach((target) => this.spawn(target));
  // }
}