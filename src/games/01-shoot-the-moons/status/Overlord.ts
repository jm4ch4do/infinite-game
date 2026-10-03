import Phaser from "phaser";
import { Actor as _aActor, type ActorEvent } from "../actors/Actor";
import { type Side } from "../config";
import { Player as _pPlayer } from "../players/Player";
import { GameState as _sGameState } from "./GameState";
import { MainSpawner as _sMainSpawner } from "./MainSpawner";
import type { MatchWins } from "../../registry";

type OverlordCallbacks = {
  onMatchWon: (side: Side) => MatchWins;
  onRoundWon: () => void;
};

export class Overlord {
  // Pairs of collision layers Phaser should report overlaps for.
  private static readonly collisionPairs: [string, string][] = [
    ["bullet", "target"],
    ["bullet", "planet"],
  ];

  readonly scene: Phaser.Scene;
  readonly state: _sGameState;
  readonly mainSpawner: _sMainSpawner;
  readonly callbacks: OverlordCallbacks;
  private readonly actors: _aActor[] = [];
  private readonly players: _pPlayer[] = [];
  private readonly actorsByCollider = new Map<Phaser.GameObjects.GameObject, _aActor>();
  private readonly layers = new Map<string, Phaser.GameObjects.Group>();
  private readonly pendingCollisions: [_aActor, _aActor][] = [];
  private emptyOrbit: _aActor | null = null;

  // Connects the main spawner, game state, scene callbacks, and Phaser collision detection.
  constructor(scene: Phaser.Scene, state: _sGameState, mainSpawner: _sMainSpawner, callbacks: OverlordCallbacks) {
    this.scene = scene;
    this.state = state;
    this.mainSpawner = mainSpawner;
    this.callbacks = callbacks;
    mainSpawner.onSpawned = (actor) => this.register(actor);
    mainSpawner.onPlayerCreated = (player) => this.players.push(player);

    Overlord.collisionPairs.forEach(([first, second]) => {
      scene.physics.add.overlap(this.layer(first), this.layer(second), this.queueCollision);
    });
  }

  // Spawns the starting actors.
  start(centerX: number, centerY: number, width: number, playerNames: Record<Side, string>) {
    this.mainSpawner.spawnInitial(centerX, centerY, width, playerNames);
  }

  // Rescales the playfield and lets every actor reposition itself.
  resize(width: number, height: number) {
    this.state.updatePlayfieldScale(width);
    this.actors.forEach((actor) => actor.handleResize(width, height, this.state));
  }
  // Resolves this frame's collisions, lets the players act, then updates every actor in turn.
  update(delta: number) {
    this.resolveCollisions();
    this.players.forEach((player) => player.update(this.state));

    [...this.actors].forEach((actor) => {
      if (!actor.isDestroyed) {
        actor.update(delta, this.state);
      }
    });
  }

  // Starts tracking an actor: updates, collision layer membership, and removal on destroy.
  private register(actor: _aActor) {
    this.actors.push(actor);
    actor.onEvent = (event) => this.handleEvent(event);
    actor.handleResize(this.scene.scale.width, this.scene.scale.height, this.state);

    if (actor.collisionLayer && actor.collider) {
      this.layer(actor.collisionLayer).add(actor.collider);
      this.actorsByCollider.set(actor.collider, actor);
    }

    actor.onDestroy(() => {
      this.actors.splice(this.actors.indexOf(actor), 1);
      if (actor.collider) {
        this.actorsByCollider.delete(actor.collider);
      }
    });
  }

  // Reacts to something an actor announced.
  private handleEvent(event: ActorEvent) {
    switch (event.type) {
      case "spawned":
        if (this.state.isGameOver) {
          event.actor.destroy();
        } else {
          this.register(event.actor);
        }
        break;
      case "score":
        this.scorePoints(event.side, event.points);
        break;
      case "targetsEmpty":
        this.emptyOrbit = event.source;
        break;
    }
  }

  // Returns the physics group for a collision layer, creating it on first use.
  private layer(name: string) {
    let group = this.layers.get(name);
    if (!group) {
      group = this.scene.add.group();
      this.layers.set(name, group);
    }
    return group;
  }

  // Receives Phaser's overlap report; resolution waits until the physics step is over so actors aren't destroyed mid-step.
  private queueCollision = (first: unknown, second: unknown) => {
    const a = this.actorsByCollider.get(first as Phaser.GameObjects.GameObject);
    const b = this.actorsByCollider.get(second as Phaser.GameObjects.GameObject);
    if (a && b) {
      this.pendingCollisions.push([a, b]);
    }
  };

  // Tells both actors about each reported collision; scoring comes back as a score event.
  private resolveCollisions() {
    this.pendingCollisions.splice(0).forEach(([a, b]) => {
      // An earlier collision this frame may already have consumed one of them.
      if (a.isDestroyed || b.isDestroyed) {
        return;
      }

      a.handleCollision(b);
      b.handleCollision(a);
    });

    // Decided after all collisions so a win is recorded before the targets are refilled.
    if (this.emptyOrbit) {
      this.emptyOrbit.destroy();
      if (!this.state.isGameOver) {
        this.state.increaseRotationSpeed();
        this.mainSpawner.spawnTargetOrbit(this.scene.scale.width / 2, this.scene.scale.height / 2);
      }
      this.emptyOrbit = null;
    }
  }

  // Adds points for a side, records the win if reached, and reports the win to the scene.
  private scorePoints(side: Side, points: number) {
    const score = this.state.addScore(side, points);
    const won = this.state.hasWon(side);

    if (won) {
      this.state.recordWin(side, this.callbacks.onMatchWon(side));
    }

    this.actors.forEach((actor) => actor.handleScoreChanged(side, score));
    if (won) {
      this.callbacks.onRoundWon();
    }
  }
}