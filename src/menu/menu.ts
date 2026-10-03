import type Phaser from "phaser";
import { createMenuAudio } from "./audio";
import { games as _regGames } from "../games/registry";
import type { Difficulty as _regDifficulty, WinScore as _regWinScore, MatchWins as _regMatchWins } from "../games/registry";
import { renderMainMenu } from "./main/mainMenu";
import { renderGameSelectMenu } from "./game-select/gameSelectMenu";
import { renderSetupMenu } from "./setup/setupMenu";

import _tplMenuShell from "./menu-shell.template.html?raw";

/*
 * -------------------------------------------------------------------------
 * Function connection map (see menu_flow.md for graphic view)
 * -------------------------------------------------------------------------
 *
 * main.ts
 *   |
 *   +--> mountMenu(root)
 *          |
 *          +--> renderMainScene()
 *          |      +--> renderMainMenu()
 *          |      +--> PLAY -> renderGameSelectScene()
 *          |
 *          +--> renderGameSelectScene()
 *          |      +--> renderGameSelectMenu()
 *          |      +--> BACK -> renderMainScene()
 *          |      +--> game selection -> renderSetupScene()
 *          |
 *          +--> renderSetupScene()
 *          |      +--> renderSetupMenu()
 *          |      +--> BACK -> renderGameSelectScene()
 *          |      +--> START -> beginGame()
 *          |
 *          +--> beginGame()
 *                 +--> games[].start() -> Phaser game
 *                 +--> REMATCH -> renderSetupScene()
 *                 +--> CHANGE GAME -> returnToGameSelect()
 *
 * games (from games/registry.ts)
 *   +--> getGameEntry(gameId) -> games.find(...)
 *   +--> selected GameEntry.start() -> game-specific startGame()
 *                                      +--> createGame() -> Phaser scene
 *
 * Shared state such as pendingGameId and saved player settings is owned by
 * mountMenu() and passed into the relevant screen callbacks.
 * -------------------------------------------------------------------------
 */

