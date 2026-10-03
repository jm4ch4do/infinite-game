import Phaser from "phaser";
import { Cannon } from "../actors/Cannon";
import { type Side } from "../config";
import type { GameState } from "../status/GameState";

// A human player: reads input and commands the actor assigned to it. Not an actor; only players and the Overlord command actors.
export class Player {
  private readonly fireKey: Phaser.Input.Keyboard.Key;

  // Binds a fire key to the actor this player controls.
  constructor(
    scene: Phaser.Scene,
    readonly side: Side,
    private readonly actor: Cannon,
    fireKeyCode: number,
  ) {
    this.fireKey = scene.input.keyboard!.addKey(fireKeyCode);
  }

  // Reads this frame's input and asks its actor to fire when appropriate.
  update(state: GameState) {
    if (!state.isGameOver && this.fireKey.isDown) {
      this.actor.fire();
    }
  }
}