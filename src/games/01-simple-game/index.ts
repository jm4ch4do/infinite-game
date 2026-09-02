import { createGame } from "./game";
import type { PlayerNames as _regPlayerNames, GameCallbacks as _regGameCallbacks, Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../registry";

export const startGame = (
  playerNames?: _regPlayerNames,
  callbacks?: _regGameCallbacks,
  difficulty?: _regDifficulty,
  winScore?: _regWinScore,
  matchWins?: _regMatchWins,
) => createGame(playerNames, callbacks, difficulty, winScore, matchWins);
