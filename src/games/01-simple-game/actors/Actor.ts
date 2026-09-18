import type Phaser from "phaser";

// Shared base every actor extends: tracks its own children so destroy() cleans them all up.
export abstract class Actor {
  private readonly children: { destroy(): void }[] = [];
  onDestroyed?: () => void;

  // Every actor is created with the scene it belongs to.
  constructor(protected readonly scene: Phaser.Scene) {}

  // Registers a child object so it is destroyed automatically with this actor.
  protected track<T extends { destroy(): void }>(child: T): T {
    this.children.push(child);
    return child;
  }

  // Destroys every tracked child and notifies whoever is listening.
  destroy() {
    this.children.forEach((child) => child.destroy());
    this.onDestroyed?.();
  }
}
