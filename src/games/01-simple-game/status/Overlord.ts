import Phaser from "phaser";
import { type Side } from "../config";
import { GameState as _sGameState } from "./GameState";
import { Spawner as _sSpawner } from "./Spawner";
import type { MatchWins } from "../../registry";

type OverlordCallbacks = {
  onScoreChanged: (side: Side, score: number) => void;
  onMatchWon: (side: Side) => MatchWins;
  onRoundWon: () => void;
};

export class Overlord {
  readonly scene: Phaser.Scene;
  readonly state: _sGameState;
  readonly spawner: _sSpawner;
  readonly callbacks: OverlordCallbacks;

  // Connects the spawner, game state, and scene response callbacks.
  constructor(scene: Phaser.Scene, state: _sGameState, spawner: _sSpawner, callbacks: OverlordCallbacks) {
    this.scene = scene;
    this.state = state;
    this.spawner = spawner;
    this.callbacks = callbacks;
  }

  // Gives the scene access to the spawner's current actors for layout.
  get planet() {
    return this.spawner.planet;
  }

  get players() {
    return this.spawner.players;
  }

  get targetOrbit() {
    return this.spawner.targetOrbit;
  }

  get scoreBoard() {
    return this.spawner.scoreBoard;
  }

  // Advances target rotation, cannon input, and bullet movement for one frame.
  update(delta: number) {
    const targetOrbit = this.spawner.targetOrbit;
    targetOrbit.container.rotation += (delta / 1000) * this.state.rotationSpeed;
    targetOrbit.targets.forEach((target) => (target.label.rotation = -targetOrbit.container.rotation));

    this.spawner.players.forEach((player) => player.update(this.state.isGameOver));

    this.updateBullets(delta);
  }

  // Moves bullets and resolves their collisions or expiration.
  updateBullets(delta: number) {
    const { targetOrbit, planet, bullets } = this.spawner;
    const matrix = targetOrbit.container.getWorldTransformMatrix();
    const targetPoint = new Phaser.Math.Vector2();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.update(delta);

      const hitPlanet = bullet.collidesWithPlanet(planet.body, this.state.playfieldScale);
      let hitTargetIndex = -1;

      for (let j = 0; j < targetOrbit.targets.length; j++) {
        const target = targetOrbit.targets[j];
        matrix.transformPoint(target.body.x, target.body.y, targetPoint);
        if (bullet.collidesWithTarget(targetPoint, this.state.playfieldScale)) {
          hitTargetIndex = j;
          break;
        }
      }

      if (hitTargetIndex !== -1) {
        this.handleTargetHit(hitTargetIndex, bullet.side);
      }

      const expired = hitPlanet || hitTargetIndex !== -1 || bullet.isExpired(this.scene.scale.width, this.scene.scale.height) || this.state.isGameOver;
      if (expired) {
        bullet.destroy();
      }
    }
  }

  // Removes a hit target and applies the resulting score and round rules.
  handleTargetHit(index: number, side: Side) {
    const target = this.spawner.targetOrbit.targets[index];
    const value = target.value;
    const player = this.spawner.getPlayer(side);
    const score = player.addScore(value, this.state.winScore);
    const won = !this.state.isGameOver && player.hasWon(this.state.winScore);

    if (won) {
      this.state.recordWin(side, this.callbacks.onMatchWon(side));
    }

    // Remove after recording the win so the spawner sees the correct game-over state.
    target.destroy();

    this.callbacks.onScoreChanged(side, score);
    if (won) {
      this.callbacks.onRoundWon();
    }
  }
}
