import Phaser from "phaser";
import { Actor } from "./Actor";
import { Target } from "./Target";

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
      children.push(target.body, target.label);
    }

    this.container = this.track(scene.add.container(x, y, children));
  }

  // Positions and scales the complete group of orbiting targets.
  layout(x: number, y: number, scale: number) {
    this.container.setScale(scale).setPosition(x, y);
  }
}
