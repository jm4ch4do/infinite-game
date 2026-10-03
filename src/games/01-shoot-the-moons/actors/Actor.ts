import type Phaser from "phaser";
import { audioOf } from "../audio";
import type { GameState } from "../status/GameState";
import { type Side } from "../config";

// Everything an actor can announce to the Overlord.
export type ActorEvent =
  | { type: "spawned"; actor: Actor }
  | { type: "remove"; actor: Actor }
  | { type: "score"; side: Side; points: number }
  | { type: "targetsEmpty"; source: Actor };

// Shared base every actor extends: tracks its own children so destroy() cleans them all up.
export abstract class Actor {
  private readonly children: { destroy(): void }[] = [];
  private readonly destroyListeners: (() => void)[] = [];
  private readonly removeListeners: (() => void)[] = [];
  isDestroyed = false;
  // True once the actor asked to be removed; it stays alive until the Overlord's removal phase destroys it.
  isRemoved = false;
  // Set by the Overlord when it registers the actor; actors only ever call it through emit().
  onEvent?: (event: ActorEvent) => void;
  // Score awarded to whoever hits this actor; 0 means it gives nothing.
  points = 0;

  // Physics layer and body that make this actor take part in Phaser collision detection.
  collisionLayer?: string;
  collider?: Phaser.GameObjects.GameObject;

  // Every actor is created with the scene it belongs to.
  constructor(protected readonly scene: Phaser.Scene) {}

  // The scene's sound player, so any actor can play its own sounds.
  protected get audio() {
    return audioOf(this.scene);
  }

  // Registers a child object so it is destroyed automatically with this actor.
  protected track<T extends { destroy(): void }>(child: T): T {
    this.children.push(child);
    return child;
  }

  // Announces something that happened to this actor.
  protected emit(event: ActorEvent) {
    this.onEvent?.(event);
  }

  // Subscribes to this actor's destruction.
  onDestroy(listener: () => void) {
    this.destroyListeners.push(listener);
  }

  // Subscribes to this actor asking for removal, which happens before it is actually destroyed.
  onRemove(listener: () => void) {
    this.removeListeners.push(listener);
  }

  // Asks the Overlord to destroy this actor at the end of the frame; the actor keeps existing until then.
  remove() {
    if (this.isRemoved) {
      return;
    }

    this.isRemoved = true;
    this.removeListeners.forEach((listener) => listener());
    this.emit({ type: "remove", actor: this });
  }

  // Advances this actor by one frame; actors that don't change over time keep this empty.
  update(_delta: number, _state: GameState) {}

  // Repositions and rescales this actor for the current screen; actors with a fixed look keep this empty.
  handleResize(_width: number, _height: number, _state: GameState) {}

  // Reacts to a collision the Overlord reported; by default an actor ignores it.
  handleCollision(_other: Actor) {}

  // Reacts to a score change the Overlord reported; by default an actor ignores it.
  handleScoreChanged(_side: Side, _score: number) {}

  // Destroys every tracked child and notifies whoever is listening; only the Overlord calls this, actors use remove().
  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.children.forEach((child) => child.destroy());
    this.destroyListeners.forEach((listener) => listener());
  }
}
