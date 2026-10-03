import type { Difficulty, MatchWins, WinScore } from "../../registry";
import { type Side } from "../config";

export class GameState {
  static readonly defaultWinScore: WinScore = 10;
  static readonly playfieldBaseWidth = 1280;
  static readonly rotationSpeedByDifficulty: Record<Difficulty, number> = {
    easy: 0.5,
    medium: 0.9,
    hard: 1.4,
  };
  matchWins: MatchWins;
  scores: Record<Side, number> = { left: 0, right: 0 };
  winScore: WinScore;
  rotationSpeed: number;
  isGameOver = false;
  playfieldScale = 1;

  // Creates the initial state from the selected game settings.
  constructor(difficulty: Difficulty = "medium", winScore: WinScore = GameState.defaultWinScore, matchWins: MatchWins = { left: 0, right: 0 }) {
    this.rotationSpeed = GameState.rotationSpeedByDifficulty[difficulty];
    this.winScore = winScore;
    this.matchWins = matchWins;
  }

  // Adds points for a side without exceeding the score needed to win.
  addScore(side: Side, value: number) {
    this.scores[side] = Math.min(this.scores[side] + value, this.winScore);
    return this.scores[side];
  }

  // Reports whether a side has just reached the winning score in a round still in play.
  hasWon(side: Side) {
    return !this.isGameOver && this.scores[side] >= this.winScore;
  }

  // Marks the round complete and stores the updated match wins.
  recordWin(side: keyof MatchWins, matchWins?: MatchWins) {
    this.isGameOver = true;
    this.matchWins = matchWins ?? { ...this.matchWins, [side]: this.matchWins[side] + 1 };
  }

  // Makes target rotation faster for the next target orbit.
  increaseRotationSpeed() {
    this.rotationSpeed *= 1.15;
  }

  // Calculates the scale required to fit the playfield on screen.
  updatePlayfieldScale(width: number) {
    this.playfieldScale = Math.min(1, width / GameState.playfieldBaseWidth);
  }
}

