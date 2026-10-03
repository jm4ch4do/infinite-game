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
  private readonly pendingSpawns: _aActor[] = [];
  private readonly pendingRemovals = new Set<_aActor>();
  private emptyOrbit: _aActor | null = null;

  /*
   * -------------------------------------------------------------------------
   * 1. Common functions
   * -------------------------------------------------------------------------
   */
  // Queues an actor to be tracked from the next spawn phase; removal and events work from now on.
  private register(actor: _aActor) {
    actor.onEvent = (event) => this.handleEvent(event);
    this.pendingSpawns.push(actor);
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
      case "remove":
        this.pendingRemovals.add(event.actor);
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

  /*
   * -------------------------------------------------------------------------
   * 2. Overlord central logic
   * -------------------------------------------------------------------------
   */
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
    this.flushSpawns();
  }

  // Rescales the playfield and lets every actor reposition itself.
  resize(width: number, height: number) {
    this.state.updatePlayfieldScale(width);
    this.actors.forEach((actor) => actor.handleResize(width, height, this.state));
  }

  // Runs one frame in four phases: collisions, spawns, updates, removals.
  update(delta: number) {
    this.resolveCollisions();
    this.flushSpawns();
    this.updateActors(delta);
    this.flushRemovals();
  }

  /*
   * -------------------------------------------------------------------------
   * 3. Phase 1: collision resolution
   * -------------------------------------------------------------------------
   */
  // Receives Phaser's overlap report; resolution waits until the physics step is over so actors aren't destroyed mid-step.
  private queueCollision = (first: unknown, second: unknown) => {
    const a = this.actorsByCollider.get(first as Phaser.GameObjects.GameObject);
    const b = this.actorsByCollider.get(second as Phaser.GameObjects.GameObject);
    if (a && b) {
      this.pendingCollisions.push([a, b]);
    }
  };

  // Tells both actors about each reported collision; scoring comes back as a score event and removals wait for the removal phase.
  private resolveCollisions() {
    this.pendingCollisions.splice(0).forEach(([a, b]) => {
      a.handleCollision(b);
      b.handleCollision(a);
    });

    // Decided after all collisions so a win is recorded before the targets are refilled.
    if (this.emptyOrbit) {
      this.emptyOrbit.remove();
      if (!this.state.isGameOver) {
        this.state.increaseRotationSpeed();
        this.mainSpawner.spawnTargetOrbit(this.scene.scale.width / 2, this.scene.scale.height / 2);
      }
      this.emptyOrbit = null;
    }
  }

  /*
   * -------------------------------------------------------------------------
   * 4. Phase 2: spawn
   * -------------------------------------------------------------------------
   */
  // Starts tracking every actor queued so far; also used once by start() for the initial actors.
  private flushSpawns() {
    this.pendingSpawns.splice(0).forEach((actor) => {
      this.actors.push(actor);
      actor.handleResize(this.scene.scale.width, this.scene.scale.height, this.state);

      if (actor.collisionLayer && actor.collider) {
        this.layer(actor.collisionLayer).add(actor.collider);
        this.actorsByCollider.set(actor.collider, actor);
      }
    });
  }

  /*
   * -------------------------------------------------------------------------
   * 5. Phase 3: update
   * -------------------------------------------------------------------------
   */
  // Lets the players act, then updates every actor that isn't waiting for removal.
  private updateActors(delta: number) {
    this.players.forEach((player) => player.update(this.state));
    this.actors.forEach((actor) => {
      if (!actor.isRemoved) {
        actor.update(delta, this.state);
      }
    });
  }

  /*
   * -------------------------------------------------------------------------
   * 6. Phase 4: removal
   * -------------------------------------------------------------------------
   */
  // Destroys every actor that asked for removal this frame and stops tracking it.
  private flushRemovals() {
    this.pendingRemovals.forEach((actor) => {
      const index = this.actors.indexOf(actor);
      if (index !== -1) {
        this.actors.splice(index, 1);
      }
      if (actor.collider) {
        this.actorsByCollider.delete(actor.collider);
      }
      actor.destroy();
    });
    this.pendingRemovals.clear();
  }
}