import Phaser from "phaser";
import { Bullet as _aBullet } from "../actors/Bullet";
import { Cannon as _aCannon } from "../actors/Cannon";
import { Planet as _aPlanet } from "../actors/Planet";
import { Player as _aPlayer } from "../actors/player/Player";
import { ScoreBoard as _aScoreBoard } from "../actors/ScoreBoard";
import { Target as _aTarget } from "../actors/Target";
import { TargetOrbit as _aTargetOrbit } from "../actors/TargetOrbit";
import { type Side } from "../config";
import { GameState as _sGameState } from "./GameState";

export class Spawner {
  readonly scene: Phaser.Scene;
  readonly state: _sGameState;
  planet!: _aPlanet;
  players: _aPlayer[] = [];
  bullets: _aBullet[] = [];
  targetOrbit!: _aTargetOrbit;
  scoreBoard!: _aScoreBoard;

  // Creates the spawner for a scene and its shared game state.
  constructor(scene: Phaser.Scene, state: _sGameState) {
    this.scene = scene;
    this.state = state;
  }

  // Creates the planet, players, first target orbit, and score display for a new game.
  spawnInitial(centerX: number, centerY: number, width: number, playerNames: Record<Side, string>) {
    this.planet = new _aPlanet(this.scene, centerX, centerY);
    this.players = _aPlayer.createPair(this.scene, width, centerY, playerNames);
    this.players.forEach((player) => this.trackPlayer(player));
    this.targetOrbit = new _aTargetOrbit(this.scene, centerX, centerY);
    this.trackTargets();
    this.scoreBoard = new _aScoreBoard(this.scene, playerNames, this.state.winScore);
    this.scoreBoard.layout(width, this.scene.scale.height);
  }

  /*
   * -------------------------------------------------------------------------
   * Players
   * -------------------------------------------------------------------------
   */
  // Wires a player's cannon so its own fire decision spawns a bullet.
  private trackPlayer(player: _aPlayer) {
    player.cannon.onFire = () => this.spawnBullet(player.cannon);
  }

  // Finds the player on the given side.
  getPlayer(side: Side) {
    return this.players.find((player) => player.side === side)!;
  }

  // Creates a bullet from the firing cannon and tracks it for later removal.
  private spawnBullet(cannon: _aCannon) {
    const direction = cannon.side === "left" ? 1 : -1;
    const bullet = new _aBullet(this.scene, cannon.readyIndicator.x, cannon.readyIndicator.y, cannon.side, direction * _aBullet.speed, 0);
    bullet.onDestroyed = () => this.handleBulletRemoved(bullet);
    this.bullets.push(bullet);
    this.scene.events.emit("shoot");
  }

  // Wires every current target to notify the spawner when it removes itself.
  private trackTargets() {
    this.targetOrbit.targets.forEach((target) => this.trackTarget(target));
  }

  // Wires a single target so its own removal reaches the spawner.
  private trackTarget(target: _aTarget) {
    target.onDestroyed = () => this.handleTargetRemoved(target);
  }

  // Drops a bullet from tracking once it has removed itself.
  private handleBulletRemoved(bullet: _aBullet) {
    const index = this.bullets.indexOf(bullet);
    if (index !== -1) {
      this.bullets.splice(index, 1);
    }
  }

  // Drops a target from tracking and respawns the group once it's empty.
  private handleTargetRemoved(target: _aTarget) {
    const index = this.targetOrbit.targets.indexOf(target);
    if (index !== -1) {
      this.targetOrbit.targets.splice(index, 1);
    }

    if (this.targetOrbit.targets.length === 0 && !this.state.isGameOver) {
      this.respawnTargets();
    }
  }

  // Replaces the target orbit with a faster, freshly generated one.
  private respawnTargets() {
    this.state.increaseRotationSpeed();
    this.targetOrbit.destroy();
    this.targetOrbit = new _aTargetOrbit(this.scene, this.planet.body.x, this.planet.body.y);
    this.trackTargets();
  }
}
