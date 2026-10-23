import Phaser from "phaser";
import { SimpleGameScene } from "./scene";
import type { PlayerNames as _regPlayerNames, GameCallbacks as _regGameCallbacks, Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../registry";

export const createGame = (
  playerNames?: _regPlayerNames,
  callbacks?: _regGameCallbacks,
  difficulty?: _regDifficulty,
  winScore?: _regWinScore,
  matchWins?: _regMatchWins,
) => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    transparent: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [SimpleGameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  // scene.start is queued by Phaser even if called before boot finishes
  if (playerNames || callbacks || difficulty || winScore || matchWins) {
    game.scene.start("SimpleGameScene", { playerNames, callbacks, difficulty, winScore, matchWins });
  }

  return game;
};
