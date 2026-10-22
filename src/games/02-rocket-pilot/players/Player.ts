import Phaser from "phaser";
import { Ship } from "../actors/ship/Ship";
import { type Side } from "../config";
import type { GameState } from "../status/GameState";

const { KeyCodes } = Phaser.Input.Keyboard;

// Keys that steer each side's ship, so both players can act at the same time.
const controls: Record<Side, { left: number; right: number; thrust: number }> = {
  left: { left: KeyCodes.A, right: KeyCodes.D, thrust: KeyCodes.W },
  right: { left: KeyCodes.LEFT, right: KeyCodes.RIGHT, thrust: KeyCodes.UP },
};

// A human player: reads input and commands the actor assigned to it. Not an actor; only players and the Overlord command actors.
export class Player {
  private readonly keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    thrust: Phaser.Input.Keyboard.Key;
  };

  // Binds the turn and thrust keys for this side to the ship this player controls.
  constructor(
    scene: Phaser.Scene,
    readonly side: Side,
    private readonly ship: Ship,
  ) {
    const keyboard = scene.input.keyboard!;
    const codes = controls[side];
    this.keys = {
      left: keyboard.addKey(codes.left),
      right: keyboard.addKey(codes.right),
      thrust: keyboard.addKey(codes.thrust),
    };
  }

  // Reads this frame's input and steers the ship.
  update(state: GameState) {
    const active = !state.isGameOver;
    const direction = Number(active && this.keys.right.isDown) - Number(active && this.keys.left.isDown);
    this.ship.turn(direction as -1 | 0 | 1);
    this.ship.setThrusting(active && this.keys.thrust.isDown);
  }
}
