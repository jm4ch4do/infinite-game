import Phaser from "phaser";
import { Actor } from "./Actor";
import { Target } from "./Target";
import type { GameState } from "../status/GameState";

export class TargetOrbit extends Actor {
  readonly container: Phaser.GameObjects.Container;
  readonly targets: Target[];

  // Creates the orbit container and fills it with targets.
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);
    this.targets = [];
    const children: Phaser.GameObjects.GameObject[] = [];

    for (let i = 0; i < Target.count; i++) {
      const angle = (i / Target.count) * Math.PI * 2;
      const targetX = Math.cos(angle) * Target.orbitRadius;
      const targetY = Math.sin(angle) * Target.orbitRadius;
      const target = new Target(scene, targetX, targetY, Target.pickValue());

      this.targets.push(target);
      target.onRemove(() => this.removeTarget(target));
      children.push(target.body, target.label);
    }

    this.container = this.track(scene.add.container(x, y, children));
  }

  // Rotates the orbit and keeps each score label upright.
  update(delta: number, state: GameState) {
    this.container.rotation += (delta / 1000) * state.rotationSpeed;
    this.targets.forEach((target) => (target.label.rotation = -this.container.rotation));
  }

  // Centers and scales the complete group of orbiting targets.
  handleResize(width: number, height: number, state: GameState) {
    this.container.setScale(state.playfieldScale).setPosition(width / 2, height / 2);
  }

  // Drops a removed target and reports when none are left.
  private removeTarget(target: Target) {
    const index = this.targets.indexOf(target);
    if (index !== -1) {
      this.targets.splice(index, 1);
    }

    if (this.targets.length === 0) {
      this.emit({ type: "targetsEmpty", source: this });
    }
  }
}

