import type Phaser from "phaser";
import { startGame as start01Game } from "./01-shoot-the-moons";
import { startGame as startRocketPilotGame } from "./02-rocket-pilot";

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
  { id: "02-rocket-pilot", title: "2 - Rocket Pilot", twoPlayer: true, start: startRocketPilotGame },
  // Not selectable yet — uncomment once game 3 is ready.
  // { id: "03-game-name", title: "Game 3", start: start03Game },
];