/** Mounts the menu shell and coordinates the individual menu screens with the active game. */
export const mountMenu = (root: HTMLDivElement) => {
  /*
   * -------------------------------------------------------------------------
   * Shared shell and scene setup
   * -------------------------------------------------------------------------
   */
  root.innerHTML = _tplMenuShell;

  const sceneRoot = root.querySelector<HTMLDivElement>("#scene-root");
  const hud = root.querySelector<HTMLDivElement>("#hud");

  if (!sceneRoot) {
    throw new Error("Scene root element is missing");
  }

  if (!hud) {
    throw new Error("HUD element is missing");
  }

  /*
   * -------------------------------------------------------------------------
   * Menu state
   * -------------------------------------------------------------------------
   */
  const audio = createMenuAudio();
  let activeGame: Phaser.Game | null = null;
  let pendingGameId: string | null = null;
  let savedPlayerNames: { left: string; right: string } | null = null;
  let savedDifficulty: _regDifficulty = "easy";
  let savedWinScore: _regWinScore = 10;
  let matchWins: _regMatchWins = { left: 0, right: 0 };

  /*
   * -------------------------------------------------------------------------
   * Renderers for each menu scene
   * -------------------------------------------------------------------------
   */
  /** Renders the main menu scene and configures its navigation actions. */
  const renderMainScene = () => {
    renderMainMenu({
      root: sceneRoot,
      onPlay: renderGameSelectScene,
      onSettings: () => console.log("Settings clicked"),
      onCredits: () => console.log("Credits clicked"),
    });

    sceneRoot.querySelectorAll<HTMLButtonElement>("[data-menu-item]").forEach((item) => {
      item.addEventListener("mouseenter", audio.playHover);
      item.addEventListener("focus", audio.playHover);
      item.addEventListener("click", audio.playClick);
    });
  };

  /** Renders the game selection scene and routes the selected game. */
  const renderGameSelectScene = () => {
    renderGameSelectMenu({
      root: sceneRoot,
      onSelectGame: (gameId) => {
        matchWins = { left: 0, right: 0 };
        const entry = getGameEntry(gameId);
        if (entry.twoPlayer) {
          pendingGameId = gameId;
          renderSetupScene();
          return;
        }

        beginGame(gameId);
      },
      onBack: renderMainScene,
    });

    sceneRoot.querySelectorAll<HTMLButtonElement>("[data-menu-item]").forEach((item) => {
      item.addEventListener("mouseenter", audio.playHover);
      item.addEventListener("focus", audio.playHover);
      item.addEventListener("click", audio.playClick);
    });
  };

  /** Renders the setup scene with the last-used player and game settings. */
  const renderSetupScene = () => {
    renderSetupMenu({
      root: sceneRoot,
      onBack: renderGameSelectScene,
      initialValues: {
        names: savedPlayerNames ?? undefined,
        difficulty: savedDifficulty,
        winScore: savedWinScore,
      },
      onStart: ({ names, difficulty, winScore }) => {
        const gameId = pendingGameId;
        pendingGameId = null;

        savedPlayerNames = names;
        savedDifficulty = difficulty;
        savedWinScore = winScore;

        if (gameId) {
          beginGame(gameId, names, difficulty, winScore);
        }
      },
    });

    sceneRoot.querySelectorAll<HTMLButtonElement>("[data-menu-item]").forEach((item) => {
      item.addEventListener("mouseenter", audio.playHover);
      item.addEventListener("focus", audio.playHover);
      item.addEventListener("click", audio.playClick);
    });
  };

  /*
   * -------------------------------------------------------------------------
   * Game lifecycle
   * -------------------------------------------------------------------------
   */
  /** Finds a registered game or reports a broken game selection. */
  const getGameEntry = (gameId: string) => {
    const entry = _regGames.find((game) => game.id === gameId);
    if (!entry) {
      throw new Error(`Game not found: ${gameId}`);
    }

    return entry;
  };

  /** Destroys the active Phaser game when one is running. */
  const destroyActiveGame = () => {
    activeGame?.destroy(true);
    activeGame = null;
  };

  /** Destroys the active game and returns to the game selection scene. */
  const returnToGameSelect = () => {
    if (!activeGame) {
      return;
    }

    destroyActiveGame();
    hud.classList.add("hidden");
    matchWins = { left: 0, right: 0 };
    renderGameSelectScene();
  };

  /** Starts the selected game with the supplied players and configuration. */
  const beginGame = (
    gameId: string,
    playerNames?: { left: string; right: string },
    difficulty?: _regDifficulty,
    winScore?: _regWinScore,
  ) => {
    const entry = getGameEntry(gameId);

    sceneRoot.innerHTML = "";
    hud.classList.remove("hidden");
    
    const hudTitle = hud.querySelector<HTMLHeadingElement>("h2");
    if (hudTitle) {
      hudTitle.textContent = entry.title;
    }

    destroyActiveGame();

    activeGame = entry.start(
      playerNames,
      {
        onRematch: (adjustPreferences) => {
          destroyActiveGame();

          pendingGameId = gameId;

          if (adjustPreferences) {
            renderSetupScene();
            return;
          }

          beginGame(gameId, playerNames, difficulty, winScore);
        },
        onNextGame: (adjustPreferences) => {
          destroyActiveGame();

          const otherGames = _regGames.filter((game) => game.id !== gameId);
          const pool = otherGames.length > 0 ? otherGames : _regGames;
          const nextEntry = pool[Math.floor(Math.random() * pool.length)];

          if (nextEntry.twoPlayer) {
            pendingGameId = nextEntry.id;

            if (adjustPreferences) {
              renderSetupScene();
              return;
            }

            beginGame(nextEntry.id, playerNames, difficulty, winScore);
            return;
          }

          beginGame(nextEntry.id);
        },
        onFinish: () => returnToGameSelect(),
        onGameWon: (winner) => {
          matchWins = { ...matchWins, [winner]: matchWins[winner] + 1 };
          return matchWins;
        },
        onResetMatchWins: () => {
          matchWins = { left: 0, right: 0 };
        },
      },
      difficulty,
      winScore,
      matchWins,
    );
  };

  /*
   * -------------------------------------------------------------------------
   * Audio and global input
   * -------------------------------------------------------------------------
   */
  document.addEventListener("pointerdown", audio.startMenuMusic, { once: true });
  document.addEventListener("keydown", audio.startMenuMusic, { once: true });

  renderMainScene();

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      returnToGameSelect();
    }
  });

  window.addEventListener("beforeunload", () => {
    returnToGameSelect();
  });
};

