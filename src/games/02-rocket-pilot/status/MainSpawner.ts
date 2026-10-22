import Phaser from "phaser";
import { Actor as _aActor } from "../actors/Actor";
import { Planet as _aPlanet } from "../actors/Planet";
import { Ship as _aShip } from "../actors/ship/Ship";
import { Player as _pPlayer } from "../players/Player";
import { TargetOrbit as _aTargetOrbit } from "../actors/TargetOrbit";
import { type Side } from "../config";
import { GameState as _sGameState } from "./GameState";

export class MainSpawner {
  readonly scene: Phaser.Scene;
  readonly state: _sGameState;
  // Set by the Overlord so every spawned actor gets registered with it.
  onSpawned?: (actor: _aActor) => void;
  // Set by the Overlord so it can ask each player for its input every frame.
  onPlayerCreated?: (player: _pPlayer) => void;

  // Creates the main spawner for a scene and its shared game state.
  constructor(scene: Phaser.Scene, state: _sGameState) {
    this.scene = scene;
    this.state = state;
  }

  // Creates the planet and both players' ships for a new game.
  spawnInitial(centerX: number, centerY: number, width: number, _playerNames: Record<Side, string>) {
    this.spawn(new _aPlanet(this.scene, centerX, centerY));
    this.spawnPlayer("left", width * 0.2, centerY);
    this.spawnPlayer("right", width * 0.8, centerY);
  }

  // Creates a ship and the player who controls it; the Overlord receives both.
  private spawnPlayer(side: Side, x: number, y: number) {
    const ship = this.spawn(new _aShip(this.scene, x, y, side));
    this.onPlayerCreated?.(new _pPlayer(this.scene, side, ship));
  }

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
  spawnTargetOrbit(x: number, y: number) {
    const orbit = this.spawn(new _aTargetOrbit(this.scene, x, y));
    orbit.targets.forEach((target) => this.spawn(target));
  }
}
