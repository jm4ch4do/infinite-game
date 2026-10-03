import type Phaser from "phaser";
import { startGame as start01Game } from "./01-shoot-the-moons";

export type PlayerNames = { left: string; right: string };

export type Difficulty = "easy" | "medium" | "hard";

export type WinScore = 10 | 20 | 30;

export type MatchWins = { left: number; right: number };

export type GameCallbacks = {
  onRematch: (adjustPreferences: boolean) => void;
  onNextGame: (adjustPreferences: boolean) => void;
  onFinish: () => void;
  onGameWon: (winner: "left" | "right") => MatchWins;
  onResetMatchWins: () => void;
};

export type GameEntry = {
  id: string;
  title: string;
  twoPlayer?: boolean;
  start: (
    playerNames?: PlayerNames,
    callbacks?: GameCallbacks,
    difficulty?: Difficulty,
    winScore?: WinScore,
    matchWins?: MatchWins,
  ) => Phaser.Game;
};

export const games: GameEntry[] = [
  { id: "01-shoot-the-moons", title: "1 - Shoot the Moons", twoPlayer: true, start: start01Game },
  // Not selectable yet — uncomment once game 2 is ready.
  // { id: "02-simple-game-copy", title: "Game 2", start: start02Game },
];
