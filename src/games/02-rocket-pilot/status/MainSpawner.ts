import Phaser from "phaser";
import { Actor as _aActor } from "../actors/Actor";
import { Planet as _aPlanet } from "../actors/Planet";
import { MiniAsteroid as _aMiniAsteroid, miniAsteroidPositions } from "../actors/mini-asteroid/MiniAsteroid";
import { Ship as _aShip } from "../actors/ship/Ship";
import { PowerUp as _aPowerUp } from "../actors/power-up/PowerUp";
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

  // Creates the planet, the mini asteroids and both players' ships for a new game.
  spawnInitial(centerX: number, centerY: number, width: number, _playerNames: Record<Side, string>) {
    this.spawn(new _aPlanet(this.scene, centerX, centerY));
    miniAsteroidPositions.forEach(({ xFraction, yFraction }) => this.spawn(new _aMiniAsteroid(this.scene, xFraction, yFraction)));
    // One power-up per player color, on the open left side clear of the ships' start and the planet.
    this.spawn(new _aPowerUp(this.scene, "left", 0.808, 0.436));
    this.spawn(new _aPowerUp(this.scene, "right", 0.808, 0.564));
    // Both ships start on the left: blue above and red below the planet's centre line, with a clear gap between them.
    this.spawnPlayer("left", width * 0.1, centerY * 0.6);
    this.spawnPlayer("right", width * 0.1, centerY * 1.4);
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
